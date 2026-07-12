from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy import func, text, and_, or_
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import json
import logging

from database.session import get_db
from database.models import User, Asset, Scan, ScanResult, AuditLog
from api.deps import get_current_user
from services.ai import AIService

logger = logging.getLogger("cipherlens.api.findings")

router = APIRouter(prefix="/findings", tags=["Findings Workspace"])

# Active statuses are Open, Investigating, In Progress, Reopened
ACTIVE_STATUSES = ["Open", "Investigating", "In Progress", "Reopened"]
RESOLVED_STATUSES = ["Resolved", "Mitigated", "Fixed", "Closed"]

@router.get("")
def get_findings_workspace(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    severities: Optional[str] = None, # Comma-separated list (CRITICAL, HIGH, etc.)
    statuses: Optional[str] = None, # Comma-separated list
    asset_id: Optional[str] = None,
    module: Optional[str] = None,
    category: Optional[str] = None,
    scanner: Optional[str] = None,
    assigned_to: Optional[str] = None,
    cve: Optional[str] = None,
    cwe: Optional[str] = None,
    cvss_min: Optional[float] = None,
    cvss_max: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    archived: Optional[bool] = False
):
    # Base query joining ScanResult, Scan, and Asset
    # Join on Scan and Asset to verify ownership by current user
    base_query = db.query(ScanResult)\
        .join(Scan, ScanResult.scanId == Scan.id)\
        .join(Asset, Scan.assetId == Asset.id)\
        .filter(Asset.userId == current_user.id)\
        .filter(ScanResult.isDeleted == False)\
        .filter(ScanResult.isArchived == archived)

    # Calculate global KPI statistics before applying user-facing table filters
    # Statistics should represent the global active status of the user's workspace
    stats_query = db.query(
        ScanResult.id,
        ScanResult.severity,
        ScanResult.status,
        ScanResult.resolvedAt,
        ScanResult.createdAt,
        Asset.id.label("asset_id")
    ).join(Scan, ScanResult.scanId == Scan.id)\
     .join(Asset, Scan.assetId == Asset.id)\
     .filter(Asset.userId == current_user.id)\
     .filter(ScanResult.isDeleted == False)\
     .filter(ScanResult.isArchived == False).all()

    total_active = 0
    critical_active = 0
    high_active = 0
    medium_active = 0
    low_active = 0
    info_active = 0
    resolved_this_week = 0
    resolution_durations = []
    assets_with_active = set()

    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)

    for item in stats_query:
        is_active = item.status in ACTIVE_STATUSES
        severity_upper = (item.severity or "").upper()

        if is_active:
            total_active += 1
            if severity_upper == "CRITICAL":
                critical_active += 1
            elif severity_upper == "HIGH":
                high_active += 1
            elif severity_upper == "MEDIUM":
                medium_active += 1
            elif severity_upper == "LOW":
                low_active += 1
            elif severity_upper in ("INFO", "INFORMATIONAL"):
                info_active += 1
            assets_with_active.add(item.asset_id)
        
        # Check resolved this week
        if item.status in RESOLVED_STATUSES:
            res_at = item.resolvedAt
            if res_at:
                if res_at.tzinfo is None:
                    res_at = res_at.replace(tzinfo=timezone.utc)
                if res_at >= one_week_ago:
                    resolved_this_week += 1
                
                # Time to resolution calculation
                created_at = item.createdAt
                if created_at:
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    delta_hours = (res_at - created_at).total_seconds() / 3600.0
                    resolution_durations.append(delta_hours)

    avg_hours_to_resolve = round(sum(resolution_durations) / len(resolution_durations), 1) if resolution_durations else 0.0

    # Build filters
    filters = []
    
    if severities:
        sev_list = [s.strip().upper() for s in severities.split(",") if s.strip()]
        filters.append(func.upper(ScanResult.severity).in_(sev_list))
        
    if statuses:
        stat_list = [s.strip() for s in statuses.split(",") if s.strip()]
        filters.append(ScanResult.status.in_(stat_list))
        
    if asset_id:
        filters.append(Asset.id == asset_id)
        
    if module:
        filters.append(ScanResult.module == module)
        
    if category:
        filters.append(ScanResult.category == category)
        
    if scanner:
        filters.append(ScanResult.tool == scanner)
        
    if assigned_to:
        if assigned_to.lower() == "unassigned":
            filters.append(or_(ScanResult.assignedTo == None, ScanResult.assignedTo == ""))
        else:
            filters.append(ScanResult.assignedTo == assigned_to)
            
    if cve:
        filters.append(ScanResult.cve.ilike(f"%{cve}%"))
        
    if cwe:
        filters.append(ScanResult.cwe.ilike(f"%{cwe}%"))
        
    if cvss_min is not None:
        filters.append(text(f"CAST(scan_results.cvss AS DOUBLE PRECISION) >= {cvss_min}"))
        
    if cvss_max is not None:
        filters.append(text(f"CAST(scan_results.cvss AS DOUBLE PRECISION) <= {cvss_max}"))
        
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            filters.append(ScanResult.createdAt >= dt_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            filters.append(ScanResult.createdAt <= dt_to)
        except ValueError:
            pass
            
    if search:
        filters.append(or_(
            ScanResult.title.ilike(f"%{search}%"),
            ScanResult.description.ilike(f"%{search}%"),
            ScanResult.evidence.ilike(f"%{search}%")
        ))

    if filters:
        base_query = base_query.filter(and_(*filters))

    # To group findings globally and prevent duplication, we group by title and assetId
    # Retrieve all scan results matching the query first
    matched_results = base_query.order_by(ScanResult.createdAt.desc()).all()

    # Perform group aggregation in python to support complex JSON rawData parsing, first/last seen resolved across scans, etc.
    grouped_findings = {}
    
    for r in matched_results:
        # Group key represents a unique finding code on a specific target
        asset = r.scan.asset
        group_key = (r.findingCode, asset.id)
        
        # Parse cvss, cve, cwe dynamically if columns are empty but rawData contains them
        parsed_cvss = r.cvss
        parsed_cve = r.cve
        parsed_cwe = r.cwe
        
        if not parsed_cvss or not parsed_cve or not parsed_cwe:
            try:
                raw_data = json.loads(r.rawData) if r.rawData else {}
                if isinstance(raw_data, dict):
                    if not parsed_cvss:
                        for k in ("cvss", "cvss_score", "cvss-score", "cvss_base_score"):
                            if k in raw_data:
                                parsed_cvss = str(raw_data[k])
                                break
                    if not parsed_cve:
                        for k in ("cve", "cve_id", "cve-id"):
                            if k in raw_data:
                                parsed_cve = str(raw_data[k])
                                break
                    if not parsed_cwe:
                        for k in ("cwe", "cwe_id", "cwe-id", "cwe_score"):
                            if k in raw_data:
                                parsed_cwe = str(raw_data[k])
                                break
            except Exception:
                pass

        # Parse CVE and CWE from references if still not found
        if not parsed_cve and r.references:
            try:
                refs = json.loads(r.references)
                if isinstance(refs, list):
                    for ref in refs:
                        if "CVE-" in ref:
                            parsed_cve = ref
                            break
            except Exception:
                pass

        # Normalize cvss to string representation of float or "--"
        display_cvss = "--"
        if parsed_cvss:
            try:
                display_cvss = f"{float(parsed_cvss):.1f}"
            except ValueError:
                display_cvss = str(parsed_cvss)

        # Fallbacks for CVE and CWE if they match standard codes
        if not parsed_cve and "CVE-" in r.title:
            import re
            cve_match = re.search(r"CVE-\d{4}-\d+", r.title)
            if cve_match:
                parsed_cve = cve_match.group(0)
        if not parsed_cwe and "CWE-" in r.title:
            import re
            cwe_match = re.search(r"CWE-\d+", r.title)
            if cwe_match:
                parsed_cwe = cwe_match.group(0)

        created_tz = r.createdAt
        if created_tz.tzinfo is None:
            created_tz = created_tz.replace(tzinfo=timezone.utc)

        if group_key not in grouped_findings:
            grouped_findings[group_key] = {
                "id": r.id,
                "findingCode": r.findingCode,
                "title": r.title,
                "severity": r.severity,
                "module": r.module,
                "category": r.category,
                "scanner": r.tool,
                "cvss": display_cvss,
                "status": r.status,
                "assignedTo": r.assignedTo or "Unassigned",
                "firstSeen": created_tz.isoformat(),
                "lastSeen": created_tz.isoformat(),
                "occurrences": 1,
                "cve": parsed_cve or "N/A",
                "cwe": parsed_cwe or "N/A",
                "mitreAttack": r.mitreAttack or "N/A",
                "owaspMapping": r.owaspMapping or "N/A",
                "description": r.description,
                "remediation": r.remediation,
                "evidence": r.evidence,
                "notes": r.notes or "",
                "tags": r.tags or "",
                "isArchived": r.isArchived,
                "isDeleted": r.isDeleted,
                "asset": {
                    "id": asset.id,
                    "name": asset.name,
                    "url": asset.url,
                    "type": asset.type
                }
            }
        else:
            # Update occurrence count and dates
            entry = grouped_findings[group_key]
            entry["occurrences"] += 1
            
            # Since r is ordered desc, the first parsed row is the latest occurrence (lastSeen)
            # The earliest row processed is the oldest occurrence (firstSeen)
            entry["firstSeen"] = created_tz.isoformat()

    return {
        "findings": list(grouped_findings.values()),
        "stats": {
            "totalActive": total_active,
            "criticalActive": critical_active,
            "highActive": high_active,
            "mediumActive": medium_active,
            "lowActive": low_active,
            "infoActive": info_active,
            "resolvedThisWeek": resolved_this_week,
            "avgHoursToResolution": avg_hours_to_resolve,
            "assetsWithActive": len(assets_with_active)
        }
    }

@router.patch("/status")
def patch_finding_status(
    findingCode: str = Body(...),
    assetId: str = Body(...),
    status: Optional[str] = Body(None),
    assignedTo: Optional[str] = Body(None),
    notes: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership of target asset
    asset = db.query(Asset).filter(Asset.id == assetId, Asset.userId == current_user.id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found or access denied."
        )

    # Retrieve all scan results for this asset matching the finding code
    scans_subquery = db.query(Scan.id).filter(Scan.assetId == assetId).subquery()
    results = db.query(ScanResult).filter(
        ScanResult.scanId.in_(scans_subquery),
        ScanResult.findingCode == findingCode
    ).all()

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding code not found on the specified asset."
        )

    # Perform updates across all occurrences
    resolved_time = datetime.now(timezone.utc)
    for r in results:
        if status is not None:
            r.status = status
            if status in RESOLVED_STATUSES:
                r.resolvedAt = resolved_time
            else:
                r.resolvedAt = None
        if assignedTo is not None:
            r.assignedTo = assignedTo if assignedTo != "Unassigned" else None
        if notes is not None:
            r.notes = notes

    db.commit()
    return {"message": "Finding state updated successfully across all occurrences."}

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

def get_findings_list_helper(
    db: Session,
    current_user: User,
    filters_dict: Dict[str, Any],
    finding_keys: Optional[List[Dict[str, str]]] = None,
    scope: str = "all"
) -> List[Dict[str, Any]]:
    if scope == "selected" and finding_keys:
        results = []
        for key in finding_keys:
            finding_code = key.get("findingCode")
            asset_id = key.get("assetId")
            if not finding_code or not asset_id:
                continue
            scans_subquery = db.query(Scan.id).filter(Scan.assetId == asset_id).subquery()
            res = db.query(ScanResult).join(Scan).join(Asset)\
                .filter(Asset.userId == current_user.id)\
                .filter(ScanResult.scanId.in_(scans_subquery))\
                .filter(ScanResult.findingCode == finding_code)\
                .filter(ScanResult.isDeleted == False).all()
            results.extend(res)
    else:
        base_query = db.query(ScanResult)\
            .join(Scan, ScanResult.scanId == Scan.id)\
            .join(Asset, Scan.assetId == Asset.id)\
            .filter(Asset.userId == current_user.id)\
            .filter(ScanResult.isDeleted == False)
            
        severities = filters_dict.get("severities")
        statuses = filters_dict.get("statuses")
        asset_id = filters_dict.get("asset_id")
        category = filters_dict.get("category")
        scanner = filters_dict.get("scanner")
        assigned_to = filters_dict.get("assigned_to")
        cvss_min = filters_dict.get("cvss_min")
        cvss_max = filters_dict.get("cvss_max")
        date_from = filters_dict.get("date_from")
        date_to = filters_dict.get("date_to")
        search = filters_dict.get("search")
        archived = filters_dict.get("archived", False)
        
        filters = []
        if severities:
            sev_list = [s.strip().upper() for s in severities.split(",") if s.strip()]
            filters.append(func.upper(ScanResult.severity).in_(sev_list))
        if statuses:
            stat_list = [s.strip() for s in statuses.split(",") if s.strip()]
            filters.append(ScanResult.status.in_(stat_list))
        if asset_id:
            filters.append(Asset.id == asset_id)
        if category:
            filters.append(ScanResult.category == category)
        if scanner:
            filters.append(ScanResult.tool == scanner)
        if assigned_to:
            if assigned_to.lower() == "unassigned":
                filters.append(or_(ScanResult.assignedTo == None, ScanResult.assignedTo == ""))
            else:
                filters.append(ScanResult.assignedTo == assigned_to)
        if cvss_min is not None:
            filters.append(text(f"CAST(scan_results.cvss AS DOUBLE PRECISION) >= {cvss_min}"))
        if cvss_max is not None:
            filters.append(text(f"CAST(scan_results.cvss AS DOUBLE PRECISION) <= {cvss_max}"))
        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                filters.append(ScanResult.createdAt >= dt_from)
            except ValueError:
                pass
        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                filters.append(ScanResult.createdAt <= dt_to)
            except ValueError:
                pass
        if search:
            filters.append(or_(
                ScanResult.title.ilike(f"%{search}%"),
                ScanResult.description.ilike(f"%{search}%"),
                ScanResult.evidence.ilike(f"%{search}%")
            ))
        filters.append(ScanResult.isArchived == archived)
        if filters:
            base_query = base_query.filter(and_(*filters))
            
        results = base_query.order_by(ScanResult.createdAt.desc()).all()

    grouped_findings = {}
    for r in results:
        asset = r.scan.asset
        group_key = (r.findingCode, asset.id)
        
        parsed_cvss = r.cvss
        parsed_cve = r.cve
        parsed_cwe = r.cwe
        
        display_cvss = "--"
        if parsed_cvss:
            try:
                display_cvss = f"{float(parsed_cvss):.1f}"
            except ValueError:
                display_cvss = str(parsed_cvss)
                
        created_tz = r.createdAt
        if created_tz.tzinfo is None:
            created_tz = created_tz.replace(tzinfo=timezone.utc)
            
        if group_key not in grouped_findings:
            grouped_findings[group_key] = {
                "id": r.id,
                "findingCode": r.findingCode,
                "title": r.title,
                "severity": r.severity,
                "module": r.module,
                "category": r.category,
                "scanner": r.tool,
                "cvss": display_cvss,
                "status": r.status,
                "assignedTo": r.assignedTo or "Unassigned",
                "firstSeen": created_tz.isoformat(),
                "lastSeen": created_tz.isoformat(),
                "occurrences": 1,
                "cve": parsed_cve or "N/A",
                "cwe": parsed_cwe or "N/A",
                "description": r.description,
                "remediation": r.remediation,
                "evidence": r.evidence,
                "notes": r.notes or "",
                "tags": r.tags or "",
                "isArchived": r.isArchived,
                "isDeleted": r.isDeleted,
                "asset": {
                    "id": asset.id,
                    "name": asset.name,
                    "url": asset.url,
                    "type": asset.type
                }
            }
        else:
            entry = grouped_findings[group_key]
            entry["occurrences"] += 1
            entry["firstSeen"] = created_tz.isoformat()
            
    findings_list = list(grouped_findings.values())
    
    if scope == "current_page":
        page = filters_dict.get("page", 1)
        page_size = filters_dict.get("page_size", 20)
        start = (page - 1) * page_size
        findings_list = findings_list[start:start + page_size]
        
    return findings_list

def format_findings_export(format_type: str, findings: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
    import base64
    import csv
    import io
    if format_type.lower() == "json":
        data = {
            "metadata": metadata,
            "findings": findings
        }
        json_str = json.dumps(data, indent=2)
        return base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
        
    elif format_type.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Finding ID", "Severity", "Title", "Description", "Asset", "Scanner", 
            "Category", "Status", "Discovered Date", "Updated Date", "CVE", "Remediation", "Tags"
        ])
        for f in findings:
            writer.writerow([
                f.get("id"),
                f.get("severity"),
                f.get("title"),
                f.get("description"),
                f.get("asset", {}).get("name"),
                f.get("scanner"),
                f.get("category"),
                f.get("status"),
                f.get("firstSeen"),
                f.get("lastSeen"),
                f.get("cve"),
                f.get("remediation"),
                f.get("tags")
            ])
        csv_str = output.getvalue()
        return base64.b64encode(csv_str.encode("utf-8")).decode("utf-8")
        
    elif format_type.lower() == "markdown":
        md = f"""# CipherLens Security Findings Export
Generated By: {metadata.get('generatedBy')}
Generated At: {metadata.get('generatedAt')}
Total Records: {metadata.get('totalRecords')}

## Applied Filters
{json.dumps(metadata.get('appliedFilters', {}), indent=2)}

---

"""
        for idx, f in enumerate(findings):
            md += f"""### {idx+1}. [{f.get('severity')}] {f.get('title')}
- **Finding ID**: `{f.get('id')}`
- **Asset**: {f.get('asset', {}).get('name')} ({f.get('asset', {}).get('url')})
- **Scanner / Category**: {f.get('scanner')} / {f.get('category')}
- **Status**: {f.get('status')}
- **First Seen**: {f.get('firstSeen')}
- **Last Seen**: {f.get('lastSeen')}
- **CVE**: {f.get('cve')}
- **Tags**: {f.get('tags')}

#### Description
{f.get('description')}

#### Remediation
{f.get('remediation')}

---

"""
        return base64.b64encode(md.encode("utf-8")).decode("utf-8")
        
    elif format_type.lower() in ("html", "pdf"):
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CipherLens Security Findings Audit Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #FAFAF7;
            color: #1A1A1A;
            margin: 0;
            padding: 40px;
        }}
        .header {{
            border-bottom: 2px solid #E5E3DE;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        h1 {{
            font-size: 28px;
            font-weight: 300;
            margin: 0 0 10px 0;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            background-color: #FFFFFF;
            border: 1px solid #E5E3DE;
            padding: 15px;
            border-radius: 12px;
            font-size: 13px;
        }}
        .finding-card {{
            background: #FFFFFF;
            border: 1px solid #E5E3DE;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 25px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }}
        .badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }}
        .CRITICAL {{ background-color: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }}
        .HIGH {{ background-color: #FFFAF0; color: #C2410C; border: 1px solid #FDBA74; }}
        .MEDIUM {{ background-color: #FEF3C7; color: #B45309; border: 1px solid #FCD34D; }}
        .LOW {{ background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #93C5FD; }}
        .INFO {{ background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }}
        .title {{
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 10px;
        }}
        .details-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 15px;
            margin-bottom: 15px;
        }}
        .details-table td, .details-table th {{
            border: 1px solid #E5E3DE;
            padding: 8px;
            text-align: left;
        }}
        .details-table th {{
            background-color: #F8F7F4;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>CipherLens Security Findings Export</h1>
        <p style="margin:0; font-size:14px; color:#6B6B6B;">Enterprise Security Auditing Report</p>
    </div>
    
    <div class="meta-grid" style="margin-bottom:30px;">
        <div><strong>Generated By:</strong> {metadata.get('generatedBy')}</div>
        <div><strong>Generated At:</strong> {metadata.get('generatedAt')}</div>
        <div><strong>Total Records:</strong> {metadata.get('totalRecords')}</div>
        <div><strong>Archive Included:</strong> {metadata.get('appliedFilters', {}).get('archived', False)}</div>
    </div>
    
    <h2>Vulnerability Findings ({metadata.get('totalRecords')})</h2>
"""
        for idx, f in enumerate(findings):
            html += f"""
    <div class="finding-card">
        <span class="badge {f.get('severity')}">{f.get('severity')}</span>
        <div class="title">{idx+1}. {f.get('title')}</div>
        <p style="font-size: 13px; color:#4A4A4A; line-height: 1.6;">{f.get('description')}</p>
        
        <table class="details-table">
            <tr>
                <th>Finding ID</th><td><code>{f.get('id')}</code></td>
                <th>Affected Asset</th><td>{f.get('asset', {}).get('name')} (<code>{f.get('asset', {}).get('url')}</code>)</td>
            </tr>
            <tr>
                <th>Scanner Type</th><td>{f.get('scanner')}</td>
                <th>Vulnerability Category</th><td>{f.get('category')}</td>
            </tr>
            <tr>
                <th>Current Status</th><td>{f.get('status')}</td>
                <th>CVSS Score</th><td>{f.get('cvss')}</td>
            </tr>
            <tr>
                <th>First Discovered</th><td>{f.get('firstSeen')}</td>
                <th>Last Discovered</th><td>{f.get('lastSeen')}</td>
            </tr>
            <tr>
                <th>CVE Code</th><td>{f.get('cve')}</td>
                <th>Tags</th><td>{f.get('tags')}</td>
            </tr>
        </table>
        
        <div style="margin-top: 15px; font-size: 12px;">
            <strong>Remediation Guidelines:</strong>
            <pre style="background-color: #F8F7F4; border: 1px solid #E5E3DE; padding:10px; border-radius:8px; font-family:inherit; white-space:pre-wrap; margin-top:5px;">{f.get('remediation')}</pre>
        </div>
    </div>
"""
        html += """
</body>
</html>
"""
        return base64.b64encode(html.encode("utf-8")).decode("utf-8")
    return ""

@router.post("/export")
def export_findings(
    format: str = Body(...), # csv, json, markdown, html, pdf
    scope: str = Body(...), # current_page, selected, filtered, all
    findingKeys: Optional[List[Dict[str, str]]] = Body(None),
    filters: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.isActive:
        raise HTTPException(status_code=403, detail="Inactive user cannot export findings.")

    filters_dict = filters or {}
    findings_list = get_findings_list_helper(db, current_user, filters_dict, findingKeys, scope)

    metadata = {
        "generatedBy": current_user.email,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalRecords": len(findings_list),
        "appliedFilters": filters_dict
    }

    b64_content = format_findings_export(format, findings_list, metadata)
    
    # Audit logging
    log_audit_action(
        db, 
        current_user.id, 
        "export", 
        [f.get("id") for f in findings_list], 
        {"format": format, "scope": scope}
    )
    db.commit()

    filename = f"findings_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    ext_map = {"csv": "csv", "json": "json", "markdown": "md", "html": "html", "pdf": "html"}
    ext = ext_map.get(format.lower(), "txt")

    return {
        "filename": f"{filename}.{ext}",
        "mimeType": "application/octet-stream",
        "content": b64_content,
        "metadata": metadata
    }

@router.post("/bulk")
def bulk_update_findings(
    findingKeys: List[Dict[str, str]] = Body(...), # list of { findingCode: str, assetId: str }
    status: Optional[str] = Body(None),
    assignedTo: Optional[str] = Body(None),
    addTags: Optional[List[str]] = Body(None),
    removeTags: Optional[List[str]] = Body(None),
    archive: Optional[bool] = Body(None),
    delete: Optional[bool] = Body(None),
    reRunValidation: Optional[bool] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.isActive:
        raise HTTPException(status_code=403, detail="Inactive user cannot perform bulk actions.")

    updated_count = 0
    resolved_time = datetime.now(timezone.utc)
    assets_to_scan = set()
    affected_ids = []

    for item in findingKeys:
        finding_code = item.get("findingCode")
        asset_id = item.get("assetId")

        if not finding_code or not asset_id:
            continue

        # Check ownership of target asset
        asset = db.query(Asset).filter(Asset.id == asset_id, Asset.userId == current_user.id).first()
        if not asset:
            continue

        assets_to_scan.add(asset_id)

        # Retrieve all scan results for this asset matching the finding code
        scans_subquery = db.query(Scan.id).filter(Scan.assetId == asset_id).subquery()
        results = db.query(ScanResult).filter(
            ScanResult.scanId.in_(scans_subquery),
            ScanResult.findingCode == finding_code,
            ScanResult.isDeleted == False
        ).all()

        for r in results:
            affected_ids.append(r.id)
            if status is not None:
                r.status = status
                if status in RESOLVED_STATUSES:
                    r.resolvedAt = resolved_time
                else:
                    r.resolvedAt = None
            if assignedTo is not None:
                r.assignedTo = assignedTo if assignedTo != "Unassigned" else None
            
            if addTags is not None or removeTags is not None:
                current_tags = set(tag.strip() for tag in (r.tags or "").split(",") if tag.strip())
                if addTags:
                    current_tags.update(addTags)
                if removeTags:
                    current_tags.difference_update(removeTags)
                r.tags = ",".join(sorted(list(current_tags)))
                
            if archive is not None:
                r.isArchived = archive
            if delete is not None:
                r.isDeleted = delete
            updated_count += 1

    # Record in Audit Log
    meta = {
        "status": status,
        "assignedTo": assignedTo,
        "addTags": addTags,
        "removeTags": removeTags,
        "archive": archive,
        "delete": delete,
        "reRunValidation": reRunValidation
    }
    action_type = "bulk_update"
    if status is not None:
        action_type = "bulk_status_change"
    elif assignedTo is not None:
        action_type = "bulk_assignment"
    elif addTags is not None or removeTags is not None:
        action_type = "tag_change"
    elif archive is not None:
        action_type = "archive"
    elif delete is not None:
        action_type = "delete"

    log_audit_action(db, current_user.id, action_type, affected_ids, meta)
    db.commit()

    # Trigger re-run validation scans if requested
    validation_status = "Skipped"
    if reRunValidation and assets_to_scan:
        from services.queue import scan_queue
        for aid in assets_to_scan:
            try:
                asset_obj = db.query(Asset).filter(Asset.id == aid).first()
                if asset_obj:
                    job_payload = {
                        "assetId": asset_obj.id,
                        "scanType": "QUICK",
                        "modules": ["headers", "ssl", "tls", "dns", "waf", "robots", "cookies"]
                    }
                    scan_queue.enqueue_scan(job_payload)
                validation_status = "Scheduled successfully"
            except Exception as e:
                logger.error(f"Failed to queue bulk validation scan: {e}")
                validation_status = f"Failed to schedule: {e}"

    return {
        "message": "Bulk update completed successfully.",
        "updatedOccurrences": updated_count,
        "validationScan": validation_status
    }

@router.post("/ai-assistance")
def get_ai_assistance(
    findingCode: str = Body(...),
    assetId: str = Body(...),
    mode: str = Body(...), # explain, cve, priority, checklist, duplicate
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset ownership
    asset = db.query(Asset).filter(Asset.id == assetId, Asset.userId == current_user.id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset access denied."
        )

    # Get the latest occurrence of the finding to feed to Gemini
    scan_subquery = db.query(Scan.id).filter(Scan.assetId == assetId).subquery()
    finding = db.query(ScanResult).filter(
        ScanResult.scanId.in_(scan_subquery),
        ScanResult.findingCode == findingCode
    ).order_by(ScanResult.createdAt.desc()).first()

    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding code not found on the specified asset."
        )

    # We call Gemini API with customized prompt configurations based on requested mode
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        # Fallback local mock assistant responses
        if mode == "explain":
            return {"response": f"### Detailed Technical Explanation\nThis finding is **{finding.title}**. It represents a vulnerability classified under **{finding.category or 'General Web Security'}**. An attacker could leverage this finding to perform reconnaissance or bypass specific controls.\n\n### Business Impact\nCompromised configurations increase risk, potentially affecting PCI-DSS and SOC2 compliance validation reports."}
        elif mode == "checklist":
            return {"response": f"### Remediation Action Plan Checklist\n- [ ] Review raw scan logs to identify the exact HTTP headers or configurations returned.\n- [ ] Update server web server configuration files (nginx.conf, httpd.conf, or site headers).\n- [ ] Apply changes and execute validation scans to confirm finding status updates to Mitigated."}
        else:
            return {"response": f"Local AI Assistant response generated for mode: {mode} on finding: {finding.title}."}

    # API key exists, call Gemini API
    prompt = ""
    if mode == "explain":
        prompt = f"""
You are an expert security auditor. Explain the finding "{finding.title}" (code: {finding.findingCode}) discovered on {asset.url}.
Provide a detailed explanation of what this vulnerability is, how an attacker could exploit it, the security risk, and the business impact.
Output your response in clear, professional markdown.
"""
    elif mode == "cve":
        prompt = f"""
Analyze the CVE/CWE association for the vulnerability "{finding.title}" (description: {finding.description}).
Explain what the CVE/CWE is, its history, CVSS impact, and how it applies to this specific web target.
Output in clear markdown.
"""
    elif mode == "checklist":
        prompt = f"""
Generate a step-by-step remediation action checklist for "{finding.title}".
Format the checklist as a clear checklist using markdown task lists (- [ ] Task description) with priority order.
Include specific commands or configuration blocks if relevant (e.g. for Nginx, Apache, or Docker).
"""
    elif mode == "priority":
        prompt = f"""
Perform a business priority and threat risk analysis for finding "{finding.title}" on {asset.url}.
Estimate the likelihood of exploitability, business risk, and recommended remediation timeline (e.g. within 24 hours, 7 days, 30 days).
Output in clear markdown.
"""
    else:
        prompt = f"Analyze vulnerability '{finding.title}' and output remediation recommendations in markdown."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
    }

    try:
        import httpx
        response = httpx.post(url, headers=headers, json=payload, timeout=25.0)
        if response.status_code == 200:
            result_json = response.json()
            candidates = result_json.get("candidates", [])
            if candidates:
                text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text_content:
                    return {"response": text_content.strip()}
    except Exception as e:
        logger.error(f"Gemini API execution failed: {e}")

    # Fallback if API call fails
    return {"response": f"Vulnerability detail explanation for **{finding.title}**. (Gemini API timeout, returning default technical mitigation outline: {finding.remediation})"}
