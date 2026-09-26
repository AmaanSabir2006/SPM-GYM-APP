from datetime import date
from typing import Optional
from pydantic import BaseModel


class MemberBase(BaseModel):
    full_name: str
    phone: str
    emergency_contact: Optional[str] = None
    monthly_fee: float
    billing_cycle_day: int = 1


class MemberCreate(MemberBase):
    join_date: Optional[date] = None


class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    monthly_fee: Optional[float] = None
    billing_cycle_day: Optional[int] = None
    status: Optional[str] = None


class MemberResponse(MemberBase):
    id: str
    gym_id: str
    join_date: date
    status: str

    class Config:
        from_attributes = True
