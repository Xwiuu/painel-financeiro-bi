from sqlalchemy.orm import Session
import re
from .. import models, schemas

def get_category_by_name(db: Session, name: str):
    return db.query(models.Category).filter(models.Category.name == name).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).offset(skip).limit(limit).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(
        name=category.name,
        keywords=category.keywords,
        parent_id=category.parent_id,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def find_category_by_keyword(db: Session, description: str):
    categories = db.query(models.Category).all()
    description_lower = description.lower()
    for category in categories:
        if category.keywords:
            keywords = [
                kw.strip().lower() for kw in re.split(r"[;,]", category.keywords)
            ]
            for kw in keywords:
                if kw and kw in description_lower:
                    return category
    return None

def get_category_by_id(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def delete_category(db: Session, category_id: int):
    db_category = get_category_by_id(db, category_id=category_id)
    if db_category is None:
        return None
    db.delete(db_category)
    db.commit()
    return db_category