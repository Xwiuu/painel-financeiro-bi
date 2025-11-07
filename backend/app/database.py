from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# A URL do banco de dados (relativa à pasta 'backend')
# O 'app' roda de 'backend/', então o path './painel.db' ainda é correto
SQLALCHEMY_DATABASE_URL = "sqlite:///./painel.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Estas linhas NÃO PODEM ter indentação
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Esta função DEVE ter indentação
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()