import uuid
from sqlalchemy import Boolean, Column, ForeignKey, String
from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin


class User(Base, TenantMixin, TimestampMixin):
    """
    User accounts (gym owner, staff, or member login).
    Scoped to gym_id.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), default="staff", nullable=False)  # 'owner', 'staff', 'member'
    is_active = Column(Boolean, default=True, nullable=False)
