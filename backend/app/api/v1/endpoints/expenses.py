from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_, extract
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id
from app.models.expense import Expense
from app.models.fee import FeeRecord
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseResponse,
    ProfitSummaryResponse,
    MonthlyProfitTrendItem,
    CategoryBreakdownItem,
)

router = APIRouter()


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_in: ExpenseCreate,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Log a new operational expense (Rent, Electricity, Salary, Equipment Maintenance).
    Permanently scoped to current tenant gym.
    """
    new_expense = Expense(
        gym_id=gym_id,
        title=expense_in.title,
        category=expense_in.category,
        amount=expense_in.amount,
        expense_date=expense_in.expense_date or date.today(),
        notes=expense_in.notes,
    )
    db.add(new_expense)
    await db.commit()
    await db.refresh(new_expense)
    return new_expense


@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    category: Optional[str] = Query(None),
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List expenses for current gym tenant, filterable by month, year, and category.
    """
    query = select(Expense).where(Expense.gym_id == gym_id)
    if month and year:
        query = query.where(
            extract("month", Expense.expense_date) == month,
            extract("year", Expense.expense_date) == year,
        )
    elif year:
        query = query.where(extract("year", Expense.expense_date) == year)

    if category and category != "all":
        query = query.where(Expense.category == category)

    result = await db.execute(query.order_by(Expense.expense_date.desc()))
    return result.scalars().all()


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an operational expense record.
    """
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.gym_id == gym_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense record not found.")

    await db.delete(expense)
    await db.commit()
    return None


@router.get("/profit-analytics", response_model=ProfitSummaryResponse)
async def get_profit_analytics(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculates real-time Net Profit (Fee Collections minus Expenses) for the current month,
    along with category breakdown and a 6-month historical profit trend trajectory graph.
    """
    today = date.today()
    current_year = today.year
    current_month = today.month

    # 1. Fetch current month fee collections (paid fees)
    current_fees_query = select(func.sum(FeeRecord.amount_paid)).where(
        FeeRecord.gym_id == gym_id,
        extract("year", FeeRecord.due_date) == current_year,
        extract("month", FeeRecord.due_date) == current_month,
    )
    current_fees_res = await db.execute(current_fees_query)
    current_fees_collected = float(current_fees_res.scalar() or 0.0)

    # 2. Fetch current month expenses
    current_exp_query = select(Expense).where(
        Expense.gym_id == gym_id,
        extract("year", Expense.expense_date) == current_year,
        extract("month", Expense.expense_date) == current_month,
    )
    current_exp_res = await db.execute(current_exp_query)
    current_expenses_list = current_exp_res.scalars().all()
    current_total_expenses = sum(float(e.amount) for e in current_expenses_list)

    # Net Profit
    net_profit = current_fees_collected - current_total_expenses
    profit_margin_percent = (
        round((net_profit / current_fees_collected) * 100, 1)
        if current_fees_collected > 0
        else 0.0
    )

    # Category breakdown for current month
    cat_totals = {}
    for e in current_expenses_list:
        cat_totals[e.category] = cat_totals.get(e.category, 0.0) + float(e.amount)

    category_breakdown: List[CategoryBreakdownItem] = []
    for cat, amt in cat_totals.items():
        pct = round((amt / current_total_expenses) * 100, 1) if current_total_expenses > 0 else 0.0
        category_breakdown.append(CategoryBreakdownItem(category=cat, amount=amt, percentage=pct))
    category_breakdown.sort(key=lambda x: x.amount, reverse=True)

    # 3. Calculate 6-month Historical Trend (last 6 calendar months)
    # Generate list of (year, month) tuples going back 5 months
    months_sequence = []
    for offset in range(5, -1, -1):
        target_month = current_month - offset
        target_year = current_year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        months_sequence.append((target_year, target_month))

    monthly_trend: List[MonthlyProfitTrendItem] = []
    previous_month_profit = None
    prev_profit_val = 0.0

    for yr, mn in months_sequence:
        dt = date(yr, mn, 1)
        month_label = dt.strftime("%b %Y")

        # Fees collected in that month
        rev_q = select(func.sum(FeeRecord.amount_paid)).where(
            FeeRecord.gym_id == gym_id,
            extract("year", FeeRecord.due_date) == yr,
            extract("month", FeeRecord.due_date) == mn,
        )
        rev_res = await db.execute(rev_q)
        rev_amt = float(rev_res.scalar() or 0.0)

        # Expenses in that month
        exp_q = select(func.sum(Expense.amount)).where(
            Expense.gym_id == gym_id,
            extract("year", Expense.expense_date) == yr,
            extract("month", Expense.expense_date) == mn,
        )
        exp_res = await db.execute(exp_q)
        exp_amt = float(exp_res.scalar() or 0.0)

        m_profit = rev_amt - exp_amt

        # Profit change % vs previous month in trend
        if previous_month_profit is not None and abs(previous_month_profit) > 0:
            change_pct = round(((m_profit - previous_month_profit) / abs(previous_month_profit)) * 100, 1)
        else:
            change_pct = 0.0

        if yr == current_year and mn == current_month:
            prev_profit_val = previous_month_profit if previous_month_profit is not None else 0.0

        previous_month_profit = m_profit

        monthly_trend.append(
            MonthlyProfitTrendItem(
                month_label=month_label,
                month_num=mn,
                year=yr,
                revenue=rev_amt,
                expenses=exp_amt,
                net_profit=m_profit,
                profit_change_percent=change_pct,
            )
        )

    # Current month profit growth vs immediately previous month
    if prev_profit_val != 0.0:
        profit_growth_percent = round(((net_profit - prev_profit_val) / abs(prev_profit_val)) * 100, 1)
    else:
        profit_growth_percent = 100.0 if net_profit > 0 else 0.0

    is_profit_increase = (net_profit >= prev_profit_val)

    return ProfitSummaryResponse(
        current_month_label=today.strftime("%B %Y"),
        fees_collected=current_fees_collected,
        total_expenses=current_total_expenses,
        net_profit=net_profit,
        profit_margin_percent=profit_margin_percent,
        profit_growth_percent=profit_growth_percent,
        is_profit_increase=is_profit_increase,
        monthly_trend=monthly_trend,
        category_breakdown=category_breakdown,
    )
