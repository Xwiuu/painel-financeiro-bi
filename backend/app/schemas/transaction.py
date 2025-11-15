# backend/app/schemas/transaction.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class TransactionQuickCreate(BaseModel):
    description: str
    value: float
    type: str
    category_name: Optional[str] = None
    date: Optional[date] = None

    model_config = {"from_attributes": True}

class TransactionCreate(BaseModel):
    date: date
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_name: Optional[str] = None


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    type: Optional[str] = None
    category_name: Optional[str] = None
    date: Optional[date] = None


class Transaction(BaseModel):
    id: int
    date: date
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_id: Optional[int] = None

    model_config = {"from_attributes": True}


class TransactionDetail(BaseModel):
    id: int
    date: date
    description: str
    value: float
    type: str
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}


class TransactionSummary(BaseModel):
    total_income: float
    total_expense: float
    total_investment: float
    balance: float

    model_config = {"from_attributes": True}


class TransactionPage(BaseModel):
    transactions: List[TransactionDetail]
    summary: TransactionSummary

    model_config = {"from_attributes": True}
