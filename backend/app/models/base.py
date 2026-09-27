import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class TimestampMixin:
    """Provides created_at and updated_at timestamps automatically."""
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class TenantMixin:
    """
    Mandatory mixin for all tenant-scoped entities.
    Guarantees that a gym_id foreign key is present for multi-tenant isolation.
    """
    gym_id = Column(String(36), nullable=False, index=True)
