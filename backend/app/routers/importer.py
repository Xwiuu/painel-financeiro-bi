from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from .. import crud
from ..database import get_db

router = APIRouter(
    prefix="/api/import",
    tags=["Import"],
)

@router.post("/")
async def import_transactions_file(
    db: Session = Depends(get_db), file: UploadFile = File(...)
):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx")):
        raise HTTPException(
            status_code=400, detail="Apenas arquivos .csv ou .xlsx são suportados"
        )
    
    file_content = await file.read()

    try:
        result = crud.process_import_file(
            db=db, file_content=file_content, file_name=file.filename
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")