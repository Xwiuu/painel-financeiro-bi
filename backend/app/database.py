from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os # Importação necessária para ler variáveis de ambiente

# A URL do banco de dados (relativa à pasta 'backend')
#
# PRÁTICA DE PRODUÇÃO:
# 1. Tenta ler a variável de ambiente (ex: PostgreSQL)
# 2. Se não encontrar, usa o SQLite (para rodar localmente)
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "sqlite:///./painel.db"
)

# Se a URL for SQLite, precisamos do `connect_args`.
# Caso contrário, removemos para evitar problemas com outros bancos (ex: Postgres).
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Para Postgres, MySQL, etc.
    engine = create_engine(SQLALCHEMY_DATABASE_URL)


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