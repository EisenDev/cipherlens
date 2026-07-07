from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.session import get_db
from database.models import User, ScanModule, Scan, Asset
from api.deps import get_current_user
from schemas.schemas import ScanModuleResponse

router = APIRouter(prefix="/modules", tags=["Modules"])

@router.get("", response_model=List[ScanModuleResponse])
def get_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    modules = db.query(ScanModule).join(Scan).join(Asset).filter(Asset.userId == current_user.id).all()
    return modules
