from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/goals",
    tags=["Goals"],
)

@router.get("/", response_model=schemas.GoalsPage)
def read_goals_page(
    filter: Optional[str] = None, db: Session = Depends(get_db)
):
    try:
        data = crud.get_goals_page_data(db=db, filter_type=filter)
        return data
    except Exception as e:
        print(f"Erro ao buscar metas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar metas: {e}")

@router.post("/", response_model=schemas.Goal)
def create_goal_endpoint(
    goal_data: schemas.GoalCreate, db: Session = Depends(get_db)
):
    try:
        return crud.create_goal(db=db, goal_data=goal_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao criar meta: {e}")

@router.put("/{goal_id}", response_model=schemas.Goal)
def update_goal_endpoint(
    goal_id: int,
    goal_data: schemas.GoalCreate,
    db: Session = Depends(get_db),
):
    try:
        return crud.update_goal(db=db, goal_id=goal_id, goal_data=goal_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao atualizar meta: {e}")

@router.delete("/{goal_id}")
def delete_goal_endpoint(
    goal_id: int, db: Session = Depends(get_db)
):
    try:
        return crud.delete_goal(db=db, goal_id=goal_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao apagar meta: {e}")
    
@router.post("/{goal_id}/contribute", response_model=schemas.Goal)
def add_contribution_endpoint(
    goal_id: int, 
    amount: float = Body(..., embed=True, description="Valor do aporte"), # Recebe apenas o float
    db: Session = Depends(get_db)
):
    try:
        # Chama a nova função do CRUD
        return crud.add_contribution_to_goal(db=db, goal_id=goal_id, amount=amount)
    except HTTPException as e:
        raise e # Re-lança 400/404 do CRUD
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao adicionar aporte: {e}")