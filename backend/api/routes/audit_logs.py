from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional, Dict, Any
import json

from database.session import get_db
from database.models import User, AuditLog
from api.deps import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify user is active
    if not current_user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user accounts cannot view audit logs."
        )

    # Base query joining AuditLog and User to retrieve email/name of actor
    # For privacy and isolation in SaaS multi-tenant scope, users only view their own action logs
    # unless they are an admin or we want full logs of the organization.
    # Since companyName or teams might exist, let's filter by current_user.id for simplicity/security,
    # or if there is team/org scope we can query that. But current_user.id is safest default.
    query = db.query(AuditLog, User.email, User.fullName).join(
        User, AuditLog.userId == User.id
    ).filter(AuditLog.userId == current_user.id)

    if action:
        query = query.filter(AuditLog.action == action)

    if search:
        search_filter = or_(
            AuditLog.action.ilike(f"%{search}%"),
            AuditLog.findingIds.ilike(f"%{search}%"),
            AuditLog.actionMetadata.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.fullName.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    total = query.count()
    
    # Paginate and order by newest first
    results = query.order_by(desc(AuditLog.timestamp)).offset((page - 1) * limit).limit(limit).all()

    logs = []
    for audit_log, email, full_name in results:
        # Safely parse JSON strings
        try:
            finding_ids_parsed = json.loads(audit_log.findingIds) if audit_log.findingIds else []
        except Exception:
            finding_ids_parsed = audit_log.findingIds.split(",") if audit_log.findingIds else []

        try:
            action_metadata_parsed = json.loads(audit_log.actionMetadata) if audit_log.actionMetadata else {}
        except Exception:
            action_metadata_parsed = {"raw": audit_log.actionMetadata} if audit_log.actionMetadata else {}

        logs.append({
            "id": audit_log.id,
            "userId": audit_log.userId,
            "userEmail": email,
            "userFullName": full_name,
            "action": audit_log.action,
            "timestamp": audit_log.timestamp.isoformat() if audit_log.timestamp else None,
            "findingIds": finding_ids_parsed,
            "actionMetadata": action_metadata_parsed,
            "createdAt": audit_log.createdAt.isoformat() if audit_log.createdAt else None
        })

    last_page = (total + limit - 1) // limit

    return {
        "data": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "last_page": last_page
    }
