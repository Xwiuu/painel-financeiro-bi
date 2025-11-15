# backend/app/schemas/dashboard.py

from pydantic import BaseModel

class DashboardKPIs(BaseModel):
    total_income: float
    total_expense: float
    total_investment: float
    balance: float
    income_change_percentage: float
    expense_change_percentage: float
    investment_change_percentage: float
    balance_change_percentage: float

    model_config = {"from_attributes": True}

class CategoryExpense(BaseModel):
    name: str
    value: float

    model_config = {"from_attributes": True}
    
class BalanceOverTimePoint(BaseModel):
    date: str
    income: float
    expense: float
    balance: float

    model_config = {"from_attributes": True}