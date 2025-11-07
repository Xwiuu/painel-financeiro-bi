# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa os módulos da nossa aplicação
from . import models
from .database import engine

# Agora importamos o 'importer' (o arquivo renomeado) junto com os outros
from .routers import (
    categories,
    transactions,
    dashboard,
    goals,
    reports,
    importer  # <-- CORRIGIDO
)

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Painel Financeiro BI API")

# Configuração do CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(goals.router)
app.include_router(reports.router)
app.include_router(importer.router) 

@app.get("/")
def read_root():
    return {"status": "API do Painel Financeiro BI está funcionando!"}