from typing import List, Optional
from pydantic import BaseModel, Field

class Finding(BaseModel):
    id: str = Field(..., description="Unique vulnerability identifier, e.g. SEC-SEC-001")
    title: str = Field(..., description="Short title of the security issue")
    severity: str = Field(..., description="Vulnerability severity level: CRITICAL, HIGH, MEDIUM, LOW, INFO")
    description: str = Field(..., description="Details regarding what the finding represents")
    evidence: str = Field(..., description="Raw output snippet or configuration snippet serving as proof")
    file_path: Optional[str] = Field(None, description="Affected file path relative to root, if repository scan")
    line_number: Optional[int] = Field(None, description="Affected line number, if repository scan")
    remediation: str = Field(..., description="Developer instructions on how to patch the vulnerability")

class ScanResult(BaseModel):
    target: str = Field(..., description="Scan target identifier, e.g. domain, repository URL, or local path")
    scan_type: str = Field(..., description="Type of scan performed: website or repository")
    status: str = Field(..., description="Overall completion status of the scan: success or failed")
    findings: List[Finding] = Field(default_factory=list, description="Array of detected issues")
    summary: str = Field(..., description="Automated concise scanner execution summary")
