from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse

router = APIRouter()


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
