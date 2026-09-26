from datetime import datetime
from typing import Optional
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
