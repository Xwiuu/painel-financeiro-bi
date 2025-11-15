from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"],
)


@router.get("/uncategorized-count")
def read_uncategorized_count(db: Session = Depends(get_db)):
    try:
        return crud.get_uncategorized_count(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao contar transações: {e}")

@router.post("/add-simple", response_model=schemas.Transaction)
def create_simple_transaction(
    description: str = Body(...),
    value: float = Body(...),
    type: str = Body(...),
    category_name: Optional[str] = Body(None),
    date: Optional[str] = Body(None),  # ← Aceita string
    db: Session = Depends(get_db)
):
    try:
        print(f"🔍 SIMPLE - Dados: desc={description}, valor={value}, tipo={type}, cat={category_name}, data={date}")
        
        # Converte a data manualmente
        from datetime import date
        parsed_date = date.today()  # padrão
        if date:
            try:
                parsed_date = date.fromisoformat(date)
            except:
                parsed_date = date.today()
        
        # Chama o CRUD manualmente
        from ..crud.transaction import create_quick_entry
        
        # Cria um objeto simples (bypass do schema)
        class SimpleEntry:
            def __init__(self, description, value, type, category_name, date):
                self.description = description
                self.value = value
                self.type = type
                self.category_name = category_name
                self.date = date
        
        entry = SimpleEntry(description, value, type, category_name, parsed_date)
        new_transaction = create_quick_entry(db=db, entry=entry)
        return new_transaction
        
    except Exception as e:
        print(f"🔍 SIMPLE - Erro: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao salvar: {e}")

@router.post("/add", response_model=schemas.Transaction)
def create_quick_transaction(
    entry: schemas.TransactionQuickCreate, db: Session = Depends(get_db)  # ← CORRETO
):
    try:
        print(f"🔍 SCHEMA TESTE - Campos: {QuickTestSchema.model_fields}")
        new_transaction = crud.create_quick_entry(db=db, entry=entry)
        return new_transaction
    except Exception as e:
        print(f"🔍 SCHEMA TESTE - Erro: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao salvar: {e}")
    
@router.put("/{transaction_id}", response_model=schemas.Transaction)
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


@router.delete("/{transaction_id}")
def delete_transaction_endpoint(transaction_id: int, db: Session = Depends(get_db)):
    try:
        return crud.delete_transaction(db=db, transaction_id=transaction_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao apagar: {e}")


@router.get("/months", response_model=List[str])
def read_available_months(db: Session = Depends(get_db)):
    try:
        months = crud.get_available_months(db=db)
        return months
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar meses: {e}")


@router.get("/all", response_model=schemas.TransactionPage)
def read_all_transactions(
    search: Optional[str] = None,
    type: Optional[str] = None,
    month_year: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        result = crud.get_all_transactions(
            db=db, search=search, type=type, month_year=month_year
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transações: {e}")


@router.get("/recent", response_model=List[schemas.TransactionDetail])
def read_recent_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    try:
        transactions = crud.get_recent_transactions(
            db=db, start_date=start_date, end_date=end_date, limit=5
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transações: {e}")
