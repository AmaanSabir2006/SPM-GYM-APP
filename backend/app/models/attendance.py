import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String
from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin


class AttendanceRecord(Base, TenantMixin, TimestampMixin):
    """
    Check-in attendance events.
    Scoped by gym_id.
    """
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id = Column(String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    check_in_method = Column(String(20), default="qr_scan", nullable=False)  # 'qr_scan', 'manual_staff'
