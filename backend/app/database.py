from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import socket
from urllib.parse import urlparse, urlunparse

# LER A URL
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./painel.db")


def resolve_ip(hostname):
    """Tenta resolver o IP IPv4 de um hostname"""
    try:
        # Solicita especificamente endereços IPv4 (AF_INET)
        # Isso ignora os endereços IPv6 que o Render não consegue acessar
        data = socket.getaddrinfo(hostname, None, family=socket.AF_INET)
        if data:
            # Pega o primeiro IP da lista
            return data[0][4][0]
    except Exception as e:
        print(f"❌ [ERRO DNS] Não foi possível resolver {hostname}: {e}", flush=True)
    return None


print(f"🔍 [INIT] Iniciando configuração do banco de dados...", flush=True)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    print("🔵 [MODE] Usando SQLite (Local).", flush=True)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    print("🔵 [MODE] Usando PostgreSQL.", flush=True)

    # Lógica de correção de DNS
    try:
        parsed = urlparse(SQLALCHEMY_DATABASE_URL)
        hostname = parsed.hostname

        print(f"🔎 [DNS] Tentando resolver IPv4 para: {hostname}", flush=True)

        ip_address = resolve_ip(hostname)

        if ip_address:
            print(f"✅ [DNS] Sucesso! Host: {hostname} -> IP: {ip_address}", flush=True)

            # Reconstrói a URL trocando o domínio pelo IP
            new_netloc = parsed.netloc.replace(hostname, ip_address)
            SQLALCHEMY_DATABASE_URL = urlunparse(parsed._replace(netloc=new_netloc))
        else:
            print(
                "⚠️ [DNS] Falha: Nenhum IP IPv4 encontrado. Usando URL original.",
                flush=True,
            )

    except Exception as e:
        print(f"❌ [CRITICAL] Erro na lógica de DNS: {e}", flush=True)

    # Cria o engine com a nova URL (com IP)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        # 'sslmode': 'require' é OBRIGATÓRIO quando usamos o IP direto do Supabase
        connect_args={"sslmode": "require"},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
