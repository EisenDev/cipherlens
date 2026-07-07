from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_db
from database.models import User, Scan, Asset
from api.deps import get_current_user
from schemas.schemas import StatisticsSummary

router = APIRouter(tags=["Statistics"])

@router.get("/statistics", response_model=StatisticsSummary)
@router.get("/dashboard/scan-summary", response_model=StatisticsSummary)
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Query scans associated with assets owned by the current user
    base_query = db.query(Scan).join(Asset).filter(Asset.userId == current_user.id)
    
    total = base_query.count()
    completed = base_query.filter(Scan.status == "COMPLETED").count()
    running = base_query.filter(Scan.status == "RUNNING").count()
    queued = base_query.filter(Scan.status == "QUEUED").count()
    failed = base_query.filter(Scan.status == "FAILED").count()
    
    return {
        "total": total,
        "completed": completed,
        "running": running,
        "queued": queued,
        "failed": failed
    }
