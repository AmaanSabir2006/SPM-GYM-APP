from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class QRCheckInRequest(BaseModel):
    gym_qr_token: str
    member_id: Optional[str] = None  # Optional if extracted from member's JWT auth session


class AttendanceResponse(BaseModel):
    id: str
    gym_id: str
    member_id: str
    check_in_time: datetime
    check_in_method: str
    message: str = "Check-in successful"

    class Config:
        from_attributes = True


class AttendanceStats(BaseModel):
    total_today: int
    weekly_count: int
    unique_members_this_week: int


class MemberAttendanceHistory(BaseModel):
    member_id: str
    member_name: str
    total_check_ins: int
    history: List[AttendanceResponse]


class MemberPassInfoResponse(BaseModel):
    member_id: str
    member_name: str
    phone: str
    monthly_fee: float
    billing_cycle_day: int
    status: str
    gym_id: str
    gym_name: str
    gym_logo: Optional[str] = None
    gym_primary_color: Optional[str] = None
    gym_qr_token: Optional[str] = None
    checked_in_today: bool = False
    last_check_in_time: Optional[datetime] = None
    total_check_ins: int = 0
    pass_token: Optional[str] = None


