from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class FeeRecordBase(BaseModel):
    member_id: str
    amount_due: float
    due_date: date


class FeeRecordCreate(FeeRecordBase):
    pass


class MarkPaidRequest(BaseModel):
    amount_paid: float
    payment_method: str = "cash"  # 'cash', 'bank_transfer', 'easypaisa', 'jazzcash'
    paid_date: Optional[date] = None


class FeeRecordResponse(BaseModel):
    id: str
    gym_id: str
    member_id: str
    amount_due: float
    amount_paid: float
    due_date: date
    paid_date: Optional[date] = None
    payment_status: str
    payment_method: Optional[str] = None

    class Config:
        from_attributes = True


class FeeOverviewStats(BaseModel):
    total_expected: float
    total_collected: float
    total_pending: float
    paid_count: int
    unpaid_count: int
    overdue_count: int
