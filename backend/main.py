from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional


from database import engine, Base, get_db
import models
import crud
import schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Painel Financeiro BI API")

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/categories/", response_model=schemas.Category)
def create_category(
    category: schemas.CategoryCreate,
    db: Session = Depends(get_db),
):
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail="Categoria com este nome já existe")
    return crud.create_category(db=db, category=category)


@app.get("/api/categories/", response_model=List[schemas.Category])
def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return categories


@app.post("/api/import/")
async def import_transactions_file(
    db: Session = Depends(get_db), file: UploadFile = File(...)
):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx")):
        raise HTTPException(
            status_code=400, detail="Apenas arquivos .csv ou .xlsx são suportados"
        )

    file_content = await file.read()

    try:
        result = crud.process_import_file(
            db=db, file_content=file_content, file_name=file.filename
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/api/transactions/add", response_model=schemas.Transaction)
def create_quick_transaction(
    entry: schemas.QuickEntryCreate, 
    db: Session = Depends(get_db),
):
    """
    Recebe um lançamento rápido (manual) do pop-up e salva no banco.
    """
    try:
        new_transaction = crud.create_quick_entry(db=db, entry=entry)
        return new_transaction
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao salvar: {e}")


@app.get("/api/dashboard/kpis/", response_model=schemas.DashboardKPIs)
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
            status_code=500, detail="Erro ao calcular KPIs do dashboard: {e}"
        )


@app.get(
    "/api/dashboard/chart/expenses-by-category",
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


@app.get(
    "/api/dashboard/chart/balance-over-time",
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


@app.get("/")
def read_root():
    return {"status": "API do Painel Financeiro BI está funcionando!"}
