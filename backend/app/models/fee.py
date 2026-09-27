import uuid
from sqlalchemy import Column, Date, ForeignKey, Numeric, String
from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin


class FeeRecord(Base, TenantMixin, TimestampMixin):
    """
    Individual fee dues and payment records.
    Scoped by gym_id.
    """
    __tablename__ = "fee_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id = Column(String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    paid_date = Column(Date, nullable=True)
    payment_status = Column(String(20), default="unpaid", nullable=False, index=True)  # 'paid', 'unpaid', 'overdue'
    payment_method = Column(String(50), nullable=True)  # 'cash', 'bank_transfer', 'easypaisa', 'jazzcash'
    recorded_by_user_id = Column(String(36), nullable=True)
