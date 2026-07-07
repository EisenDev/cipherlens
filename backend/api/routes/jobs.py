from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.session import get_db
from database.models import User, ScanJob, Scan, Asset
from api.deps import get_current_user
from schemas.schemas import ScanJobResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("", response_model=List[ScanJobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    jobs = db.query(ScanJob).join(Scan).join(Asset).filter(Asset.userId == current_user.id).all()
    return jobs
