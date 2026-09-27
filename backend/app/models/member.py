import uuid
from datetime import date
from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin


class Member(Base, TenantMixin, TimestampMixin):
    """
    Gym member profile.
    Scoped by gym_id.
    """
    __tablename__ = "members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)  # link to User if member has mobile app login
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False, index=True)
    emergency_contact = Column(String(50), nullable=True)
    join_date = Column(Date, default=date.today, nullable=False)
    monthly_fee = Column(Numeric(10, 2), nullable=False)
    billing_cycle_day = Column(Integer, default=1, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # 'active', 'inactive', 'suspended'
