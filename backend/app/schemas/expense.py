from datetime import date, datetime
from typing import List, Optional, Dict
from pydantic import BaseModel


class ExpenseBase(BaseModel):
    title: str
    category: str = "other"  # 'rent', 'utilities', 'salary', 'maintenance', 'supplies', 'other'
    amount: float
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseResponse(ExpenseBase):
    id: str
    gym_id: str
    expense_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class MonthlyProfitTrendItem(BaseModel):
    month_label: str  # e.g. "Sep 2026"
    month_num: int
    year: int
    revenue: float
    expenses: float
    net_profit: float
    profit_change_percent: float  # increase or decrease vs previous month


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float


class ProfitSummaryResponse(BaseModel):
    current_month_label: str
    fees_collected: float
    total_expenses: float
    net_profit: float
    profit_margin_percent: float
    profit_growth_percent: float
    is_profit_increase: bool
    monthly_trend: List[MonthlyProfitTrendItem]
    category_breakdown: List[CategoryBreakdownItem]
