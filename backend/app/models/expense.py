import uuid
from datetime import date
from sqlalchemy import Column, Date, Numeric, String, Text
from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin


class Expense(Base, TenantMixin, TimestampMixin):
    """
    Gym operational expenses (rent, electricity, salaries, repairs).
    Permanently scoped by gym_id for multi-tenancy.
    """
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    category = Column(String(50), default="other", nullable=False)  # 'rent', 'utilities', 'salary', 'maintenance', 'supplies', 'other'
    amount = Column(Numeric(10, 2), nullable=False)
    expense_date = Column(Date, default=date.today, nullable=False, index=True)
    notes = Column(Text, nullable=True)
