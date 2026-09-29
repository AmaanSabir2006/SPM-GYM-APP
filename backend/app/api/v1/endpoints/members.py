import calendar
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
from app.core.phone import normalize_phone_number, get_phone_lookup_variants, format_whatsapp_phone
from app.models.gym import Gym
from app.models.user import User
from app.models.member import Member
from app.models.fee import FeeRecord
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse, MemberWelcomeResponse

router = APIRouter()


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
        f"*Welcome to {gym.name}*\n\n"
        f"Salam *{member.full_name}*,\n"
        f"Your gym membership is confirmed and active. Membership details:\n\n"
        f"• *Facility:* {gym.name}\n"
        f"• *Monthly Fee:* PKR {int(member.monthly_fee):,}\n"
        f"• *Renewal Due Date:* {due_date_str}\n\n"
        f"*Digital Entrance Pass:*\n"
        f"When arriving at the facility, open your entrance scanner link below to scan the entrance QR code:\n"
        f"{scan_url}\n\n"
        f"_Note: If this link is not clickable yet on your phone, reply 'OK' or save this contact to enable links._\n"
        f"_Tip: Add this pass link to your phone home screen for fast 1-tap gym access._"
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
    Dynamically attaches the latest fee record status ('paid', 'unpaid', 'overdue').
    """
    today = date.today()
    query = select(Member).where(Member.gym_id == gym_id)
    if status_filter:
        query = query.where(Member.status == status_filter)
    if search:
        query = query.where(
            (Member.full_name.ilike(f"%{search}%")) | (Member.phone.ilike(f"%{search}%"))
        )
    result = await db.execute(query)
    members = result.scalars().all()
    if not members:
        return []

    # Query all fee records for this gym to attach current fee status
    fees_res = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym_id)
        .order_by(FeeRecord.due_date.desc())
    )
    all_fees = fees_res.scalars().all()

    # Map the latest fee record per member
    latest_fee_map = {}
    fee_status_dirty = False
    for f in all_fees:
        if f.member_id not in latest_fee_map:
            # Sync overdue status if due_date has passed and status is still unpaid
            if f.payment_status == "unpaid" and f.due_date < today:
                f.payment_status = "overdue"
                fee_status_dirty = True
            latest_fee_map[f.member_id] = f

    # Auto-generate initial fee record for active members that have no record yet (e.g. legacy/newly added members)
    for m in members:
        if m.id not in latest_fee_map and m.status == "active":
            max_days = calendar.monthrange(today.year, today.month)[1]
            cycle_day = min(max(1, m.billing_cycle_day), max_days)
            due_date = date(today.year, today.month, cycle_day)
            init_status = "overdue" if due_date < today else "unpaid"
            new_fee = FeeRecord(
                gym_id=gym_id,
                member_id=m.id,
                amount_due=m.monthly_fee,
                amount_paid=0,
                due_date=due_date,
                payment_status=init_status,
            )
            db.add(new_fee)
            latest_fee_map[m.id] = new_fee
            fee_status_dirty = True

    if fee_status_dirty:
        await db.commit()

    # Attach current fee details to member response objects
    for m in members:
        fee = latest_fee_map.get(m.id)
        if fee:
            m.current_fee_status = fee.payment_status
            m.current_fee_id = fee.id
            m.current_due_date = fee.due_date
        else:
            m.current_fee_status = "unpaid"
            m.current_fee_id = None
            m.current_due_date = None

    return members


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_in: MemberCreate,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new member scoped to current tenant gym.
    Validates phone uniqueness, prevents assigning owner's phone,
    and atomically creates the initial membership fee invoice.
    """
    raw_phone = (member_in.phone or "").strip()
    digits = "".join(filter(str.isdigit, raw_phone))
    if len(digits) < 10:
        raise HTTPException(
            status_code=400,
            detail="A valid mobile or WhatsApp phone number (minimum 10 digits) is required to enroll a member."
        )

    phone_variants = get_phone_lookup_variants(raw_phone)

    # Disallow enrolling a member using the gym owner's phone number
    owner_collision = await db.execute(
        select(User).where(
            User.role == "owner",
            User.phone.in_(phone_variants)
        )
    )
    if owner_collision.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot enroll a member with the gym owner's phone number. Members must have their own unique mobile number."
        )

    # Disallow enrolling a member using a staff account phone number for this gym
    staff_collision = await db.execute(
        select(User).where(
            User.gym_id == gym_id,
            User.phone.in_(phone_variants)
        )
    )
    if staff_collision.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot enroll a member with a gym staff account phone number."
        )

    # Disallow duplicate member phone within current gym roster
    duplicate_member = await db.execute(
        select(Member).where(
            Member.gym_id == gym_id,
            Member.phone.in_(phone_variants)
        )
    )
    if duplicate_member.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="A member with this phone number is already registered in your gym roster."
        )

    normalized_phone = normalize_phone_number(raw_phone)

    new_member = Member(
        gym_id=gym_id,
        full_name=member_in.full_name.strip(),
        phone=normalized_phone,
        emergency_contact=member_in.emergency_contact,
        join_date=member_in.join_date or date.today(),
        monthly_fee=member_in.monthly_fee,
        billing_cycle_day=member_in.billing_cycle_day,
        status="active",
    )
    db.add(new_member)
    await db.flush()

    # Atomic creation of Initial FeeRecord
    today = date.today()
    max_days = calendar.monthrange(today.year, today.month)[1]
    cycle_day = min(max(1, new_member.billing_cycle_day), max_days)
    due_date = date(today.year, today.month, cycle_day)

    is_paid_now = getattr(member_in, "initial_payment_status", "unpaid") == "paid"
    payment_method = getattr(member_in, "initial_payment_method", "cash") if is_paid_now else None
    
    fee_status = "paid" if is_paid_now else ("overdue" if due_date < today else "unpaid")
    amount_paid = new_member.monthly_fee if is_paid_now else 0

    init_fee = FeeRecord(
        gym_id=gym_id,
        member_id=new_member.id,
        amount_due=new_member.monthly_fee,
        amount_paid=amount_paid,
        due_date=due_date,
        paid_date=today if is_paid_now else None,
        payment_status=fee_status,
        payment_method=payment_method,
    )
    db.add(init_fee)
    await db.commit()
    await db.refresh(new_member)
    await db.refresh(init_fee)

    new_member.current_fee_status = init_fee.payment_status
    new_member.current_fee_id = init_fee.id
    new_member.current_due_date = init_fee.due_date

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
    today = date.today()
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym.")

    fee_res = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym_id, FeeRecord.member_id == member_id)
        .order_by(FeeRecord.due_date.desc())
    )
    latest_fee = fee_res.scalars().first()
    if latest_fee:
        if latest_fee.payment_status == "unpaid" and latest_fee.due_date < today:
            latest_fee.payment_status = "overdue"
            await db.commit()
        member.current_fee_status = latest_fee.payment_status
        member.current_fee_id = latest_fee.id
        member.current_due_date = latest_fee.due_date
    else:
        member.current_fee_status = "unpaid"
        member.current_fee_id = None
        member.current_due_date = None

    return member


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    member_in: MemberUpdate,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update member details, validating phone uniqueness and owner protection.
    """
    today = date.today()
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    update_data = member_in.model_dump(exclude_unset=True)

    if "phone" in update_data and update_data["phone"]:
        raw_phone = str(update_data["phone"]).strip()
        digits = "".join(filter(str.isdigit, raw_phone))
        if len(digits) < 10:
            raise HTTPException(
                status_code=400,
                detail="A valid mobile or WhatsApp phone number (minimum 10 digits) is required."
            )
        phone_variants = get_phone_lookup_variants(raw_phone)

        # Disallow gym owner's phone
        owner_collision = await db.execute(
            select(User).where(
                User.role == "owner",
                User.phone.in_(phone_variants)
            )
        )
        if owner_collision.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Cannot assign a gym owner's phone number to a member profile."
            )

        # Disallow duplicate member phone within this gym (excluding current member)
        duplicate_member = await db.execute(
            select(Member).where(
                Member.gym_id == gym_id,
                Member.id != member_id,
                Member.phone.in_(phone_variants)
            )
        )
        if duplicate_member.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Another member in your gym already has this phone number."
            )

        update_data["phone"] = normalize_phone_number(raw_phone)

    if "full_name" in update_data and update_data["full_name"]:
        update_data["full_name"] = update_data["full_name"].strip()

    for field, value in update_data.items():
        setattr(member, field, value)

    await db.commit()
    await db.refresh(member)

    fee_res = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.gym_id == gym_id, FeeRecord.member_id == member_id)
        .order_by(FeeRecord.due_date.desc())
    )
    latest_fee = fee_res.scalars().first()
    if latest_fee:
        if latest_fee.payment_status == "unpaid" and latest_fee.due_date < today:
            latest_fee.payment_status = "overdue"
            await db.commit()
        member.current_fee_status = latest_fee.payment_status
        member.current_fee_id = latest_fee.id
        member.current_due_date = latest_fee.due_date
    else:
        member.current_fee_status = "unpaid"
        member.current_fee_id = None
        member.current_due_date = None

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

