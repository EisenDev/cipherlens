import json
import os
import re
import sys
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional, List, Dict, Any
from database.session import get_db
from database.models import User, Asset, Scan, ScanJob, ScanModule, ScanLog, ScanResult
from api.deps import get_current_user
from schemas.schemas import ScanCreate, ScanResponse, PaginatedScans, ScanPatch, ScanProgressResponse, ScanLogsResponse, ModuleProgressSchema, ScanLogItemSchema, ScanResultsResponseSchema
from services.ai import AIService

# Dynamically append scanner framework path to sys.path
SCANNER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scanner"))
if SCANNER_PATH not in sys.path:
    sys.path.insert(0, SCANNER_PATH)

try:
    from registry import scanner_registry
except ImportError:
    # Fallback registry stub if run outside typical directory layouts
    scanner_registry = None

router = APIRouter(prefix="/scans", tags=["Scans"])

@router.get("", response_model=PaginatedScans)
def get_scans(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    status: Optional[str] = None,
    scan_type: Optional[str] = None,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Query scans linked to assets owned by current user
    query = db.query(Scan).join(Asset).filter(Asset.userId == current_user.id)
    
    # Filter by status (case insensitive comparison)
    if status:
        query = query.filter(Scan.status == status.upper())
        
    # Filter by scan type
    if scan_type:
        query = query.filter(Scan.scanType == scan_type.upper())
        
    # Filter by asset type (website, repository)
    if asset_type:
        query = query.filter(Asset.type == asset_type.upper())
        
    # Search query
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Asset.name.ilike(search_filter),
                Asset.url.ilike(search_filter),
                Scan.scanName.ilike(search_filter),
                Scan.scanTags.ilike(search_filter)
            )
        )
        
    # Sort scans by creation date descending (newest first)
    query = query.order_by(desc(Scan.createdAt))
    
    # Pagination
    total = query.count()
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()
    
    # Map model instances to Pydantic responses
    scan_responses = []
    for scan in results:
        scan_responses.append(
            ScanResponse(
                id=scan.id,
                status=scan.status,
                scanType=scan.scanType,
                score=scan.score,
                duration=scan.duration,
                createdAt=scan.createdAt,
                target={
                    "name": scan.asset.name,
                    "url": scan.asset.url,
                    "type": scan.asset.type
                }
            )
        )
        
    last_page = max(1, (total + limit - 1) // limit)
    
    return {
        "data": scan_responses,
        "total": total,
        "page": page,
        "limit": limit,
        "last_page": last_page
    }

@router.get("/{id}", response_model=ScanResponse)
def get_scan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    return ScanResponse(
        id=scan.id,
        status=scan.status,
        scanType=scan.scanType,
        score=scan.score,
        duration=scan.duration,
        createdAt=scan.createdAt,
        target={
            "name": scan.asset.name,
            "url": scan.asset.url,
            "type": scan.asset.type
        }
    )

@router.post("", response_model=ScanResponse, status_code=201)
def create_scan(
    payload: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Input & Format Validation ──────────────────────────────────────────
    asset_url = payload.targetUrl.strip()
    asset_type = payload.targetType.upper()
    
    # 1. Target URL Validations
    if asset_type == "WEBSITE":
        domain_regex = re.compile(
            r'^(?:http|https)://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP address
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        if not domain_regex.match(asset_url):
            raise HTTPException(
                status_code=400,
                detail="Invalid website target URL. Must start with http:// or https:// and be a valid domain or IP address."
            )
    elif asset_type == "REPOSITORY":
        repo_regex = re.compile(r'^(?:https://github\.com/|git@github\.com:)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$')
        if not repo_regex.match(asset_url):
            raise HTTPException(
                status_code=400,
                detail="Invalid GitHub repository URL. Must match standard repository layout (e.g. https://github.com/owner/repo)."
            )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported target type: {asset_type}")

    # 2. Authentication Parameters Validation
    if payload.auth:
        auth_type = payload.auth.get("type", "None")
        if auth_type == "Form Login":
            if not payload.auth.get("loginUrl") or not payload.auth.get("loginUrl").strip():
                raise HTTPException(status_code=400, detail="Login URL is required for Form Login auth.")
            if not payload.auth.get("username") or not payload.auth.get("username").strip():
                raise HTTPException(status_code=400, detail="Username is required for Form Login auth.")
            if not payload.auth.get("password") or not payload.auth.get("password").strip():
                raise HTTPException(status_code=400, detail="Password is required for Form Login auth.")
        elif auth_type == "Bearer Token":
            if not payload.auth.get("bearerToken") or not payload.auth.get("bearerToken").strip():
                raise HTTPException(status_code=400, detail="Bearer Token is required when token auth is selected.")
        elif auth_type == "API Key":
            if not payload.auth.get("apiKey") or not payload.auth.get("apiKey").strip():
                raise HTTPException(status_code=400, detail="API Key is required when API key auth is selected.")

    # 3. Proxy Parameters Validation
    if payload.proxy and payload.proxy.get("useProxy"):
        proxy_url = payload.proxy.get("url", "")
        if not proxy_url or not proxy_url.strip():
            raise HTTPException(status_code=400, detail="Proxy URL is required when proxy is enabled.")

    # 4. Performance Settings Ranges Validation
    if payload.performance:
        timeout = payload.performance.get("timeout")
        if timeout is not None and (timeout < 5 or timeout > 300):
            raise HTTPException(status_code=400, detail="Performance request timeout must be between 5 and 300 seconds.")
        max_concurrent = payload.performance.get("maxConcurrent")
        if max_concurrent is not None and (max_concurrent < 1 or max_concurrent > 50):
            raise HTTPException(status_code=400, detail="Maximum concurrent requests must be between 1 and 50.")
        rps_limit = payload.performance.get("rpsLimit")
        if rps_limit is not None and (rps_limit < 1 or rps_limit > 1000):
            raise HTTPException(status_code=400, detail="RPS limit must be between 1 and 1000.")

    # 5. Header List Format Validation
    if payload.headers:
        for hdr in payload.headers:
            if not isinstance(hdr, dict) or "name" not in hdr or "value" not in hdr:
                raise HTTPException(status_code=400, detail="Each custom header must contain name and value properties.")
            if not hdr["name"].strip():
                raise HTTPException(status_code=400, detail="Custom header name cannot be empty.")

    # ── Database Persistence ───────────────────────────────────────────────
    # Generate unique Job ID
    import uuid
    job_id = str(uuid.uuid4())

    # 1. Create the Asset (if it doesn't already exist)
    asset = db.query(Asset).filter(
        Asset.url == asset_url,
        Asset.userId == current_user.id
    ).first()
    
    if not asset:
        name = asset_url.replace("https://", "").replace("http://", "").split("/")[0]
        asset = Asset(
            name=name or asset_url,
            url=asset_url,
            type=asset_type,
            userId=current_user.id
        )
        db.add(asset)
        db.flush()
        
    # 2. Create the Scan record (status initially QUEUED)
    scan_name = payload.scanName or f"{asset.name} - {payload.scanType.replace('_', ' ').title()}"
    scan = Scan(
        status="QUEUED",
        scanType=payload.scanType.upper(),
        scanName=scan_name,
        scanTags=payload.scanTags,
        assetId=asset.id,
        jobId=job_id
    )
    db.add(scan)
    db.flush()
    
    # 3. Create the Scan Job (status initially PENDING)
    job = ScanJob(
        id=job_id,
        scanId=scan.id,
        status="PENDING"
    )
    db.add(job)
    
    # 4 & 5. Save all selected modules & advanced options
    modules_to_create = {
        "crawling": payload.crawling or {},
        "auth": payload.auth or {},
        "proxy": payload.proxy or {},
        "performance": payload.performance or {},
        "exclusions": payload.exclusions or {},
        "headers": payload.headers or [],
        "selected_modules": payload.modules or []
    }
    
    for mod_name, mod_config in modules_to_create.items():
        module = ScanModule(
            scanId=scan.id,
            name=mod_name,
            config=json.dumps(mod_config)
        )
        db.add(module)
        
    # 6. Commit to PostgreSQL
    db.commit()

    # 7. Enqueue to background worker using ScanQueue
    from services.queue import ScanQueue
    from database.models import ScanLog
    try:
        queue = ScanQueue()
        if queue.is_connected():
            enqueued = queue.enqueue(scan.id)
            if not enqueued:
                log_item = ScanLog(
                    scanId=scan.id,
                    logLevel="WARNING",
                    message="Redis queue failed to accept job. Will retry automatically."
                )
                db.add(log_item)
                db.commit()
        else:
            log_item = ScanLog(
                scanId=scan.id,
                logLevel="WARNING",
                message="Redis queue is offline. Scan queued locally."
            )
            db.add(log_item)
            db.commit()
    except Exception as e:
        print(f"Queue enqueuing exception: {e}")
    
    return ScanResponse(
        id=scan.id,
        status=scan.status,
        scanType=scan.scanType,
        score=scan.score,
        duration=scan.duration,
        createdAt=scan.createdAt,
        target={
            "name": asset.name,
            "url": asset.url,
            "type": asset.type
        }
    )

@router.patch("/{id}", response_model=ScanResponse)
def update_scan(
    id: str,
    payload: ScanPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    if payload.status is not None:
        scan.status = payload.status.upper()
    if payload.score is not None:
        scan.score = payload.score
    if payload.duration is not None:
        scan.duration = payload.duration
        
    db.commit()
    
    return ScanResponse(
        id=scan.id,
        status=scan.status,
        scanType=scan.scanType,
        score=scan.score,
        duration=scan.duration,
        createdAt=scan.createdAt,
        target={
            "name": scan.asset.name,
            "url": scan.asset.url,
            "type": scan.asset.type
        }
    )

@router.delete("/{id}")
def delete_scan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    db.delete(scan)
    db.commit()
    
    return {"success": True, "message": "Scan deleted successfully."}

from datetime import datetime, timezone, timedelta

@router.post("/{id}/cancel", response_model=ScanResponse)
def cancel_scan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    if scan.status in ["RUNNING", "QUEUED", "PREPARING"]:
        scan.status = "CANCELLED"
        # Compute dynamic duration
        elapsed = datetime.now(timezone.utc) - scan.updatedAt.replace(tzinfo=timezone.utc)
        scan.duration = max(1, int(elapsed.total_seconds()))
        db.commit()
    else:
        raise HTTPException(status_code=400, detail=f"Cannot cancel scan in status {scan.status}.")
        
    return ScanResponse(
        id=scan.id,
        status=scan.status,
        scanType=scan.scanType,
        score=scan.score,
        duration=scan.duration,
        createdAt=scan.createdAt,
        target={
            "name": scan.asset.name,
            "url": scan.asset.url,
            "type": scan.asset.type
        }
    )

@router.post("/{id}/retry", response_model=ScanResponse)
def retry_scan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find original scan
    orig_scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not orig_scan:
        raise HTTPException(status_code=404, detail="Original scan record not found.")
        
    # Duplicate scan record with status QUEUED
    new_scan = Scan(
        status="QUEUED",
        scanType=orig_scan.scanType,
        scanName=orig_scan.scanName,
        scanTags=orig_scan.scanTags,
        assetId=orig_scan.assetId
    )
    db.add(new_scan)
    db.flush()
    
    # Duplicate scan job
    job = ScanJob(
        scanId=new_scan.id,
        status="PENDING"
    )
    db.add(job)
    
    # Duplicate modules configurations
    orig_modules = db.query(ScanModule).filter(ScanModule.scanId == orig_scan.id).all()
    for mod in orig_modules:
        new_mod = ScanModule(
            scanId=new_scan.id,
            name=mod.name,
            config=mod.config
        )
        db.add(new_mod)
        
    db.commit()
    
    return ScanResponse(
        id=new_scan.id,
        status=new_scan.status,
        scanType=new_scan.scanType,
        score=new_scan.score,
        duration=new_scan.duration,
        createdAt=new_scan.createdAt,
        target={
            "name": orig_scan.asset.name,
            "url": orig_scan.asset.url,
            "type": orig_scan.asset.type
        }
    )

@router.get("/{id}/progress", response_model=ScanProgressResponse)
def get_scan_progress(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    module_names = ["Crawler", "Headers", "SSL", "OWASP", "DNS", "Technology", "Secrets"]
    modules_progress = []
    
    if scan.status == "RUNNING":
        # Calculate elapsed time in seconds
        elapsed = datetime.now(timezone.utc) - scan.updatedAt.replace(tzinfo=timezone.utc)
        elapsed_sec = int(elapsed.total_seconds())
        
        currently_executing = None
        for idx, mod in enumerate(module_names):
            start_threshold = idx * 10
            end_threshold = (idx + 1) * 10
            
            if elapsed_sec >= end_threshold:
                modules_progress.append(ModuleProgressSchema(name=mod, status="COMPLETED", progress=100))
            elif elapsed_sec >= start_threshold:
                pct = int(((elapsed_sec - start_threshold) / 10) * 100)
                modules_progress.append(ModuleProgressSchema(name=mod, status="RUNNING", progress=pct))
                currently_executing = f"Checking {mod} configurations..."
            else:
                modules_progress.append(ModuleProgressSchema(name=mod, status="WAITING", progress=0))
                
        if not currently_executing:
            currently_executing = "Finalizing scan summary reports..."
            
        return ScanProgressResponse(
            scanId=scan.id,
            status=scan.status,
            targetUrl=scan.asset.url,
            startedAt=scan.updatedAt,
            elapsedTime=elapsed_sec,
            currentlyExecuting=currently_executing,
            modules=modules_progress
        )
    elif scan.status == "QUEUED":
        return ScanProgressResponse(
            scanId=scan.id,
            status=scan.status,
            targetUrl=scan.asset.url,
            startedAt=None,
            elapsedTime=0,
            currentlyExecuting="Scan job is in the execution queue...",
            modules=[ModuleProgressSchema(name=mod, status="WAITING", progress=0) for mod in module_names]
        )
    elif scan.status == "COMPLETED":
        return ScanProgressResponse(
            scanId=scan.id,
            status=scan.status,
            targetUrl=scan.asset.url,
            startedAt=scan.createdAt,
            elapsedTime=scan.duration or 60,
            currentlyExecuting=None,
            modules=[ModuleProgressSchema(name=mod, status="COMPLETED", progress=100) for mod in module_names]
        )
    elif scan.status == "FAILED":
        for idx, mod in enumerate(module_names):
            if mod == "OWASP":
                modules_progress.append(ModuleProgressSchema(name=mod, status="FAILED", progress=45))
            elif idx < 3: # Crawler, Headers, SSL completed
                modules_progress.append(ModuleProgressSchema(name=mod, status="COMPLETED", progress=100))
            else:
                modules_progress.append(ModuleProgressSchema(name=mod, status="WAITING", progress=0))
                
        return ScanProgressResponse(
            scanId=scan.id,
            status=scan.status,
            targetUrl=scan.asset.url,
            startedAt=scan.createdAt,
            elapsedTime=32,
            currentlyExecuting="Execution aborted due to scanner failure.",
            modules=modules_progress
        )
    else: # CANCELLED
        for idx, mod in enumerate(module_names):
            if idx < 2: # Crawler, Headers completed
                modules_progress.append(ModuleProgressSchema(name=mod, status="COMPLETED", progress=100))
            else:
                modules_progress.append(ModuleProgressSchema(name=mod, status="WAITING", progress=0))
                
        return ScanProgressResponse(
            scanId=scan.id,
            status=scan.status,
            targetUrl=scan.asset.url,
            startedAt=scan.createdAt,
            elapsedTime=15,
            currentlyExecuting="Aborted by user request.",
            modules=modules_progress
        )

@router.get("/{id}/logs", response_model=ScanLogsResponse)
def get_scan_logs(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
        
    db_logs = db.query(ScanLog).filter(ScanLog.scanId == id).order_by(ScanLog.createdAt.asc()).all()
    logs = []
    if not db_logs:
        logs.append(ScanLogItemSchema(
            timestamp=scan.createdAt,
            level="INFO",
            message="Scan enqueued. Waiting for background worker daemon..."
        ))
    else:
        for log in db_logs:
            logs.append(ScanLogItemSchema(
                timestamp=log.createdAt,
                level=log.logLevel,
                message=log.message
            ))
    return ScanLogsResponse(scanId=scan.id, logs=logs)

# ── Extension Endpoints for Phase 3.1 ──────────────────────────────────────

@router.get("/scanners/registered")
def get_registered_scanners():
    """
    Returns registered scanner modules metadata dynamically from the registry.
    """
    if not scanner_registry:
        raise HTTPException(status_code=500, detail="Scanner registry is not loaded.")
        
    # Ensure all scanners are loaded
    scanner_registry.load_default_scanners()
    
    scanners_list = []
    for name, klass in scanner_registry.all().items():
        try:
            # Instantiate class temporarily to read its metadata() dictionary
            temp = klass.__new__(klass)
            temp.SCANNER_NAME = klass.SCANNER_NAME
            meta = klass.metadata(temp)
            scanners_list.append(meta)
        except Exception as e:
            # Fallback metadata if metadata() method has an error
            scanners_list.append({
                "name": name,
                "version": getattr(klass, "SCANNER_VERSION", "1.0.0"),
                "description": klass.__doc__ or "No description available.",
                "tool": "unknown",
                "tool_version": "unknown",
                "target_types": ["WEBSITE"],
                "output_format": "JSON"
            })
            
    return scanners_list

@router.get("/scan-profiles/list")
def get_scan_profiles():
    """
    Returns the scan profiles definition (Quick, Standard, Advanced, Custom)
    along with their module mapping configuration.
    """
    return [
        {
            "id": "QUICK",
            "name": "Quick Scan",
            "plan": "Free",
            "badgeType": "free",
            "description": "Fast security and header checks.",
            "duration": "~30 sec",
            "configurable": False,
            "modules": {
                "WEBSITE": ["owasp", "headers", "ssl"],
                "REPOSITORY": ["secrets"]
            }
        },
        {
            "id": "STANDARD",
            "name": "Standard Scan",
            "plan": "Basic",
            "badgeType": "basic",
            "description": "Recommended for small websites.",
            "duration": "~2–5 min",
            "configurable": False,
            "modules": {
                "WEBSITE": ["owasp", "headers", "ssl", "dns", "technology", "crawler"],
                "REPOSITORY": ["secrets"]
            }
        },
        {
            "id": "ADVANCED",
            "name": "Advanced Scan",
            "plan": "Premium",
            "badgeType": "premium",
            "description": "Professional security assessment.",
            "duration": "~5–15 min",
            "configurable": True,
            "modules": {
                "WEBSITE": ["owasp", "crawler", "headers", "ssl", "dns", "technology", "ports", "subdomains", "waf"],
                "REPOSITORY": ["secrets", "repository"]
            }
        },
        {
            "id": "CUSTOM",
            "name": "Custom Scan",
            "plan": "Premium",
            "badgeType": "premium",
            "description": "Tailor modules to your exact needs.",
            "duration": "Variable",
            "configurable": True,
            "modules": {
                "WEBSITE": ["owasp", "crawler", "headers", "ssl", "dns", "technology", "ports", "subdomains", "waf"],
                "REPOSITORY": ["secrets", "repository"]
            }
        }
    ]

from datetime import timezone
from sqlalchemy import inspect

@router.get("/{id}/status")
def get_scan_status(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    # Calculate elapsed time
    elapsed_time = None
    if scan.startedAt:
        end_time = scan.completedAt or datetime.now(timezone.utc)
        started_at = scan.startedAt
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        elapsed_time = int((end_time - started_at).total_seconds())

    # Get module states
    modules = db.query(ScanModule).filter(ScanModule.scanId == id).all()
    
    selected_mods = []
    for m in modules:
        if m.name == "selected_modules":
            try:
                selected_mods = json.loads(m.config)
            except Exception:
                selected_mods = []
            break
            
    if not selected_mods:
        if scan.asset.type.upper() == "WEBSITE":
            selected_mods = ["owasp", "headers", "ssl", "dns", "technology", "crawler"]
        else:
            selected_mods = ["secrets", "javascript"]

    module_states = {}
    for mod_name in selected_mods:
        rec = next((m for m in modules if m.name == mod_name), None)
        if rec:
            module_states[mod_name] = {
                "status": rec.status,
                "duration": rec.duration,
                "error": rec.errors
            }
        else:
            module_states[mod_name] = {
                "status": "WAITING",
                "duration": None,
                "error": None
            }

    # Calculate estimated remaining time (e.g. 20s per waiting module as fallback)
    estimated_remaining = None
    if scan.status in ["QUEUED", "PREPARING", "RUNNING"]:
        waiting_count = sum(1 for m in module_states.values() if m["status"] in ["WAITING", "RUNNING"])
        estimated_remaining = waiting_count * 20

    completed_list = [name for name, s in module_states.items() if s["status"] == "COMPLETED"]
    failed_list = [name for name, s in module_states.items() if s["status"] == "FAILED"]
    queued_list = [name for name, s in module_states.items() if s["status"] in ["WAITING", "QUEUED"]]

    current_tool = None
    if scan.currentModule and scanner_registry:
        klass = scanner_registry.get(scan.currentModule)
        if klass:
            try:
                temp = klass.__new__(klass)
                temp.SCANNER_NAME = klass.SCANNER_NAME
                meta = klass.metadata(temp)
                current_tool = meta.get("tool", scan.currentModule)
            except Exception:
                current_tool = scan.currentModule

    # Run the scoring engine v3
    from scoring_engine.scoring import score_from_db
    try:
        scoring_res = score_from_db(db, id)
        overall_score = scoring_res.overall_score
        posture = scoring_res.posture
        confidence = scoring_res.scan_confidence
        attack_surface = scoring_res.attack_surface
        positive_signals = scoring_res.positive_signals
        negative_signals = scoring_res.negative_signals
        critical_findings = scoring_res.critical_findings
        top_contributors = scoring_res.top_contributors
        module_scores_data = scoring_res.module_scores
        score_breakdown = scoring_res.score_breakdown
    except Exception as e:
        overall_score = scan.score or 100
        posture = "Excellent" if overall_score >= 95 else "Good" if overall_score >= 88 else "Fair"
        confidence = "LOW"
        attack_surface = 0
        positive_signals = 0
        negative_signals = 0
        critical_findings = 0
        top_contributors = []
        module_scores_data = {}
        score_breakdown = {}

    return {
        "status": scan.status,
        "progress": scan.progress,
        "score": overall_score,  # legacy compatibility
        "overallScore": overall_score,
        "posture": posture,
        "confidence": confidence,
        "attackSurface": attack_surface,
        "positiveSignals": positive_signals,
        "negativeSignals": negative_signals,
        "criticalFindings": critical_findings,
        "topContributors": top_contributors,
        "moduleScores": module_scores_data,
        "scoreBreakdown": score_breakdown,
        "targetUrl": scan.asset.url,
        "scanType": scan.scanType,
        "targetType": scan.asset.type,
        "currentModule": scan.currentModule,
        "currentTool": current_tool,
        "startedAt": scan.startedAt,
        "completedAt": scan.completedAt,
        "elapsedTime": elapsed_time,
        "estimatedRemaining": estimated_remaining,
        "completedModules": completed_list,
        "failedModules": failed_list,
        "queuedModules": queued_list,
        "modules": module_states
    }

@router.get("/{id}/modules")
def get_scan_modules_status(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    modules = db.query(ScanModule).filter(ScanModule.scanId == id).all()
    
    selected_mods = []
    for m in modules:
        if m.name == "selected_modules":
            try:
                selected_mods = json.loads(m.config)
            except Exception:
                selected_mods = []
            break
            
    if not selected_mods:
        if scan.asset.type.upper() == "WEBSITE":
            selected_mods = ["owasp", "headers", "ssl", "dns", "technology", "crawler"]
        else:
            selected_mods = ["secrets", "javascript"]

    result_list = []
    for mod_name in selected_mods:
        tool_name = mod_name
        if scanner_registry:
            klass = scanner_registry.get(mod_name)
            if klass:
                try:
                    temp = klass.__new__(klass)
                    temp.SCANNER_NAME = klass.SCANNER_NAME
                    meta = klass.metadata(temp)
                    tool_name = meta.get("tool", mod_name)
                except Exception:
                    pass

        rec = next((m for m in modules if m.name == mod_name), None)
        if rec:
            result_list.append({
                "module": mod_name,
                "status": rec.status,
                "duration": rec.duration,
                "tool": tool_name,
                "error": rec.errors
            })
        else:
            result_list.append({
                "module": mod_name,
                "status": "WAITING",
                "duration": None,
                "tool": tool_name,
                "error": None
            })
            
    return result_list


@router.get("/{id}/results", response_model=ScanResultsResponseSchema)
def get_scan_results(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    results = db.query(ScanResult).filter(ScanResult.scanId == id).order_by(desc(ScanResult.createdAt)).all()

    return {
        "scanId": id,
        "results": results
    }


@router.get("/results/{finding_id}/ai-analysis")
def get_finding_ai_analysis(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    finding = db.query(ScanResult).join(Scan).join(Asset).filter(
        ScanResult.id == finding_id,
        Asset.userId == current_user.id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found.")

    analysis = AIService.get_finding_analysis(finding, finding.scan.asset.url)
    return analysis


@router.get("/{id}/scoring")
def get_scan_scoring(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(Scan.id == id, Asset.userId == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    from scoring_engine.scoring import score_from_db
    try:
        res = score_from_db(db, id)
        # Convert module_scores from dict of details to simple dict of scores as requested
        mod_scores = {k: v["score"] for k, v in res.module_scores.items()}
        
        return {
            "overallScore": res.overall_score,
            "posture": res.posture,
            "confidence": res.scan_confidence,
            "attackSurface": res.attack_surface,
            "positiveSignals": res.positive_signals,
            "negativeSignals": res.negative_signals,
            "criticalFindings": res.critical_findings,
            "topContributors": res.top_contributors,
            "moduleScores": mod_scores,
            "scoreBreakdown": res.score_breakdown
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate security score breakdown: {str(e)}"
        )



