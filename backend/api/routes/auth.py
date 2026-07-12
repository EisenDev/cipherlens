import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.session import get_db
from database.models import User, RefreshToken
from schemas.schemas import UserSignup, UserLogin, TokenResponse, RefreshTokenInput, UserResponse, UserProfileUpdate, UserPasswordUpdate
from core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

@router.post("/signup", response_model=TokenResponse)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
        
    # Create new user
    hashed_pwd = get_password_hash(payload.password)
    user = User(
        fullName=payload.fullName,
        email=payload.email.lower(),
        passwordHash=hashed_pwd,
        companyName=payload.companyName,
        teamSize=payload.teamSize,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)


    # Generate JWT Tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Store refresh token hash
    token_hash = hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db_refresh_token = RefreshToken(
        tokenHash=token_hash,
        userId=user.id,
        expiresAt=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": user
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Generate JWT Tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Store refresh token hash
    token_hash = hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db_refresh_token = RefreshToken(
        tokenHash=token_hash,
        userId=user.id,
        expiresAt=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": user
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshTokenInput, db: Session = Depends(get_db)):
    token_payload = verify_refresh_token(payload.refreshToken)
    if not token_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )
        
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    # Check if this token exists and is valid in database
    token_hash = hash_token(payload.refreshToken)
    db_token = db.query(RefreshToken).filter(RefreshToken.tokenHash == token_hash).first()
    if not db_token or db_token.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token."
        )

    # Delete old token (refresh token rotation)
    db.delete(db_token)
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Save new refresh token
    new_hash = hash_token(new_refresh_token)
    new_expiry = datetime.now(timezone.utc) + timedelta(days=7)
    new_db_token = RefreshToken(
        tokenHash=new_hash,
        userId=user.id,
        expiresAt=new_expiry
    )
    db.add(new_db_token)
    db.commit()

    return {
        "accessToken": access_token,
        "refreshToken": new_refresh_token,
        "user": user
    }

@router.post("/logout")
def logout(payload: RefreshTokenInput, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.refreshToken)
    db_token = db.query(RefreshToken).filter(RefreshToken.tokenHash == token_hash).first()
    if db_token:
        db.delete(db_token)
        db.commit()
    return {"success": True, "message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.fullName is not None:
        current_user.fullName = payload.fullName
    if payload.companyName is not None:
        current_user.companyName = payload.companyName
    if payload.role is not None:
        current_user.role = payload.role
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/password")
def update_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.currentPassword, current_user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )
    current_user.passwordHash = get_password_hash(payload.newPassword)
    db.commit()
    return {"success": True, "message": "Password updated successfully."}
