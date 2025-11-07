from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)

@router.get(
    "/expenses-by-category", response_model=List[schemas.CategoryExpense]
)
def read_report_expenses_by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    try:
        data = crud.get_report_expenses_by_category(
            db=db, start_date=start_date, end_date=end_date
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {e}")