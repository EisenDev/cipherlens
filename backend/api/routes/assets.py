from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database.session import get_db
from database.models import User, Asset
from api.deps import get_current_user
from schemas.schemas import AssetCreate, AssetResponse

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("", response_model=List[AssetResponse])
def get_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assets = db.query(Asset).filter(Asset.userId == current_user.id).all()
    return assets

@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if duplicate url
    existing = db.query(Asset).filter(
        Asset.url == payload.url,
        Asset.userId == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset with this URL already exists."
        )
        
    asset = Asset(
        name=payload.name,
        url=payload.url,
        type=payload.type.upper(),
        userId=current_user.id
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return asset
