import urllib.parse
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id
from app.models.fee import FeeRecord
from app.models.gym import Gym
from app.models.member import Member
from app.schemas.fee import (
    DueAlertItem,
    DueAlertsResponse,
    FeeOverviewStats,
    FeeRecordCreate,
    FeeRecordResponse,
    MarkPaidRequest,
)

router = APIRouter()


@router.get("/overview", response_model=FeeOverviewStats)
async def get_fee_overview(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns high-level financial summary metrics for gym dashboard.
    Automatically treats past-due unpaid records as overdue.
    """
    today = date.today()
    records_res = await db.execute(select(FeeRecord).where(FeeRecord.gym_id == gym_id))
    records = records_res.scalars().all()

    # Dynamic overdue sync
    has_updates = False
    for r in records:
        if r.payment_status == "unpaid" and r.due_date < today:
            r.payment_status = "overdue"
            has_updates = True
    if has_updates:
        await db.commit()

    total_expected = sum(float(r.amount_due) for r in records)
    total_collected = sum(float(r.amount_paid) for r in records)
    total_pending = max(0.0, total_expected - total_collected)
    paid_count = sum(1 for r in records if r.payment_status == "paid")
    unpaid_count = sum(1 for r in records if r.payment_status == "unpaid")
    overdue_count = sum(1 for r in records if r.payment_status == "overdue")

    return FeeOverviewStats(
        total_expected=total_expected,
        total_collected=total_collected,
        total_pending=total_pending,
        paid_count=paid_count,
        unpaid_count=unpaid_count,
        overdue_count=overdue_count,
    )


@router.get("/alerts", response_model=DueAlertsResponse)
async def get_fee_due_alerts(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Notifies the admin with pending / overdue fee alerts.
    Powers the top Notification Bell (🔔) and Dashboard Action Banner.
    Includes pre-formatted 1-tap WhatsApp reminder links.
    """
    today = date.today()
    gym_res = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_res.scalar_one_or_none()
    gym_name = gym.name if gym else "Gym"

    # Query all unpaid or overdue fee records with due_date <= today
    query = (
        select(FeeRecord, Member)
        .join(Member, FeeRecord.member_id == Member.id)
        .where(
            FeeRecord.gym_id == gym_id,
            FeeRecord.payment_status.in_(["unpaid", "overdue"]),
            FeeRecord.due_date <= today,
        )
        .order_by(FeeRecord.due_date.asc())
    )
    results = await db.execute(query)
    rows = results.all()

    alerts: List[DueAlertItem] = []
    due_today_count = 0
    overdue_count = 0

    for fee, member in rows:
        diff_days = (today - fee.due_date).days
        status_label = "due_today" if diff_days == 0 else "overdue"
        if status_label == "due_today":
            due_today_count += 1
        else:
            overdue_count += 1
            if fee.payment_status != "overdue":
                fee.payment_status = "overdue"

        # Format WhatsApp link
        phone = member.phone.strip().replace("-", "").replace(" ", "").replace("+", "")
        if phone.startswith("03"):
            phone = "92" + phone[1:]

        overdue_text = f"was due on {fee.due_date.strftime('%d-%b-%Y')}" if diff_days > 0 else "is due today"
        message_text = (
            f"Assalam-o-Alaikum {member.full_name},\n\n"
            f"This is a gentle reminder regarding your monthly membership fee for {gym_name}.\n"
            f"Due Amount: Rs. {fee.amount_due:,.0f} ({overdue_text}).\n\n"
            f"Kindly clear your fee or transfer via EasyPaisa/JazzCash.\n"
            f"Thank you!"
        )
        whatsapp_url = f"https://wa.me/{phone}?text={urllib.parse.quote(message_text)}"

        alerts.append(
            DueAlertItem(
                fee_record_id=fee.id,
                member_id=member.id,
                member_name=member.full_name,
                phone=phone,
                amount_due=float(fee.amount_due),
                due_date=fee.due_date,
                days_overdue=max(0, diff_days),
                status=status_label,
                whatsapp_url=whatsapp_url,
            )
        )

    await db.commit()

    return DueAlertsResponse(
        due_today_count=due_today_count,
        overdue_count=overdue_count,
        total_alerts=len(alerts),
        alerts=alerts,
    )


@router.post("/generate-monthly-dues")
async def generate_monthly_dues(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Automated monthly billing dues generator.
    Scans all active members in the gym and creates an unpaid FeeRecord
    for the current month if one doesn't exist already.
    """
    today = date.today()
    members_res = await db.execute(
        select(Member).where(Member.gym_id == gym_id, Member.status == "active")
    )
    members = members_res.scalars().all()

    created_count = 0
    for m in members:
        # Determine due date for this member's current billing cycle
        cycle_day = min(m.billing_cycle_day, 28)  # safe day for all months
        due_date = date(today.year, today.month, cycle_day)

        # Check if a fee record already exists for this member and due date month
        existing = await db.execute(
            select(FeeRecord).where(
                FeeRecord.gym_id == gym_id,
                FeeRecord.member_id == m.id,
                func.extract("year", FeeRecord.due_date) == today.year,
                func.extract("month", FeeRecord.due_date) == today.month,
            )
        )
        if not existing.scalar_one_or_none():
            status_init = "overdue" if due_date < today else "unpaid"
            new_fee = FeeRecord(
                gym_id=gym_id,
                member_id=m.id,
                amount_due=m.monthly_fee,
                amount_paid=0,
                due_date=due_date,
                payment_status=status_init,
            )
            db.add(new_fee)
            created_count += 1

    await db.commit()
    return {
        "message": f"Successfully generated {created_count} monthly fee records for active members.",
        "created_count": created_count,
    }


@router.get("/records", response_model=List[FeeRecordResponse])
async def list_fee_records(
    status_filter: Optional[str] = Query(None, alias="status"),
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List fee records filterable by status ('paid', 'unpaid', 'overdue').
    """
    query = select(FeeRecord).where(FeeRecord.gym_id == gym_id)
    if status_filter:
        query = query.where(FeeRecord.payment_status == status_filter)
    result = await db.execute(query.order_by(FeeRecord.due_date.desc()))
    return result.scalars().all()


@router.get("/members/{member_id}/ledger", response_model=List[FeeRecordResponse])
async def get_member_fee_ledger(
    member_id: str,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve full chronological payment ledger for a specific member.
    """
    result = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym_id, FeeRecord.member_id == member_id)
        .order_by(FeeRecord.due_date.desc())
    )
    return result.scalars().all()


@router.post("/records/{record_id}/mark-paid", response_model=FeeRecordResponse)
async def mark_fee_as_paid(
    record_id: str,
    payment: MarkPaidRequest,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Manual 'mark as paid' action performed by gym owner or front desk staff.
    """
    result = await db.execute(
        select(FeeRecord).where(FeeRecord.id == record_id, FeeRecord.gym_id == gym_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Fee record not found.")

    record.amount_paid = payment.amount_paid
    record.paid_date = payment.paid_date or date.today()
    record.payment_method = payment.payment_method
    record.payment_status = "paid" if payment.amount_paid >= float(record.amount_due) else "partial"

    await db.commit()
    await db.refresh(record)
    return record


@router.get("/reminders/{member_id}/whatsapp")
async def generate_whatsapp_reminder(
    member_id: str,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a 1-tap WhatsApp link pre-filled with member name, due amount, and gym name.
    Does not require a paid WhatsApp Business API.
    """
    member_res = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    gym_res = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_res.scalar_one_or_none()
    gym_name = gym.name if gym else "Gym"

    # Clean phone number for Pakistani international format (923...)
    phone = member.phone.strip().replace("-", "").replace(" ", "").replace("+", "")
    if phone.startswith("03"):
        phone = "92" + phone[1:]

    message_text = (
        f"Assalam-o-Alaikum {member.full_name},\n\n"
        f"This is a gentle reminder regarding your monthly membership fee for {gym_name}.\n"
        f"Due Amount: Rs. {member.monthly_fee:,.0f}\n\n"
        f"Kindly clear your fee or transfer via EasyPaisa/JazzCash at your earliest convenience.\n"
        f"Thank you!"
    )

    encoded_msg = urllib.parse.quote(message_text)
    whatsapp_url = f"https://wa.me/{phone}?text={encoded_msg}"

    return {
        "member_name": member.full_name,
        "phone": phone,
        "whatsapp_url": whatsapp_url,
        "message_template": message_text,
    }

