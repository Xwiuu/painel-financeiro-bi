from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)

@router.post("/", response_model=schemas.Category)
def create_category(
    category: schemas.CategoryCreate, db: Session = Depends(get_db)
):
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail="Categoria com este nome já existe")
    return crud.create_category(db=db, category=category)

@router.get("/", response_model=List[schemas.Category])
def read_categories(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return categories

@router.delete("/{category_id}", status_code=204)
def delete_a_category(category_id: int, db: Session = Depends(get_db)):
    deleted_category = crud.delete_category(db, category_id=category_id)
    if deleted_category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return