from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database.session import get_db
from database.models import User
from api.deps import get_current_user
from core.security import get_password_hash
from schemas.schemas import TeamMemberInvite, TeamMemberPatch, TeamMemberResponse

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.get("", response_model=List[TeamMemberResponse])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.companyName:
        return [current_user]
    return db.query(User).filter(User.companyName == current_user.companyName).order_by(User.fullName.asc()).all()

@router.post("/invite", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    payload: TeamMemberInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.companyName:
        raise HTTPException(
            status_code=400,
            detail="You must belong to a company/organization before inviting team members."
        )
        
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists in the system."
        )
        
    default_pw_hash = get_password_hash("CipherLensTeamMember123!")
    new_user = User(
        fullName=payload.fullName,
        email=payload.email,
        passwordHash=default_pw_hash,
        companyName=current_user.companyName,
        role=payload.role,
        isActive=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/{id}", response_model=TeamMemberResponse)
def update_team_member(
    id: str,
    payload: TeamMemberPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.companyName:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    member = db.query(User).filter(User.id == id, User.companyName == current_user.companyName).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(member, key, val)
        
    db.commit()
    db.refresh(member)
    return member

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_member(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.companyName:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    if id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself from the team.")
        
    member = db.query(User).filter(User.id == id, User.companyName == current_user.companyName).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")
        
    db.delete(member)
    db.commit()
    return
