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
    FeeRecordCreate,
    FeeRecordResponse,
    FeeOverviewStats,
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
    """
    records_res = await db.execute(select(FeeRecord).where(FeeRecord.gym_id == gym_id))
    records = records_res.scalars().all()

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
