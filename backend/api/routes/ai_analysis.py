import base64
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from database.session import get_db
from database.models import User, Scan, ScanResult, Asset
from api.deps import get_current_user
from services.ai_analysis import AIAnalysisService

router = APIRouter(prefix="/ai-analysis", tags=["AI Analysis"])

@router.get("/latest")
def get_latest_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the latest completed scan for this user's assets
    latest_scan = db.query(Scan).join(Asset).filter(
        Asset.userId == current_user.id,
        Scan.status == "COMPLETED"
    ).order_by(Scan.createdAt.desc()).first()

    if not latest_scan:
        return {
            "scanId": None,
            "overallRiskScore": 0,
            "severityCounts": {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0},
            "prioritizedRisks": [],
            "remediationRoadmap": {"phase1": [], "phase2": [], "phase3": [], "phase4": []},
            "complianceMapping": {},
            "technologyStack": [],
            "executiveSummary": "No AI analysis has been generated for this scan.",
            "riskNarrative": "No completed scans are currently available in the database.",
            "message": "No AI analysis has been generated for this scan."
        }

    try:
        report = AIAnalysisService.generate_analysis_report(db, latest_scan.id)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analysis: {str(e)}"
        )

@router.get("/{scan_id}")
def get_scan_analysis(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(
        Scan.id == scan_id,
        Asset.userId == current_user.id
    ).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found."
        )

    try:
        report = AIAnalysisService.generate_analysis_report(db, scan_id)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analysis: {str(e)}"
        )

@router.post("/{scan_id}/generate")
def force_regenerate_analysis(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).join(Asset).filter(
        Scan.id == scan_id,
        Asset.userId == current_user.id
    ).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found."
        )

    try:
        report = AIAnalysisService.generate_analysis_report(db, scan_id, force=True)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate analysis: {str(e)}"
        )

@router.get("/{scan_id}/export")
def export_analysis_report(
    scan_id: str,
    format: str = Query(..., pattern="^(json|markdown|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    report = AIAnalysisService.generate_analysis_report(db, scan_id)

    filename = f"AI_Security_Analysis_{scan_id}"
    mime_type = "application/json"
    content_bytes = b""

    if format == "json":
        content_bytes = json.dumps(report, indent=2).encode("utf-8")
        mime_type = "application/json"
        filename += ".json"

    elif format == "markdown":
        # Generate elegant markdown text report
        md_text = f"""# AI Security Analysis Report — {report.get('targetUrl')}
Generated At: {report.get('scanDate')}
Overall Risk Score: {report.get('overallRiskScore')}/100 ({report.get('riskLevel')} Risk)
Security Posture: {report.get('posture')}

## Executive Summary
{report.get('executiveSummary')}

## Risk Narrative
{report.get('riskNarrative')}

## Top Prioritized Risks
"""
        for i, r in enumerate(report.get("prioritizedRisks", [])):
            md_text += f"{i+1}. **[{r.get('severity')}] {r.get('title')}** (CVSS: {r.get('cvss')}) - {r.get('impactText')}\n"

        md_text += "\n## Remediation Roadmap\n"
        roadmap = report.get("remediationRoadmap", {})
        for phase, label in [("phase1", "Phase 1 (Immediate, 0-7 days)"), ("phase2", "Phase 2 (Short Term, 7-14 days)"), ("phase3", "Phase 3 (Medium Term, 14-30 days)"), ("phase4", "Phase 4 (Long Term, 30+ days)")]:
            md_text += f"### {label}\n"
            recs = roadmap.get(phase, [])
            if not recs:
                md_text += "*No tasks scheduled.*\n"
            for r in recs:
                md_text += f"- **{r.get('title')}** (Effort: {r.get('effort')}) - {r.get('remediationText')}\n"
            md_text += "\n"

        md_text += "\n## Compliance Mapping\n"
        for standard, mappings in report.get("complianceMapping", {}).items():
            md_text += f"- **{standard}**: {', '.join(mappings)}\n"

        content_bytes = md_text.encode("utf-8")
        mime_type = "text/markdown"
        filename += ".md"

    elif format == "pdf":
        # Generate clean printable HTML template (which browsers can print/save as PDF)
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AI Security Analysis Report</title>
<style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #2C2C2A; line-height: 1.5; padding: 40px; background-color: #FAFAF7; }}
    .header {{ border-bottom: 2px solid #E5E3DE; padding-bottom: 20px; margin-bottom: 30px; }}
    h1 {{ font-size: 28px; font-weight: 350; margin: 0; color: #111; }}
    .meta {{ font-size: 12px; color: #777; margin-top: 5px; }}
    .score-badge {{ display: inline-block; padding: 6px 14px; background: #DF5442; color: white; border-radius: 20px; font-weight: bold; font-size: 13px; margin-top: 10px; }}
    .section {{ margin-bottom: 35px; background: white; padding: 25px; border-radius: 16px; border: 1px solid #E5E3DE; }}
    h2 {{ font-size: 18px; border-bottom: 1px solid #E5E3DE; padding-bottom: 8px; margin-top: 0; }}
    ul {{ padding-left: 20px; }}
    li {{ margin-bottom: 8px; }}
</style>
</head>
<body>
<div class="header">
    <h1>AI Security Analysis Report</h1>
    <div class="meta">Asset: {report.get('targetUrl')} | Generated: {report.get('scanDate')}</div>
    <div class="score-badge">Overall Risk: {report.get('overallRiskScore')}/100 ({report.get('posture')})</div>
</div>
<div class="section">
    <h2>1. Executive Summary</h2>
    <p>{report.get('executiveSummary')}</p>
</div>
<div class="section">
    <h2>2. Risk Narrative</h2>
    <p>{report.get('riskNarrative')}</p>
</div>
<div class="section">
    <h2>3. Prioritized Risks</h2>
    <ul>
"""
        for r in report.get("prioritizedRisks", []):
            html_content += f"<li><strong>[{r.get('severity')}] {r.get('title')}</strong> (CVSS: {r.get('cvss')}) - {r.get('impactText')}</li>"
        html_content += """
    </ul>
</div>
</body>
</html>
"""
        content_bytes = html_content.encode("utf-8")
        mime_type = "text/html"
        filename += ".html"

    # Base64 encode file content
    encoded_content = base64.b64encode(content_bytes).decode("utf-8")

    return {
        "filename": filename,
        "mimeType": mime_type,
        "content": encoded_content
    }
