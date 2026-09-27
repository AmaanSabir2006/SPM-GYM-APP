from datetime import date, timedelta
from typing import List, Optional
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id
from app.core.security import create_access_token
from app.models.gym import Gym
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse, MemberWelcomeResponse

router = APIRouter()


def format_whatsapp_phone(raw_phone: str) -> str:
    """Standardizes Pakistani and international phone numbers for WhatsApp wa.me links."""
    digits = "".join(filter(str.isdigit, raw_phone))
    if digits.startswith("0"):
        digits = "92" + digits[1:]
    elif digits.startswith("92"):
        pass
    elif len(digits) == 10 and digits.startswith("3"):
        digits = "92" + digits
    return digits


def build_member_welcome_card(
    member: Member,
    gym: Gym,
    frontend_base_url: Optional[str] = None
) -> MemberWelcomeResponse:
    # 365-day access token for member entrance pass
    pass_token = create_access_token(
        subject=member.id,
        gym_id=gym.id,
        role="member",
        expires_delta=timedelta(days=365)
    )

    base_url = (frontend_base_url or settings.FRONTEND_URL).rstrip("/")
    scan_url = f"{base_url}/scan?mid={member.id}"

    day = member.billing_cycle_day
    if 11 <= day <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    due_date_str = f"{day}{suffix} of every month"

    whatsapp_message = (
        f"🏋️ *Welcome to {gym.name}!*\n\n"
        f"Salam *{member.full_name}*,\n"
        f"Your gym membership is confirmed and active! Here are your membership details:\n\n"
        f"🏢 *Gym:* {gym.name}\n"
        f"💰 *Monthly Fee:* PKR {int(member.monthly_fee):,}\n"
        f"📅 *Fee Renewal Date:* {due_date_str}\n\n"
        f"📲 *Your Digital Entrance Scanner:*\n"
        f"Whenever you arrive at the gym, tap your pass link below to open your camera, scan the entrance QR code, and enter:\n"
        f"{scan_url}\n\n"
        f"⚠️ _Note: If this link is not clickable on your phone, simply reply 'OK' to this message or save this number to your contacts to activate it!_\n\n"
        f"⚡ _Tip: Add this link to your phone's home screen for fast 1-tap gym entry!_"
    )

    clean_phone = format_whatsapp_phone(member.phone)
    whatsapp_url = f"https://wa.me/{clean_phone}?text={quote(whatsapp_message)}"

    return MemberWelcomeResponse(
        member_id=member.id,
        member_name=member.full_name,
        phone=member.phone,
        monthly_fee=member.monthly_fee,
        billing_cycle_day=member.billing_cycle_day,
        gym_name=gym.name,
        pass_token=pass_token,
        scan_url=scan_url,
        whatsapp_message=whatsapp_message,
        whatsapp_url=whatsapp_url,
    )


@router.get("", response_model=List[MemberResponse])
async def list_members(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List all members belonging to the authenticated tenant gym.
    Supports filtering by status and searching by name or phone.
    """
    query = select(Member).where(Member.gym_id == gym_id)
    if status_filter:
        query = query.where(Member.status == status_filter)
    if search:
        query = query.where(
            (Member.full_name.ilike(f"%{search}%")) | (Member.phone.ilike(f"%{search}%"))
        )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_in: MemberCreate,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new member scoped to current tenant gym.
    """
    new_member = Member(
        gym_id=gym_id,
        full_name=member_in.full_name,
        phone=member_in.phone,
        emergency_contact=member_in.emergency_contact,
        join_date=member_in.join_date or date.today(),
        monthly_fee=member_in.monthly_fee,
        billing_cycle_day=member_in.billing_cycle_day,
        status="active",
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return new_member


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: str,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve specific member profile ensuring tenant isolation.
    """
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym.")
    return member


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    member_in: MemberUpdate,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update member details.
    """
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    update_data = member_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)

    await db.commit()
    await db.refresh(member)
    return member


@router.get("/{member_id}/welcome-card", response_model=MemberWelcomeResponse)
async def get_member_welcome_card(
    member_id: str,
    frontend_url: Optional[str] = Query(None),
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate athlete digital entrance pass token and pre-composed WhatsApp
    welcome notification containing fee amount, due date, gym name, and direct web scanner link.
    """
    gym_res = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_res.scalar_one_or_none()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym record not found.")

    member_res = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym.")

    return build_member_welcome_card(member, gym, frontend_url)


@router.delete("/{member_id}", status_code=status.HTTP_200_OK)
async def delete_member(
    member_id: str,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove and delete an athlete profile from current tenant gym.
    Cascades to delete associated fee transactions and attendance scan records.
    """
    from app.models.fee import FeeRecord
    from app.models.attendance import AttendanceRecord
    from sqlalchemy import delete

    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym.")

    # Clean up associated records across tables
    await db.execute(delete(AttendanceRecord).where(AttendanceRecord.member_id == member_id))
    await db.execute(delete(FeeRecord).where(FeeRecord.member_id == member_id))

    member_name = member.full_name
    await db.delete(member)
    await db.commit()

    return {"message": f"Athlete '{member_name}' has been successfully removed."}

