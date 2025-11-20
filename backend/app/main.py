# backend/app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import json
import os # <-- Adicionado para ler variáveis de ambiente
from datetime import date, datetime
from app.schemas.transaction import TransactionQuickCreate


# Importa os módulos da nossa aplicação
from . import models
from .database import engine

# Agora importamos o 'importer' (o arquivo renomeado) junto com os outros
from .routers import categories, transactions, dashboard, goals, reports, importer

# Cria as tabelas no banco de dados (isso deve ser feito apenas UMA vez em produção)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Painel Financeiro BI API")

# Configuração do CORS
# 1. Pega o FRONTEND_URL da variável de ambiente, se existir
frontend_url = os.environ.get("FRONTEND_URL")

# 2. Define as origens permitidas
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]
if frontend_url:
    origins.append(frontend_url)
    print(f"✅ CORS configurado para permitir: {frontend_url}") # Adiciona um log útil

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Usa a lista dinâmica
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# O restante do código, incluindo os routers e o handler 422, permanece inalterado.
print("🔍 DEBUG MAIN - Campos do TransactionQuickCreate:")
print(TransactionQuickCreate.model_fields)
print("🔍 DEBUG MAIN - Annotation do campo date:")
print(TransactionQuickCreate.model_fields['date'].annotation)
# Inclui todos os nossos routers
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(goals.router)
app.include_router(reports.router)
app.include_router(importer.router)


@app.get("/")
def read_root():
    return {"status": "API do Painel Financeiro BI está funcionando!"}


# --- CÓDIGO DE DEPURAÇÃO DE ERROS 422 ---
# (Isto foi adicionado para apanhar o nosso bug)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handler de exceção para imprimir erros de validação 422 detalhados no terminal.
    """
    error_details = exc.errors()
    error_body = await request.body()

    print("\n--- ERRO DE VALIDAÇÃO 422 DETALHADO ---")
    print(f"Endpoint: {request.url.path}")
    print("\n[DADOS QUE O FRONTEND ENVIOU (BODY)]:")
    try:
        # Tenta decodificar como JSON primeiro
        body_str = error_body.decode('utf-8')
        try:
            parsed_body = json.loads(body_str)
            print(json.dumps(parsed_body, indent=2, ensure_ascii=False))
        except:
            print(body_str)
    except:
        print(f"[Não foi possível decodificar o body: {error_body}]")

    print("\n[ERROS DE VALIDAÇÃO DO PYDANTIC]:")
    # Converte objetos não serializáveis para string
    serializable_errors = []
    for error in error_details:
        serializable_error = error.copy()
        # Converte date/datetime para string
        if 'input' in serializable_error:
            input_val = serializable_error['input']
            if isinstance(input_val, (date, datetime)):
                serializable_error['input'] = input_val.isoformat()
        serializable_errors.append(serializable_error)
    
    print(json.dumps(serializable_errors, indent=2, ensure_ascii=False))
    print("----------------------------------------\n")

    # Retorna a resposta 422 padrão do FastAPI
    return JSONResponse(
        status_code=422,
        content={"detail": error_details},
    )


# --- FIM DO CÓDIGO DE DEPURAÇÃO ---