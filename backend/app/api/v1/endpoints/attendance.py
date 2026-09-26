from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id, get_current_token_payload, TokenPayload
from app.models.attendance import AttendanceRecord
from app.models.gym import Gym
from app.models.member import Member
from app.schemas.attendance import AttendanceResponse, AttendanceStats, QRCheckInRequest

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

    # 2. Find Member linked to this user or member_id passed
    member_id = check_in.member_id
    if not member_id:
        member_res = await db.execute(
            select(Member).where(Member.user_id == token_payload.sub, Member.gym_id == gym_id)
        )
        member = member_res.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=404, detail="No active gym membership found for this account.")
        member_id = member.id
    else:
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
        select(AttendanceRecord).where(
            AttendanceRecord.gym_id == gym_id,
            AttendanceRecord.member_id == member_id,
            AttendanceRecord.check_in_time >= five_mins_ago,
        )
    )
    if dup_res.scalar_one_or_none():
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
