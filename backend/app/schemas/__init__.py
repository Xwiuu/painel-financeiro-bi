# backend/app/schemas/__init__.py

from .category import (
    Category,
    CategoryCreate,
    CategoryUpdate,
    CategoryWithKeywords
)

from .transaction import (
    Transaction,
    TransactionCreate, 
    TransactionUpdate,
    TransactionDetail,
    TransactionSummary,
    TransactionPage,
    TransactionQuickCreate  # ← APENAS ESTE
)

from .goal import (
    Goal,
    GoalCreate,
    GoalUpdate,
    GoalsSummary,
    GoalsPage
)

from .dashboard import (
    DashboardKPIs,
    CategoryExpense,
    BalanceOverTimePoint
)