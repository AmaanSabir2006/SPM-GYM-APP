from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class MemberBase(BaseModel):
    full_name: str
    phone: str
    emergency_contact: Optional[str] = None
    monthly_fee: float
    billing_cycle_day: int = Field(default=1, ge=1, le=31, description="Day of month when fee renews (1 to 31)")

    @field_validator("billing_cycle_day")
    @classmethod
    def validate_billing_cycle_day(cls, v: int) -> int:
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Fee due day must be between 1 and 31.")
        return v


class MemberCreate(MemberBase):
    join_date: Optional[date] = None
    initial_payment_status: Optional[str] = Field(default="unpaid", description="'paid' or 'unpaid'")
    initial_payment_method: Optional[str] = Field(default="cash", description="'cash', 'easypaisa', 'jazzcash', 'bank_transfer'")


class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    monthly_fee: Optional[float] = None
    billing_cycle_day: Optional[int] = Field(default=None, ge=1, le=31)
    status: Optional[str] = None

    @field_validator("billing_cycle_day")
    @classmethod
    def validate_billing_cycle_day(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Fee due day must be between 1 and 31.")
        return v


class MemberResponse(MemberBase):
    id: str
    gym_id: str
    join_date: date
    status: str
    current_fee_status: Optional[str] = "unpaid"
    current_fee_id: Optional[str] = None
    current_due_date: Optional[date] = None

    class Config:
        from_attributes = True


class MemberWelcomeResponse(BaseModel):
    member_id: str
    member_name: str
    phone: str
    monthly_fee: float
    billing_cycle_day: int
    gym_name: str
    pass_token: str
    scan_url: str
    whatsapp_message: str
    whatsapp_url: str
