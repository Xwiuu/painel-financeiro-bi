# backend/crud.py

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from datetime import date, timedelta, datetime
from typing import Optional
from fastapi import HTTPException  # <-- 1. CORREÇÃO: ADICIONA A IMPORTAÇÃO
import models, schemas
from io import BytesIO
import re


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


# --- FUNÇÃO AUXILIAR 1 ---
def _get_kpis_for_period(
    db: Session, start_date: Optional[date], end_date: Optional[date]
):
    """Função interna para buscar os KPIs de um período específico."""
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
    return kpis


# --- FUNÇÃO AUXILIAR 2 ---
def _calculate_percentage_change(current: float, previous: float) -> float:
    """Calcula a mudança percentual, tratando a divisão por zero."""
    if previous == 0:
        return 0.0  # Não podemos dividir por zero
    if current == 0 and previous == 0:
        return 0.0

    return round(((current - previous) / previous) * 100, 2)


# --- FUNÇÃO PRINCIPAL (ATUALIZADA) ---
def get_dashboard_kpis(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    """
    Busca KPIs do período atual e calcula a variação percentual
    em relação ao período anterior.
    """

    # 1. Calcula os KPIs do período ATUAL
    current_kpis = _get_kpis_for_period(db, start_date, end_date)

    # 2. Calcula os KPIs do período ANTERIOR (só se houver um filtro de data)
    previous_kpis = {
        "total_income": 0.0,
        "total_expense": 0.0,
        "total_investment": 0.0,
        "balance": 0.0,
    }

    if start_date and end_date:
        try:
            # Calcula a duração do período selecionado
            period_duration = end_date - start_date

            # Calcula as datas do período anterior
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - period_duration

            # Busca os dados do período anterior
            previous_kpis = _get_kpis_for_period(db, prev_start_date, prev_end_date)

        except Exception as e:
            print(f"Erro ao calcular período anterior: {e}")
            # Se der erro, os kpis anteriores continuam 0.0

    # 3. Calcula as porcentagens de mudança
    change_percentages = {
        "income_change_percentage": _calculate_percentage_change(
            current_kpis["total_income"], previous_kpis["total_income"]
        ),
        "expense_change_percentage": _calculate_percentage_change(
            current_kpis["total_expense"], previous_kpis["total_expense"]
        ),
        "investment_change_percentage": _calculate_percentage_change(
            current_kpis["total_investment"], previous_kpis["total_investment"]
        ),
        "balance_change_percentage": _calculate_percentage_change(
            current_kpis["balance"], previous_kpis["balance"]
        ),
    }

    # 4. Retorna o schema completo
    return schemas.DashboardKPIs(**current_kpis, **change_percentages)


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
    if transaction_data.description is not None:
        db_transaction.description = transaction_data.description
    if transaction_data.value is not None:
        db_transaction.value = transaction_data.value
    if transaction_data.type is not None:
        db_transaction.type = transaction_data.type
    if transaction_data.date is not None:
        db_transaction.date = transaction_data.date

    # 3. Salva
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


# --- CRUD DE METAS (GOALS) ---


def get_goals_page_data(db: Session, filter_type: Optional[str] = None):
    """
    Calcula o progresso de todas as metas e o sumário.
    """

    # 1. Pega todas as metas, já com o nome da categoria
    query = db.query(
        models.Goal, models.Category.name.label("category_name")
    ).outerjoin(models.Category, models.Goal.category_id == models.Category.id)

    # Filtra por tipo (Mensais, Longo Prazo, etc.)
    if filter_type == "monthly":
        query = query.filter(models.Goal.period == "monthly")
    elif filter_type == "deadline":
        query = query.filter(models.Goal.period == "deadline")

    all_goals = query.order_by(models.Goal.id).all()

    # 2. Pega a data de hoje e o primeiro dia do mês
    today = date.today()
    first_day_of_month = today.replace(day=1)

    # Variáveis para o sumário
    summary = {
        "total_saved_current": 0.0,
        "total_saved_target": 0.0,
        "total_limit_spent": 0.0,
        "total_limit_target": 0.0,
        "saving_goals_count": 0,
        "limit_goals_count": 0,
    }

    processed_goals = []

    # 3. Itera em cada meta para calcular o progresso
    for goal_tuple in all_goals:
        goal: models.Goal = goal_tuple[0]
        category_name: str = goal_tuple[1]

        progress_value = 0.0

        if goal.type == "saving":
            # --- LÓGICA DE META DE POUPANÇA ---
            # O progresso é o 'current_amount' salvo no banco
            progress_value = goal.current_amount

            # Adiciona ao sumário
            summary["total_saved_current"] += goal.current_amount
            summary["total_saved_target"] += goal.target_amount
            summary["saving_goals_count"] += 1

        elif goal.type == "limit":
            # --- LÓGICA DE META DE LIMITE (GASTO) ---
            progress_value = 0.0
            if goal.category_id:
                # Se for mensal, busca gastos do mês atual
                q_start_date = first_day_of_month if goal.period == "monthly" else None
                q_end_date = today if goal.period == "monthly" else None

                # Soma todas as despesas ('expense') daquela categoria
                q = db.query(func.sum(models.Transaction.value)).filter(
                    models.Transaction.type == "expense",
                    models.Transaction.category_id == goal.category_id,
                )
                if q_start_date:
                    q = q.filter(models.Transaction.date >= q_start_date)
                if q_end_date:
                    q = q.filter(models.Transaction.date <= q_end_date)

                spent = q.scalar() or 0.0
                progress_value = spent

            # Adiciona ao sumário (apenas se for mensal)
            if goal.period == "monthly":
                summary["total_limit_spent"] += progress_value
                summary["total_limit_target"] += goal.target_amount
                summary["limit_goals_count"] += 1

        # Calcula a porcentagem
        percentage = 0.0
        if goal.target_amount > 0:
            percentage = (progress_value / goal.target_amount) * 100

        # Adiciona à lista final
        processed_goals.append(
            schemas.Goal(
                id=goal.id,
                name=goal.name,
                type=goal.type,
                target_amount=goal.target_amount,
                current_amount=goal.current_amount,
                period=goal.period,
                deadline=goal.deadline,
                category_id=goal.category_id,
                category_name=category_name or (goal.type.capitalize()),
                progress_value=progress_value,
                progress_percentage=percentage,
            )
        )

    # 4. Finaliza o sumário
    summary["active_goals_count"] = len(processed_goals)

    return {"summary": summary, "goals": processed_goals}


def create_goal(db: Session, goal_data: schemas.GoalCreate):
    """
    Cria uma nova meta no banco de dados.
    """

    # Verifica se a categoria existe
    category_id = None
    if goal_data.category_id:
        category = (
            db.query(models.Category)
            .filter(models.Category.id == goal_data.category_id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        category_id = category.id

    db_goal = models.Goal(
        name=goal_data.name,
        type=goal_data.type,
        target_amount=goal_data.target_amount,
        current_amount=goal_data.current_amount or 0.0,
        period=goal_data.period,
        deadline=goal_data.deadline,
        category_id=category_id,
    )

    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal


def update_goal(db: Session, goal_id: int, goal_data: schemas.GoalCreate):
    """
    Atualiza uma meta existente.
    """
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    # Verifica a categoria
    category_id = db_goal.category_id  # Mantém a original por padrão
    if goal_data.category_id:
        category = (
            db.query(models.Category)
            .filter(models.Category.id == goal_data.category_id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        category_id = category.id

    # Atualiza os dados
    db_goal.name = goal_data.name
    db_goal.type = goal_data.type
    db_goal.target_amount = goal_data.target_amount
    db_goal.current_amount = goal_data.current_amount or db_goal.current_amount
    db_goal.period = goal_data.period
    db_goal.deadline = goal_data.deadline
    db_goal.category_id = category_id

    db.commit()
    db.refresh(db_goal)
    return db_goal


def delete_goal(db: Session, goal_id: int):
    """
    Apaga uma meta pelo ID.
    """
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    db.delete(db_goal)
    db.commit()
    return {"ok": True}


def get_report_expenses_by_category(
    db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
):
    """
    Busca dados para o relatório de despesas por categoria.
    (Similar ao gráfico da Home, mas podemos expandir no futuro)
    """

    # Esta é a mesma lógica do 'get_expenses_by_category'
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

    results = (
        query.group_by(models.Category.name)
        .order_by(
            func.sum(models.Transaction.value).desc()
        )  # Ordena do maior para o menor
        .all()
    )

    chart_data = []
    for r in results:
        chart_data.append(
            schemas.CategoryExpense(
                name=r.name if r.name else "Sem Categoria", value=r.total_value or 0.0
            )
        )
    return chart_data


# --- ADICIONE ESTAS DUAS FUNÇÕES ---


def get_category_by_id(db: Session, category_id: int):
    """
    Função auxiliar para buscar uma categoria pelo seu ID.
    """
    return db.query(models.Category).filter(models.Category.id == category_id).first()


def delete_category(db: Session, category_id: int):
    """
    Deleta uma categoria do banco de dados.
    """
    # 1. Encontra a categoria
    db_category = get_category_by_id(db, category_id=category_id)

    if db_category is None:
        return None  # Retorna 'None' se não achar

    # 2. Deleta do banco
    db.delete(db_category)
    db.commit()

    return db_category  # Retorna o item que foi deletado


# ... (depois de 'def delete_category(...) ...')


# --- FUNÇÃO PARA O BADGE DE "NÃO CATEGORIZADOS" ---
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
