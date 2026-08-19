import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database.session import get_db
from database.models import User, ScanSchedule
from api.deps import get_current_user
from schemas.schemas import ScanScheduleCreate, ScanSchedulePatch, ScanScheduleResponse

router = APIRouter(prefix="/schedules", tags=["Schedules"])

@router.get("", response_model=List[ScanScheduleResponse])
def get_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ScanSchedule).filter(ScanSchedule.userId == current_user.id).order_by(ScanSchedule.createdAt.desc()).all()

@router.post("", response_model=ScanScheduleResponse, status_code=201)
def create_schedule(
    payload: ScanScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Construct advanced config dict
    adv_config = {
        "crawling": payload.crawling or {},
        "auth": payload.auth or {},
        "proxy": payload.proxy or {},
        "performance": payload.performance or {},
        "exclusions": payload.exclusions or {},
        "headers": payload.headers or []
    }
    
    schedule = ScanSchedule(
        name=payload.name,
        targetUrl=payload.targetUrl,
        targetType=payload.targetType,
        scanType=payload.scanType,
        selectedModules=json.dumps(payload.modules or []),
        advancedConfig=json.dumps(adv_config),
        frequency=payload.frequency,
        cronExpression=payload.cronExpression,
        startDate=payload.startDate,
        startTime=payload.startTime,
        timezone=payload.timezone,
        isActive=payload.isActive,
        userId=current_user.id
    )
    
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule

@router.patch("/{id}", response_model=ScanScheduleResponse)
def update_schedule(
    id: str,
    payload: ScanSchedulePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(ScanSchedule).filter(ScanSchedule.id == id, ScanSchedule.userId == current_user.id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Scan schedule not found.")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(schedule, key, val)
        
    db.commit()
    db.refresh(schedule)
    return schedule

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(ScanSchedule).filter(ScanSchedule.id == id, ScanSchedule.userId == current_user.id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Scan schedule not found.")
        
    db.delete(schedule)
    db.commit()
    return None
