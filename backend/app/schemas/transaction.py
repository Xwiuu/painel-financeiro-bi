# backend/app/schemas/transaction.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# -----------------
# SCHEMAS DE INPUT (REQUEST)
# (Estes NUNCA devem ter 'from_attributes = True')
# -----------------


class QuickEntryCreate(BaseModel):
    description: str
    value: float
    type: str
    category_name: Optional[str] = None
    date: Optional[date] = None
    # Sem 'Config' aqui!


class TransactionCreate(BaseModel):
    date: str
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_name: Optional[str] = None
    # Sem 'Config' aqui!


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    type: Optional[str] = None
    category_name: Optional[str] = None
    date: Optional[date] = None
    # Sem 'Config' aqui!


# -----------------
# SCHEMAS DE OUTPUT (RESPONSE)
# (Estes PRECISAM de 'from_attributes = True' para ler os modelos do SQLAlchemy)
# -----------------

class Transaction(BaseModel):
    id: int
    date: date
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_id: Optional[int] = None

    class Config:
        from_attributes = True


class TransactionDetail(BaseModel):
    """
    Schema para retornar uma transação com detalhes (ex: nome da categoria).
    """
    id: int
    date: date
    description: str
    value: float
    type: str
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_income: float
    total_expense: float
    total_investment: float
    balance: float

    class Config:
        from_attributes = True


class TransactionPage(BaseModel):
    transactions: List[TransactionDetail]
    summary: TransactionSummary

    class Config:
        from_attributes = True
