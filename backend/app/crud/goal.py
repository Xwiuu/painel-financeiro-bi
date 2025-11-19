from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional
from fastapi import HTTPException
from .. import models, schemas

def get_goals_page_data(db: Session, filter_type: Optional[str] = None):
    query = db.query(
        models.Goal, models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Goal.category_id == models.Category.id)

    if filter_type == "monthly":
        query = query.filter(models.Goal.period == "monthly")
    elif filter_type == "deadline":
        query = query.filter(models.Goal.period == "deadline")
    
    all_goals = query.order_by(models.Goal.id).all()
    today = date.today()
    first_day_of_month = today.replace(day=1)
    summary = {
        "total_saved_current": 0.0, "total_saved_target": 0.0,
        "total_limit_spent": 0.0, "total_limit_target": 0.0,
        "saving_goals_count": 0, "limit_goals_count": 0,
    }
    processed_goals = []

    for goal_tuple in all_goals:
        goal: models.Goal = goal_tuple[0]
        category_name: str = goal_tuple[1]
        progress_value = 0.0

        if goal.type == "saving":
            progress_value = goal.current_amount
            summary["total_saved_current"] += goal.current_amount
            summary["total_saved_target"] += goal.target_amount
            summary["saving_goals_count"] += 1
        elif goal.type == "limit":
            if goal.category_id:
                q_start_date = first_day_of_month if goal.period == "monthly" else None
                q_end_date = today if goal.period == "monthly" else None
                q = db.query(func.sum(models.Transaction.value)).filter(
                    models.Transaction.type == "expense",
                    models.Transaction.category_id == goal.category_id,
                )
                if q_start_date:
                    q = q.filter(models.Transaction.date >= q_start_date)
                if q_end_date:
                    q = q.filter(models.Transaction.date <= q_end_date)
                spent = q.scalar() or 0.0
                progress_value = spent
            if goal.period == "monthly":
                summary["total_limit_spent"] += progress_value
                summary["total_limit_target"] += goal.target_amount
                summary["limit_goals_count"] += 1

        percentage = (progress_value / goal.target_amount) * 100 if goal.target_amount > 0 else 0.0
        processed_goals.append(
            schemas.Goal(
                id=goal.id, name=goal.name, type=goal.type,
                target_amount=goal.target_amount, current_amount=goal.current_amount,
                period=goal.period, deadline=goal.deadline, category_id=goal.category_id,
                category_name=category_name or (goal.type.capitalize()),
                progress_value=progress_value, progress_percentage=percentage,
            )
        )
    summary["active_goals_count"] = len(processed_goals)
    return {"summary": summary, "goals": processed_goals}

def create_goal(db: Session, goal_data: schemas.GoalCreate):
    category_id = None
    if goal_data.category_id:
        category = db.query(models.Category).filter(models.Category.id == goal_data.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        category_id = category.id
    db_goal = models.Goal(
        name=goal_data.name, type=goal_data.type,
        target_amount=goal_data.target_amount, current_amount=goal_data.current_amount or 0.0,
        period=goal_data.period, deadline=goal_data.deadline, category_id=category_id,
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def update_goal(db: Session, goal_id: int, goal_data: schemas.GoalCreate):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    category_id = db_goal.category_id
    if goal_data.category_id:
        category = db.query(models.Category).filter(models.Category.id == goal_data.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        category_id = category.id
    db_goal.name = goal_data.name
    db_goal.type = goal_data.type
    db_goal.target_amount = goal_data.target_amount
    db_goal.current_amount = goal_data.current_amount or db_goal.current_amount
    db_goal.period = goal_data.period
    db_goal.deadline = goal_data.deadline
    db_goal.category_id = category_id
    db.commit()
    db.refresh(db_goal)
    return db_goal

def delete_goal(db: Session, goal_id: int):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(db_goal)
    db.commit()
    return {"ok": True}


def add_contribution_to_goal(db: Session, goal_id: int, amount: float):
    """
    Adiciona um valor (aporte) à meta de poupança (saving).
    """
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    if db_goal.type != "saving":
        raise HTTPException(status_code=400, detail="Aporte só é permitido para metas de poupança.")
    
    # Adiciona o valor atual ao valor existente
    db_goal.current_amount += amount
    
    # Garante que o valor não ultrapasse o target (opcional, mas bom para evitar over-saving)
    # db_goal.current_amount = min(db_goal.current_amount, db_goal.target_amount) 
    
    db.commit()
    db.refresh(db_goal)
    return db_goal