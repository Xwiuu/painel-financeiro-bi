# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional  # <-- 1. CORREÇÃO: Importar 'List'
from datetime import date
from fastapi.middleware.cors import CORSMiddleware


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


@app.delete("/api/categories/{category_id}", status_code=204)
def delete_a_category(category_id: int, db: Session = Depends(get_db)):
    """
    Endpoint para deletar uma categoria pelo ID.
    """

    # Chama a função do crud.py que acabamos de criar
    deleted_category = crud.delete_category(db, category_id=category_id)

    # Se o crud retornou None, é porque não achou (Erro 404)
    # (Exatamente como a sua função 'delete_category' está escrita)
    if deleted_category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    # Se deu certo, retorna 204 No Content (padrão de sucesso do DELETE)
    # O 'return' vazio faz o FastAPI enviar o status_code=204
    return


# ... (depois do seu endpoint DELETE /api/categories/{category_id}) ...


# --- ENDPOINT PARA O BADGE DE "NÃO CATEGORIZADOS" ---
@app.get("/api/transactions/uncategorized-count")
def read_uncategorized_count(db: Session = Depends(get_db)):
    """
    Retorna a contagem de transações sem categoria.
    """
    try:
        # Chama a função do crud.py que acabamos de criar
        return crud.get_uncategorized_count(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao contar transações: {e}")


# --- FIM DO NOVO ENDPOINT ---


@app.post("/api/import/")
# ... (o resto do seu código continua) ...


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


@app.put("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction_endpoint(
    transaction_id: int,
    transaction_data: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
):
    try:
        updated_transaction = crud.update_transaction(
            db=db, transaction_id=transaction_id, transaction_data=transaction_data
        )
        return updated_transaction
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao atualizar: {e}")


# --- 2. ENDPOINT DE APAGAR ---
@app.delete("/api/transactions/{transaction_id}")
def delete_transaction_endpoint(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    try:
        return crud.delete_transaction(db=db, transaction_id=transaction_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao apagar: {e}")


# --- 3. ENDPOINT DOS MESES ---
@app.get("/api/transactions/months", response_model=List[str])
def read_available_months(db: Session = Depends(get_db)):
    """
    Retorna uma lista de meses/anos (ex: "2024-10") que possuem transações.
    """
    try:
        months = crud.get_available_months(db=db)
        return months
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar meses: {e}")


# --- 2. CORREÇÃO: O ENDPOINT QUE FALTAVA ---
@app.get("/api/transactions/all", response_model=schemas.TransactionPage)
def read_all_transactions(
    search: Optional[str] = None,
    type: Optional[str] = None,
    month_year: Optional[str] = None,  # "YYYY-MM"
    db: Session = Depends(get_db),
):
    """
    Retorna a lista de transações e o sumário, com filtros.
    """
    try:
        result = crud.get_all_transactions(
            db=db, search=search, type=type, month_year=month_year
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transações: {e}")


# --- FIM DO NOVO ENDPOINT ---


@app.get("/api/transactions/recent", response_model=List[schemas.TransactionDetail])
def read_recent_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Retorna as 5 transações mais recentes para a tabela da Home,
    respeitando o filtro de data.
    """
    try:
        transactions = crud.get_recent_transactions(
            db=db, start_date=start_date, end_date=end_date, limit=5
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transações: {e}")


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


@app.get("/api/goals/", response_model=schemas.GoalsPage)
def read_goals_page(
    # 'filter' pode ser "all", "monthly", "deadline"
    filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Retorna o sumário e a lista de metas com progresso calculado.
    """
    try:
        data = crud.get_goals_page_data(db=db, filter_type=filter)
        return data
    except Exception as e:
        print(f"Erro ao buscar metas: {e}")  # Para debug
        raise HTTPException(status_code=500, detail=f"Erro ao buscar metas: {e}")


@app.post("/api/goals/", response_model=schemas.Goal)
def create_goal_endpoint(
    goal_data: schemas.GoalCreate,
    db: Session = Depends(get_db),
):
    try:
        return crud.create_goal(db=db, goal_data=goal_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao criar meta: {e}")


@app.put("/api/goals/{goal_id}", response_model=schemas.Goal)
def update_goal_endpoint(
    goal_id: int,
    goal_data: schemas.GoalCreate,  # Reutilizamos o schema de criação
    db: Session = Depends(get_db),
):
    try:
        return crud.update_goal(db=db, goal_id=goal_id, goal_data=goal_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao atualizar meta: {e}")


@app.delete("/api/goals/{goal_id}")
def delete_goal_endpoint(
    goal_id: int,
    db: Session = Depends(get_db),
):
    try:
        return crud.delete_goal(db=db, goal_id=goal_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao apagar meta: {e}")


@app.get(
    "/api/reports/expenses-by-category", response_model=List[schemas.CategoryExpense]
)
def read_report_expenses_by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Retorna dados para o gráfico de barras de despesas por categoria.
    """
    try:
        data = crud.get_report_expenses_by_category(
            db=db, start_date=start_date, end_date=end_date
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {e}")


@app.get("/")
def read_root():
    return {"status": "API do Painel Financeiro BI está funcionando!"}
