from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import socket
from urllib.parse import urlparse, urlunparse

# A URL do banco de dados (lida das variáveis de ambiente)
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./painel.db")

# Configuração do Engine
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Configuração para SQLite (Local)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # --- CORREÇÃO PARA RENDER + SUPABASE (IPv6 vs IPv4) ---
    # O Render por vezes resolve o domínio do Supabase para IPv6, que falha.
    # Este bloco força a resolução para um endereço IPv4 antes de conectar.
    try:
        parsed = urlparse(SQLALCHEMY_DATABASE_URL)
        hostname = parsed.hostname

        if hostname:
            # Obtém o endereço IPv4 explicitamente
            ip_address = socket.gethostbyname(hostname)

            # Substitui o hostname original pelo IP na string de conexão
            # Ex: ...@db.supabase.co... -> ...@123.45.67.89...
            new_netloc = parsed.netloc.replace(hostname, ip_address)
            SQLALCHEMY_DATABASE_URL = urlunparse(parsed._replace(netloc=new_netloc))

            print(f"✅ [DATABASE] Host resolvido para IPv4: {hostname} -> {ip_address}")
    except Exception as e:
        print(f"⚠️ [DATABASE] Aviso: Não foi possível resolver DNS manualmente: {e}")

    # Configuração para PostgreSQL
    # 'sslmode': 'require' é necessário porque estamos a conectar via IP,
    # e o certificado SSL espera o domínio. 'require' mantém a encriptação sem validar o hostname.
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"sslmode": "require"})


# Sessão e Base
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
