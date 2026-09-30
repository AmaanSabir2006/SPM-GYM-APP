from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id, get_current_token_payload, TokenPayload
from app.core.security import create_access_token
from app.models.attendance import AttendanceRecord
from app.models.fee import FeeRecord
from app.models.gym import Gym
from app.models.member import Member
from app.schemas.attendance import (
    AttendanceResponse,
    AttendanceStats,
    MemberAttendanceHistory,
    MemberPassInfoResponse,
    QRCheckInRequest,
)

router = APIRouter()


@router.post("/check-in", response_model=AttendanceResponse)
async def qr_check_in(
    check_in: QRCheckInRequest,
    token_payload: TokenPayload = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Member scans the gym's entrance QR code.
    Backend verifies:
      1. Gym token belongs to member's gym.
      2. Member exists and is active.
      3. Rejects duplicate check-ins within a 5-minute window.
    """
    gym_id = token_payload.gym_id

    # 1. Verify Gym QR token
    gym_res = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_res.scalar_one_or_none()
    if not gym or gym.qr_secret_token != check_in.gym_qr_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Gym QR Code or you are scanning a code for a different gym.",
        )

    # 2. Find Member linked to this member pass token or user or passed member_id
    if token_payload.role == "member":
        # Regular members can ONLY check in themselves (prevents BOLA / IDOR)
        member_id = token_payload.sub
    else:
        # Staff/admin front desk can check in a specified member or themselves
        member_id = check_in.member_id or token_payload.sub
        if not check_in.member_id:
            member_res = await db.execute(
                select(Member).where(Member.user_id == token_payload.sub, Member.gym_id == gym_id)
            )
            member_user = member_res.scalar_one_or_none()
            if not member_user:
                raise HTTPException(status_code=404, detail="No active gym membership found for this account.")
            member_id = member_user.id

    member_res = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member does not belong to this gym.")

    if member.status != "active":
        raise HTTPException(status_code=403, detail="Membership is inactive or suspended.")

    # 3. Check for duplicate check-ins within last 5 minutes
    five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    dup_res = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.gym_id == gym_id,
            AttendanceRecord.member_id == member_id,
            AttendanceRecord.check_in_time >= five_mins_ago,
        )
        .limit(1)
    )
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have already checked in recently. Please wait a few minutes before scanning again.",
        )

    # Log attendance
    attendance = AttendanceRecord(
        gym_id=gym_id,
        member_id=member_id,
        check_in_method="qr_scan",
    )
    db.add(attendance)
    await db.commit()
    await db.refresh(attendance)

    return AttendanceResponse(
        id=attendance.id,
        gym_id=attendance.gym_id,
        member_id=attendance.member_id,
        check_in_time=attendance.check_in_time,
        check_in_method=attendance.check_in_method,
        message=f"Welcome to {gym.name}, {member.full_name}!",
    )


@router.get("/today", response_model=List[AttendanceResponse])
async def get_today_attendance(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List of all members checked in today for floor staff and owner visibility.
    """
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.gym_id == gym_id, AttendanceRecord.check_in_time >= start_of_day)
        .order_by(AttendanceRecord.check_in_time.desc())
    )
    return result.scalars().all()


@router.get("/stats", response_model=AttendanceStats)
async def get_attendance_stats(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns weekly attendance count and unique members for analytics.
    """
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_day - timedelta(days=7)

    today_count_res = await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.gym_id == gym_id, AttendanceRecord.check_in_time >= start_of_day
        )
    )
    today_count = today_count_res.scalar() or 0

    week_res = await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.gym_id == gym_id, AttendanceRecord.check_in_time >= start_of_week
        )
    )
    week_count = week_res.scalar() or 0

    unique_res = await db.execute(
        select(func.count(func.distinct(AttendanceRecord.member_id))).where(
            AttendanceRecord.gym_id == gym_id, AttendanceRecord.check_in_time >= start_of_week
        )
    )
    unique_count = unique_res.scalar() or 0

    return AttendanceStats(
        total_today=today_count,
        weekly_count=week_count,
        unique_members_this_week=unique_count,
    )


@router.get("/members/{member_id}/history", response_model=MemberAttendanceHistory)
async def get_member_attendance_history(
    member_id: str,
    limit: int = Query(50, ge=1, le=200),
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve chronological attendance check-in history for a specific member.
    Enforces tenant isolation by gym_id.
    """
    member_res = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym.")

    history_res = await db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.member_id == member_id, AttendanceRecord.gym_id == gym_id)
        .order_by(AttendanceRecord.check_in_time.desc())
        .limit(limit)
    )
    history = history_res.scalars().all()

    return MemberAttendanceHistory(
        member_id=member.id,
        member_name=member.full_name,
        total_check_ins=len(history),
        history=history,
    )


