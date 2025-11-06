# backend/schemas.py

from pydantic import BaseModel

# 1. CORREÇÃO AQUI: Importamos 'List'
from typing import Optional, List
from datetime import date


class QuickEntryCreate(BaseModel):
    description: str
    value: float
    type: str
    category_name: Optional[str] = None


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
    date: date
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
    income_change_percentage: float
    expense_change_percentage: float
    investment_change_percentage: float
    balance_change_percentage: float

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
    # 2. Esta linha agora funciona, pois 'List' foi importado
    transactions: List[TransactionDetail]
    summary: TransactionSummary

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    type: Optional[str] = None
    category_name: Optional[str] = None
    date: Optional[date] = None


class GoalBase(BaseModel):
    name: str
    type: str  # 'saving' ou 'limit'
    target_amount: float
    period: str  # 'monthly' ou 'deadline'
    category_id: Optional[int] = None
    deadline: Optional[date] = None


class GoalCreate(GoalBase):
    current_amount: Optional[float] = 0  # Opcional ao criar


class Goal(GoalBase):
    id: int
    current_amount: float

    # Novos campos que virão do CRUD (cálculo de progresso)
    progress_value: float = 0.0  # O valor atual (economizado ou gasto)
    progress_percentage: float = 0.0
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


# Schema para o Resumo dos Cards (Total Economizado, Gastos Mensais)
class GoalsSummary(BaseModel):
    total_saved_current: float
    total_saved_target: float

    total_limit_spent: float
    total_limit_target: float

    active_goals_count: int
    saving_goals_count: int
    limit_goals_count: int

    class Config:
        from_attributes = True


# Schema final da página de Metas
class GoalsPage(BaseModel):
    summary: GoalsSummary
    goals: List[Goal]

    class Config:
        from_attributes = True
