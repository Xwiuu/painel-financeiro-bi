from pydantic import BaseModel
from typing import Optional

class CategoryCreate(BaseModel):
    name:str
    keywords: Optional[str] = None
    parent_id: Optional[int] = None

class Category(BaseModel):
    id: int
    name: str
    keywords: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True