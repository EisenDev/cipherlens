from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json
import logging

from database.session import get_db
from database.models import User, Ticket, ScanResult, AuditLog, Asset, Scan
from api.deps import get_current_user

logger = logging.getLogger("cipherlens.api.tickets")

router = APIRouter(prefix="/tickets", tags=["Tickets Workspace"])

def log_audit_action(db: Session, user_id: str, action: str, finding_ids: List[str], metadata_dict: Dict[str, Any]):
    try:
        log_entry = AuditLog(
            userId=user_id,
            action=action,
            findingIds=json.dumps(finding_ids),
            actionMetadata=json.dumps(metadata_dict)
        )
        db.add(log_entry)
        db.flush()
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")

@router.post("", status_code=201)
def create_ticket(
    title: str = Body(...),
    description: str = Body(...),
    priority: str = Body("MEDIUM"),
    severity: str = Body("MEDIUM"),
    assignee: Optional[str] = Body(None),
    dueDate: Optional[str] = Body(None),
    status_val: str = Body("Open", alias="status"),
    tags: Optional[List[str]] = Body(None),
    scanId: Optional[str] = Body(None),
    assetId: Optional[str] = Body(None),
    evidence: Optional[str] = Body(None),
    scanner: Optional[str] = Body(None),
    findingKeys: List[Dict[str, str]] = Body([]), # list of { findingCode, assetId }
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify RBAC or check if user is active
    if not current_user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user cannot create tickets."
        )

    # Convert dueDate string to datetime if provided
    due_date_dt = None
    if dueDate:
        try:
            due_date_dt = datetime.fromisoformat(dueDate.replace("Z", "+00:00"))
        except ValueError:
            pass

    tags_str = ",".join(tags) if tags else None

    # Create Ticket instance
    ticket = Ticket(
        title=title,
        description=description,
        priority=priority,
        severity=severity,
        assignee=assignee,
        dueDate=due_date_dt,
        status=status_val,
        tags=tags_str,
        scanId=scanId,
        assetId=assetId,
        evidence=evidence,
        scanner=scanner
    )

    db.add(ticket)
    db.flush() # generate ticket ID before updating findings

    affected_findings = []
    # Link findings to the ticket
    for key in findingKeys:
        code = key.get("findingCode")
        aid = key.get("assetId")
        if not code or not aid:
            continue

        # Check ownership of target asset
        asset = db.query(Asset).filter(Asset.id == aid, Asset.userId == current_user.id).first()
        if not asset:
            continue

        scans_subquery = db.query(Scan.id).filter(Scan.assetId == aid).subquery()
        results = db.query(ScanResult).filter(
            ScanResult.scanId.in_(scans_subquery),
            ScanResult.findingCode == code,
            ScanResult.isDeleted == False
        ).all()

        for r in results:
            r.ticketId = ticket.id
            affected_findings.append(r.id)

    # Audit Logging
    meta = {
        "title": title,
        "priority": priority,
        "severity": severity,
        "assignee": assignee,
        "dueDate": dueDate,
        "status": status_val,
        "tags": tags,
        "affectedCount": len(affected_findings)
    }
    log_audit_action(db, current_user.id, "ticket_creation", affected_findings, meta)

    db.commit()
    db.refresh(ticket)

    # Format response
    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "priority": ticket.priority,
        "severity": ticket.severity,
        "assignee": ticket.assignee,
        "dueDate": ticket.dueDate.isoformat() if ticket.dueDate else None,
        "status": ticket.status,
        "tags": tags,
        "scanId": ticket.scanId,
        "assetId": ticket.assetId,
        "evidence": ticket.evidence,
        "scanner": ticket.scanner,
        "linkedFindingIds": affected_findings,
        "createdAt": ticket.createdAt.isoformat(),
        "updatedAt": ticket.updatedAt.isoformat()
    }

@router.get("/{ticket_id}")
def get_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found."
        )

    # Check access permission: verify if associated findings belong to the user's assets
    if ticket.assetId:
        asset = db.query(Asset).filter(Asset.id == ticket.assetId, Asset.userId == current_user.id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to ticket asset."
            )

    linked_findings = [r.id for r in ticket.results]
    
    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "priority": ticket.priority,
        "severity": ticket.severity,
        "assignee": ticket.assignee,
        "dueDate": ticket.dueDate.isoformat() if ticket.dueDate else None,
        "status": ticket.status,
        "tags": ticket.tags.split(",") if ticket.tags else [],
        "scanId": ticket.scanId,
        "assetId": ticket.assetId,
        "evidence": ticket.evidence,
        "scanner": ticket.scanner,
        "linkedFindingIds": linked_findings,
        "createdAt": ticket.createdAt.isoformat(),
        "updatedAt": ticket.updatedAt.isoformat()
    }
