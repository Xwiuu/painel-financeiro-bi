from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import socket
from urllib.parse import urlparse, urlunparse

# A URL do banco de dados
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./painel.db")


# Função para forçar a resolução IPv4 do domínio
def force_ipv4_connection(db_url):
    try:
        parsed = urlparse(db_url)
        hostname = parsed.hostname

        if hostname and not hostname.replace(".", "").isnumeric():
            # Tenta obter especificamente um endereço IPv4 (AF_INET)
            # Isso evita que o sistema pegue o IPv6 por engano
            addr_info = socket.getaddrinfo(hostname, None, socket.AF_INET)
            if addr_info:
                ip_address = addr_info[0][4][0]
                print(f"✅ [DATABASE] DNS Resolvido: {hostname} -> {ip_address}")

                # Substitui o hostname pelo IP na string de conexão
                new_netloc = parsed.netloc.replace(hostname, ip_address)
                return urlunparse(parsed._replace(netloc=new_netloc))
    except Exception as e:
        print(f"⚠️ [DATABASE] Falha ao resolver DNS manual: {e}")

    return db_url


# Configuração do Engine
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Aplica a correção de IPv4 antes de conectar
    NEW_DB_URL = force_ipv4_connection(SQLALCHEMY_DATABASE_URL)

    # Configuração para PostgreSQL (Supabase)
    engine = create_engine(
        NEW_DB_URL,
        # sslmode='require' é vital quando usamos o IP direto para não validar o certificado do domínio
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
