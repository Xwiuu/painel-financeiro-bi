import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional
import models, schemas  # Mantenha o 'models' aqui

from io import BytesIO
import re
from datetime import datetime


def get_category_by_name(db: Session, name: str):
    return db.query(models.Category).filter(models.Category.name == name).first()


def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).offset(skip).limit(limit).all()


def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(
        name=category.name,
        keywords=category.keywords,
        parent_id=category.parent_id,
    )

    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    return db_category


def find_category_by_keyword(db: Session, description: str):
    categories = db.query(models.Category).all()

    description_lower = description.lower()

    for category in categories:
        if category.keywords:
            keywords = [
                kw.strip().lower() for kw in re.split(r"[;,]", category.keywords)
            ]
            for kw in keywords:
                if kw and kw in description_lower:
                    return category
    return None


# --- FUNÇÃO DE IMPORTAÇÃO (VERSÃO FINAL) ---
def process_import_file(db: Session, file_content: bytes, file_name: str):
    try:
        if file_name.endswith(".xlsx"):
            df = pd.read_excel(BytesIO(file_content))
        else:
            df = pd.read_csv(BytesIO(file_content))
    except Exception as e:
        raise ValueError(f"Erro ao ler o arquivo> {e}")

    column_mapping = {
        "data": "date",
        "descrição": "description",
        "descricao": "description",
        "valor": "value",
        "tipo": "type",
        "conta": "account",
        "categoria": "category_name",
    }

    df.columns = (
        df.columns.str.lower()
        .str.normalize("NFKD")
        .str.encode("ascii", errors="ignore")
        .str.decode("utf-8")
    )
    df = df.rename(columns=column_mapping)

    required_cols = ["date", "description", "value", "type"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError(
            f"O arquivo está faltando colunas obrigatórias. Precisa de: {required_cols}"
        )

    transactions_added = 0
    transactions_skipped = 0

    for _, row in df.iterrows():
        # Bloco Try/Except para pular linhas com dados inválidos
        try:
            # 1. Limpar Data
            parsed_date = pd.to_datetime(row["date"], dayfirst=True).date()

            # 2. Limpar Valor (R$, ,, .)
            value_str = str(row["value"]).strip()
            value_str = value_str.replace("R$", "").replace(".", "").replace(",", ".")
            parsed_value = float(value_str)

            # 3. Limpar Descrição
            parsed_description = str(row["description"]).strip()

            # 4. Limpar Tipo
            parsed_type = str(row["type"]).lower().strip()

        except Exception as e:
            print(f"Skipping row due to invalid data: {e}")
            continue  # Pula esta linha do loop

        # --- LÓGICA ANTI-DUPLICAÇÃO ---
        existing_tx = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.date == parsed_date,
                models.Transaction.description == parsed_description,
                models.Transaction.value == parsed_value,
                models.Transaction.type == parsed_type,
            )
            .first()
        )

        if existing_tx:
            transactions_skipped += 1
            continue  # Pula a linha, transação já existe

        # --- FIM DA LÓGICA ANTI-DUPLICAÇÃO ---

        # Encontra a Categoria (Auto-Tagging)
        category_obj = None
        if "category_name" in row and pd.notna(row["category_name"]):
            category_obj = get_category_by_name(db, name=row["category_name"])
        if not category_obj:
            category_obj = find_category_by_keyword(db, parsed_description)

        db_transaction = models.Transaction(
            date=parsed_date,
            description=parsed_description,
            value=parsed_value,
            type=parsed_type,
            account=row.get("account"),
            category_id=category_obj.id if category_obj else None,
        )
        db.add(db_transaction)  # Adiciona à sessão
        transactions_added += 1

    # --- LÓGICA DO COMMIT ÚNICO ---
    try:
        # Adiciona o Log
        log_entry = models.ImportLog(
            file_name=file_name, rows_imported=transactions_added
        )
        db.add(log_entry)

        # Agora sim, salva TUDO (Transações + Log) de uma vez
        db.commit()

    except Exception as e:
        db.rollback()  # Desfaz tudo se o Log falhar
        raise ValueError(f"Erro ao salvar no banco (log): {e}")
    # --- FIM DO COMMIT ÚNICO ---

    return {
        "file_name": file_name,
        "rows_imported": transactions_added,
        "rows_skipped": transactions_skipped,
    }


def get_dashboard_kpis(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    query = db.query(
        models.Transaction.type, func.sum(models.Transaction.value).label("total")
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    results = query.group_by(models.Transaction.type).all()

    kpis = {"total_income": 0.0, "total_expense": 0.0, "total_investment": 0.0}

    for r in results:
        if r.type == "income":
            kpis["total_income"] = r.total or 0.0
        elif r.type == "expense":
            kpis["total_expense"] = r.total or 0.0
        elif r.type == "investment":
            kpis["total_investment"] = r.total or 0.0

    kpis["balance"] = kpis["total_income"] - kpis["total_expense"]

    return schemas.DashboardKPIs(**kpis)


def get_expenses_by_category(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):

    query = (
        db.query(
            models.Category.name,
            func.sum(models.Transaction.value).label("total_value"),
        )
        .select_from(models.Transaction)
        .join(
            models.Category,
            models.Transaction.category_id == models.Category.id,
            isouter=True,
        )
        .filter(models.Transaction.type == "expense")
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    results = query.group_by(models.Category.name).all()

    chart_data = []
    for r in results:
        chart_data.append(
            schemas.CategoryExpense(
                name=r.name if r.name else "Sem Categoria", value=r.total_value or 0.0
            )
        )
    return chart_data


def get_balance_over_time(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):

    # Subquery para Income
    income_sub = (
        db.query(
            models.Transaction.date,
            func.sum(models.Transaction.value).label("total_income"),
        )
        .filter(models.Transaction.type == "income")
        .group_by(models.Transaction.date)
        .subquery()
    )

    # Subquery para Expense
    expense_sub = (
        db.query(
            models.Transaction.date,
            func.sum(models.Transaction.value).label("total_expense"),
        )
        .filter(models.Transaction.type == "expense")
        .group_by(models.Transaction.date)
        .subquery()
    )

    # Query principal
    query = (
        db.query(
            models.Transaction.date,
            func.coalesce(income_sub.c.total_income, 0).label("income"),
            func.coalesce(expense_sub.c.total_expense, 0).label("expense"),
        )
        .outerjoin(income_sub, models.Transaction.date == income_sub.c.date)
        .outerjoin(expense_sub, models.Transaction.date == expense_sub.c.date)
    )

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)

    # Agrupa por data e ordena
    daily_summary = (
        query.group_by(models.Transaction.date).order_by(models.Transaction.date).all()
    )

    # Calcular o Saldo Acumulado
    chart_data = []
    running_balance = 0.0

    for day in daily_summary:
        daily_net = day.income - day.expense
        running_balance += daily_net

        chart_data.append(
            schemas.BalanceOverTimePoint(
                date=day.date.isoformat(),
                income=day.income,
                expense=day.expense,
                balance=running_balance,
            )
        )

    return chart_data

    # --- ADICIONE ESTA NOVA FUNÇÃO ---


def create_quick_entry(db: Session, entry: schemas.QuickEntryCreate):
    """
    Salva uma nova transação (entrada rápida) vinda do pop-up.
    """

    # 1. Pega a data de HOJE
    parsed_date = date.today()

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
        date=parsed_date,
        description=entry.description.strip(),
        value=entry.value,
        type=parsed_type,
        account=None,  # Pop-up não pergunta a conta (ainda)
        category_id=category_obj.id if category_obj else None,
    )

    # 5. Salva no banco
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction
