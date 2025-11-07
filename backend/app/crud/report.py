from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional
from .. import models, schemas

def get_report_expenses_by_category(
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

    results = (
        query.group_by(models.Category.name)
        .order_by(func.sum(models.Transaction.value).desc())
        .all()
    )

    chart_data = []
    for r in results:
        chart_data.append(
            schemas.CategoryExpense(
                name=r.name if r.name else "Sem Categoria", value=r.total_value or 0.0
            )
        )
    return chart_data