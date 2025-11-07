from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class GoalBase(BaseModel):
    name: str
    type: str
    target_amount: float
    period: str
    category_id: Optional[int] = None
    deadline: Optional[date] = None

class GoalCreate(GoalBase):
    current_amount: Optional[float] = 0

class Goal(GoalBase):
    id: int
    current_amount: float
    progress_value: float = 0.0
    progress_percentage: float = 0.0
    category_name: Optional[str] = None

    class Config: 
        from_attributes = True
    
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

class GoalsPage(BaseModel):
    summary: GoalsSummary
    goals: List[Goal]

    class Config:
        from_attributes = True

