import pandas as pd
from sqlalchemy.orm import Session
from io import BytesIO
from .. import models
from .category import get_category_by_name, find_category_by_keyword

def process_import_file(db: Session, file_content: bytes, file_name: str):
    try:
        if file_name.endswith(".xlsx"):
            df = pd.read_excel(BytesIO(file_content))
        else:
            df = pd.read_csv(BytesIO(file_content))
    except Exception as e:
        raise ValueError(f"Erro ao ler o arquivo> {e}")

    column_mapping = {
        "data": "date", "descrição": "description", "descricao": "description",
        "valor": "value", "tipo": "type", "conta": "account", "categoria": "category_name",
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
        try:
            parsed_date = pd.to_datetime(row["date"], dayfirst=True).date()
            value_str = str(row["value"]).strip().replace("R$", "").replace(".", "").replace(",", ".")
            parsed_value = float(value_str)
            parsed_description = str(row["description"]).strip()
            parsed_type = str(row["type"]).lower().strip()
        except Exception as e:
            print(f"Skipping row due to invalid data: {e}")
            continue

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
            continue

        category_obj = None
        if "category_name" in row and pd.notna(row["category_name"]):
            category_obj = get_category_by_name(db, name=row["category_name"])
        if not category_obj:
            category_obj = find_category_by_keyword(db, parsed_description)

        db_transaction = models.Transaction(
            date=parsed_date, description=parsed_description,
            value=parsed_value, type=parsed_type,
            account=row.get("account"),
            category_id=category_obj.id if category_obj else None,
        )
        db.add(db_transaction)
        transactions_added += 1

    try:
        log_entry = models.ImportLog(
            file_name=file_name, rows_imported=transactions_added
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValueError(f"Erro ao salvar no banco (log): {e}")

    return {
        "file_name": file_name,
        "rows_imported": transactions_added,
        "rows_skipped": transactions_skipped,
    }