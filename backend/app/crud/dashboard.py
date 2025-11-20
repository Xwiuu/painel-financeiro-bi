from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional
from .. import models, schemas


def _get_kpis_for_period(
    db: Session, start_date: Optional[date], end_date: Optional[date]
):
    query = db.query(
        models.Transaction.type, func.sum(models.Transaction.value).label("total")
    )
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    results = query.group_by(models.Transaction.type).all()

    kpis = {"total_income": 0.0, "total_expense": 0.0, "total_investment": 0.0}
    for r in results:
        if r.type == "income":
            kpis["total_income"] = r.total or 0.0
        elif r.type == "expense":
            kpis["total_expense"] = r.total or 0.0
        elif r.type == "investment":
            kpis["total_investment"] = r.total or 0.0

    kpis["balance"] = kpis["total_income"] - kpis["total_expense"]
    return kpis


def _calculate_percentage_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    if current == 0 and previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 2)


def get_dashboard_kpis(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    current_kpis = _get_kpis_for_period(db, start_date, end_date)
    previous_kpis = {
        "total_income": 0.0,
        "total_expense": 0.0,
        "total_investment": 0.0,
        "balance": 0.0,
    }

    if start_date and end_date:
        try:
            period_duration = end_date - start_date
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - period_duration
            previous_kpis = _get_kpis_for_period(db, prev_start_date, prev_end_date)
        except Exception as e:
            print(f"Erro ao calcular período anterior: {e}")

    change_percentages = {
        "income_change_percentage": _calculate_percentage_change(
            current_kpis["total_income"], previous_kpis["total_income"]
        ),
        "expense_change_percentage": _calculate_percentage_change(
            current_kpis["total_expense"], previous_kpis["total_expense"]
        ),
        "investment_change_percentage": _calculate_percentage_change(
            current_kpis["total_investment"], previous_kpis["total_investment"]
        ),
        "balance_change_percentage": _calculate_percentage_change(
            current_kpis["balance"], previous_kpis["balance"]
        ),
    }
    return schemas.DashboardKPIs(**current_kpis, **change_percentages)


def get_expenses_by_category(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    query = (
        db.query(
            models.Category.name,
            func.sum(models.Transaction.value).label("total_value"),
        )
        .select_from(models.Transaction)
        .join(
            models.Category,
            models.Transaction.category_id == models.Category.id,
            isouter=True,
        )
        .filter(models.Transaction.type == "expense")
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    results = query.group_by(models.Category.name).all()
    chart_data = []
    for r in results:
        chart_data.append(
            schemas.CategoryExpense(
                name=r.name if r.name else "Sem Categoria", value=r.total_value or 0.0
            )
        )
    return chart_data


def get_balance_over_time(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    # Subqueries para agrupar por dia
    income_sub = (
        db.query(
            models.Transaction.date,
            func.sum(models.Transaction.value).label("total_income"),
        )
        .filter(models.Transaction.type == "income")
        .group_by(models.Transaction.date)
        .subquery()
    )

    expense_sub = (
        db.query(
            models.Transaction.date,
            func.sum(models.Transaction.value).label("total_expense"),
        )
        .filter(models.Transaction.type == "expense")
        .group_by(models.Transaction.date)
        .subquery()
    )

    # --- CORREÇÃO PARA POSTGRESQL ---
    # Adicionamos func.max() ao redor dos valores das subqueries.
    # Como estamos agrupando por data, e a subquery tem apenas 1 valor por data,
    # o MAX vai pegar esse único valor corretamente, satisfazendo a regra do Group By.
    query = (
        db.query(
            models.Transaction.date,
            func.max(func.coalesce(income_sub.c.total_income, 0)).label("income"),
            func.max(func.coalesce(expense_sub.c.total_expense, 0)).label("expense"),
        )
        .outerjoin(income_sub, models.Transaction.date == income_sub.c.date)
        .outerjoin(expense_sub, models.Transaction.date == expense_sub.c.date)
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    daily_summary = (
        query.group_by(models.Transaction.date).order_by(models.Transaction.date).all()
    )

    chart_data = []
    running_balance = 0.0

    for day in daily_summary:
        # O SQLAlchemy retorna os labels definidos
        daily_net = day.income - day.expense
        running_balance += daily_net
        chart_data.append(
            schemas.BalanceOverTimePoint(
                date=day.date.isoformat(),
                income=day.income,
                expense=day.expense,
                balance=running_balance,
            )
        )
    return chart_data
