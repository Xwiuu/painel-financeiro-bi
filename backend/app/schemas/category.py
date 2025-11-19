# backend/app/schemas/category.py

from pydantic import BaseModel
from typing import Optional, List


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    keywords: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class Category(CategoryBase):
    id: int
    keywords: Optional[str] = None

    model_config = {"from_attributes": True}


class CategoryWithKeywords(Category):
    keywords: List[str] = []