@router.get("/member-pass-info", response_model=MemberPassInfoResponse)
async def get_member_pass_info(
    member_id: Optional[str] = Query(None),
    token_payload: TokenPayload = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns athlete profile, gym identity, and today's attendance status
    for the athlete's personal mobile check-in view.
    """
    gym_id = token_payload.gym_id

    # Resolve member_id
    target_member_id = member_id
    if not target_member_id:
        if token_payload.role == "member":
            target_member_id = token_payload.sub
        else:
            m_res = await db.execute(select(Member).where(Member.gym_id == gym_id).limit(1))
            first_m = m_res.scalar_one_or_none()
            if first_m:
                target_member_id = first_m.id
            else:
                raise HTTPException(status_code=404, detail="No members found in gym.")

    gym_res = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_res.scalar_one_or_none()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym record not found.")

    member_res = await db.execute(
        select(Member).where(Member.id == target_member_id, Member.gym_id == gym_id)
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found.")

    # Check today's attendance
    start_of_today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_rec_res = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.gym_id == gym_id,
            AttendanceRecord.member_id == member.id,
            AttendanceRecord.check_in_time >= start_of_today,
        )
        .order_by(AttendanceRecord.check_in_time.desc())
        .limit(1)
    )
    last_rec = today_rec_res.scalar_one_or_none()

    total_res = await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.gym_id == gym_id,
            AttendanceRecord.member_id == member.id,
        )
    )
    total_count = total_res.scalar() or 0

    # Fetch latest fee record for live payment status
    fee_res = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym_id, FeeRecord.member_id == member.id)
        .order_by(FeeRecord.due_date.desc())
        .limit(1)
    )
    latest_fee = fee_res.scalar_one_or_none()
    fee_status = latest_fee.payment_status if latest_fee else "paid"
    fee_due_date = latest_fee.due_date if latest_fee else None
    fee_amount_due = float(latest_fee.amount_due) if latest_fee else float(member.monthly_fee)

    return MemberPassInfoResponse(
        member_id=member.id,
        member_name=member.full_name,
        phone=member.phone,
        monthly_fee=member.monthly_fee,
        billing_cycle_day=member.billing_cycle_day,
        status=member.status,
        gym_id=gym.id,
        gym_name=gym.name,
        gym_logo=gym.logo_url,
        gym_primary_color=gym.primary_color,
        gym_qr_token=gym.qr_secret_token,
        checked_in_today=last_rec is not None,
        last_check_in_time=last_rec.check_in_time if last_rec else None,
        total_check_ins=total_count,
        fee_status=fee_status,
        fee_due_date=fee_due_date,
        fee_amount_due=fee_amount_due,
    )


@router.get("/public-pass-info/{member_id}", response_model=MemberPassInfoResponse)
async def get_public_member_pass_info(
    member_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public pass verification endpoint for athlete mobile scanner.
    Loads member and gym, generates an access session token for check-in.
    """
    member_res = await db.execute(select(Member).where(Member.id == member_id))
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Athlete pass not found or link has expired.")

    gym_res = await db.execute(select(Gym).where(Gym.id == member.gym_id))
    gym = gym_res.scalar_one_or_none()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym record not found.")

    # 365-day access token for member check-in session
    pass_token = create_access_token(
        subject=member.id,
        gym_id=gym.id,
        role="member",
        expires_delta=timedelta(days=365)
    )

    # Check today's attendance
    start_of_today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_rec_res = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.gym_id == gym.id,
            AttendanceRecord.member_id == member.id,
            AttendanceRecord.check_in_time >= start_of_today,
        )
        .order_by(AttendanceRecord.check_in_time.desc())
        .limit(1)
    )
    last_rec = today_rec_res.scalar_one_or_none()

    total_res = await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.gym_id == gym.id,
            AttendanceRecord.member_id == member.id,
        )
    )
    total_count = total_res.scalar() or 0

    # Fetch latest fee record for live payment status
    fee_res = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym.id, FeeRecord.member_id == member.id)
        .order_by(FeeRecord.due_date.desc())
        .limit(1)
    )
    latest_fee = fee_res.scalar_one_or_none()
    fee_status = latest_fee.payment_status if latest_fee else "paid"
    fee_due_date = latest_fee.due_date if latest_fee else None
    fee_amount_due = float(latest_fee.amount_due) if latest_fee else float(member.monthly_fee)

    return MemberPassInfoResponse(
        member_id=member.id,
        member_name=member.full_name,
        phone=member.phone,
        monthly_fee=member.monthly_fee,
        billing_cycle_day=member.billing_cycle_day,
        status=member.status,
        gym_id=gym.id,
        gym_name=gym.name,
        gym_logo=gym.logo_url,
        gym_primary_color=gym.primary_color,
        gym_qr_token=gym.qr_secret_token,
        checked_in_today=last_rec is not None,
        last_check_in_time=last_rec.check_in_time if last_rec else None,
        total_check_ins=total_count,
        pass_token=pass_token,
        fee_status=fee_status,
        fee_due_date=fee_due_date,
        fee_amount_due=fee_amount_due,
    )



