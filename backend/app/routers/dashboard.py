from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/kpis/", response_model=schemas.DashboardKPIs)
def read_dashboard_kpis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    try:
        kpis = crud.get_dashboard_kpis(db=db, start_date=start_date, end_date=end_date)
        return kpis
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao calcular KPIs do dashboard: {e}"
        )

@router.get(
    "/chart/expenses-by-category",
    response_model=List[schemas.CategoryExpense],
)
def read_chart_expenses_by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    try:
        chart_data = crud.get_expenses_by_category(
            db=db, start_date=start_date, end_date=end_date
        )
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular gráfico: {e}")

@router.get(
    "/chart/balance-over-time",
    response_model=List[schemas.BalanceOverTimePoint],
)
def read_chart_balance_over_time(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    try:
        chart_data = crud.get_balance_over_time(
            db=db, start_date=start_date, end_date=end_date
        )
        return chart_data
    except Exception as e:
        print(f"Erro em /balance-over-time: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao calcular gráfico de evolução: {e}"
        )