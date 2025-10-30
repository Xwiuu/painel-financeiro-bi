from pydantic import BaseModel
from typing import Optional


class CategoryCreate(BaseModel):
    name: str
    keywords: Optional[str] = None
    parent_id: Optional[int] = None


class Category(BaseModel):
    id: int
    name: str
    keywords: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    date: str
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_name: Optional[str] = None


class Transaction(BaseModel):
    id: int
    date: str
    description: str
    value: float
    type: str
    account: Optional[str] = None
    category_id: Optional[int] = None

    class Config:
        from_attributes = True


class DashboardKPIs(BaseModel):
    total_income: float
    total_expense: float
    total_investment: float
    balance: float

    class Config:
        from_attributes = True


class CategoryExpense(BaseModel):
    name: str
    value: float

    class Config:
        from_attributes = True


class BalanceOverTimePoint(BaseModel):
    date: str
    income: float
    expense: float
    balance: float
