from sqlalchemy import (
    Column,
    Integer,
    String,
    REAL,
    BOOLEAN,
    DATE,
    DATETIME,
    ForeignKey,
)
from sqlalchemy.sql import func
from .database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DATE, nullable=False)
    description = Column(String)
    value = Column(REAL, nullable=False)
    type = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    account = Column(String)
    is_fixed = Column(BOOLEAN, default=False)
    created_at = Column(DATETIME(timezone=True), server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    keywords = Column(String, nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)

    type = Column(String, nullable=False, default="saving")

    target_amount = Column(REAL, nullable=False, default=0)

    current_amount = Column(REAL, nullable=False, default=0)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    period = Column(String, nullable=False, default="deadline")

    deadline = Column(DATE, nullable=True)

    created_at = Column(DATETIME(timezone=True), server_default=func.now())


class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_name = Column(String)

    rows_imported = Column(Integer)

    imported_at = Column(DATETIME(timezone=True), server_default=func.now())
