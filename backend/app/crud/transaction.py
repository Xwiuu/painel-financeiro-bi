# backend/app/crud/transaction.py

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import Optional
from fastapi import HTTPException
from .. import models, schemas
from .category import get_category_by_name, find_category_by_keyword


def create_quick_entry(db: Session, entry: schemas.QuickEntryCreate):
    """
    Salva uma nova transação (entrada rápida) vinda do pop-up.
    AGORA ACEITA UMA DATA OPCIONAL.
    """

    # 1. Pega a data: Usa a data enviada ou, se for nula, usa a data de hoje
    parsed_date = entry.date if entry.date else date.today()

    # 2. Limpa o tipo (ex: "expense", "income", etc.)
    parsed_type = entry.type.lower().strip()

    # 3. Tenta achar a categoria (Auto-Tagging)
    category_obj = None
    if entry.category_name:
        category_obj = get_category_by_name(db, name=entry.category_name)

    # Se não achou pelo nome, tenta pelas keywords da descrição
    if not category_obj:
        category_obj = find_category_by_keyword(db, entry.description)

    # 4. Cria o objeto da transação
    db_transaction = models.Transaction(
        date=parsed_date,  # <-- Usa a data correta
        description=entry.description.strip(),
        value=entry.value,
        type=parsed_type,
        account=None,
        category_id=category_obj.id if category_obj else None,
    )

    # 5. Salva no banco
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


def get_recent_transactions(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 5,
):
    """
    Busca as N transações mais recentes, já incluindo o nome da categoria,
    opcionalmente filtrando por data.
    """
    query = db.query(
        models.Transaction.id,
        models.Transaction.date,
        models.Transaction.description,
        models.Transaction.value,
        models.Transaction.type,
        models.Category.name.label("category_name"),
    ).outerjoin(
        models.Category,
        models.Transaction.category_id == models.Category.id,
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    results = (
        query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc())
        .limit(limit)
        .all()
    )
    return results


def get_all_transactions(
    db: Session,
    search: Optional[str] = None,
    type: Optional[str] = None,
    month_year: Optional[str] = None,  # Espera "YYYY-MM"
):
    """
    Busca TODAS as transações com filtros e retorna
    a lista E o sumário.
    """

    # Query base que une Transações e Categorias
    query = db.query(
        models.Transaction.id,
        models.Transaction.date,
        models.Transaction.description,
        models.Transaction.value,
        models.Transaction.type,
        models.Category.name.label("category_name"),
    ).outerjoin(
        models.Category,
        models.Transaction.category_id == models.Category.id,
    )

    # 1. Aplicar filtro de Tipo (expense, income, investment)
    if type:
        query = query.filter(models.Transaction.type == type)

    # 2. Aplicar filtro de Mês/Ano
    if month_year:
        try:
            # Converte "YYYY-MM" em ano e mês
            year, month = map(int, month_year.split("-"))
            query = query.filter(
                extract("year", models.Transaction.date) == year,
                extract("month", models.Transaction.date) == month,
            )
        except ValueError:
            pass  # Ignora filtro mal formatado

    # 3. Aplicar filtro de Busca (na descrição OU no nome da categoria)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(models.Transaction.description).like(search_term))
            | (func.lower(models.Category.name).like(search_term))
        )

    # Ordena e executa a query para a lista
    transactions = query.order_by(models.Transaction.date.desc()).all()

    # Calcula o sumário a partir dos resultados filtrados (em Python)
    summary = {
        "total_income": 0.0,
        "total_expense": 0.0,
        "total_investment": 0.0,
    }

    for tx in transactions:
        if tx.type == "income":
            summary["total_income"] += tx.value
        elif tx.type == "expense":
            summary["total_expense"] += tx.value
        elif tx.type == "investment":
            summary["total_investment"] += tx.value

    summary["balance"] = summary["total_income"] - summary["total_expense"]

    # Retorna o dicionário completo
    return {"transactions": transactions, "summary": summary}


def get_available_months(db: Session):
    """
    Retorna uma lista de meses/anos (ex: "2024-10") que possuem transações.
    """
    # Usamos distinct() e extraímos ano e mês
    results = (
        db.query(
            extract("year", models.Transaction.date).label("year"),
            extract("month", models.Transaction.date).label("month"),
        )
        .distinct()
        .order_by(
            extract("year", models.Transaction.date).desc(),
            extract("month", models.Transaction.date).desc(),
        )
        .all()
    )

    # Formata como "YYYY-MM"
    month_list = [f"{r.year}-{str(r.month).zfill(2)}" for r in results]
    return month_list


def delete_transaction(db: Session, transaction_id: int):
    """
    Encontra e apaga uma transação pelo ID.
    """
    db_transaction = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    db.delete(db_transaction)
    db.commit()
    return {"ok": True}


def update_transaction(
    db: Session, transaction_id: int, transaction_data: schemas.TransactionUpdate
):
    """
    Encontra e atualiza uma transação pelo ID.
    """
    db_transaction = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    # 1. Lida com a Categoria
    if transaction_data.category_name is not None:
        category_obj = get_category_by_name(db, name=transaction_data.category_name)
        if not category_obj:
            # Tenta auto-tagging se o nome não for exato
            category_obj = find_category_by_keyword(
                db, transaction_data.description or db_transaction.description
            )

        db_transaction.category_id = category_obj.id if category_obj else None

    # 2. Atualiza os outros campos se eles foram enviados
    # (Usando .model_dump() é mais limpo se o Pydantic for v2,
    # mas esta forma é 100% explícita e funcional)
    update_data = transaction_data.model_dump(exclude_unset=True)
    
    if "category_name" in update_data:
        del update_data["category_name"] # Já tratamos
    
    for key, value in update_data.items():
        if value is not None:
            setattr(db_transaction, key, value)

    # 3. Salva
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


def get_uncategorized_count(db: Session):
    """
    Conta o número total de transações que ainda não
    foram categorizadas (category_id IS NULL).
    """
    count = (
        db.query(models.Transaction)
        .filter(models.Transaction.category_id == None)
        .count()
    )

    return {"count": count}