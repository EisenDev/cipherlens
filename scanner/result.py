"""
CipherLens Scanner Engine — Result Models

Defines the standardized data structures all scanner modules must return.
Every scanner must produce a ScannerResult. Raw tool output must be
normalized into Finding objects before being returned to the manager.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    """Standardized severity levels for security findings."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ScannerStatus(str, Enum):
    """Execution status codes for individual scanner modules."""

    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"      # Ran but some sub-checks failed
    FAILED = "FAILED"        # Scanner aborted
    SKIPPED = "SKIPPED"      # Skipped due to config / unsupported target
    TIMEOUT = "TIMEOUT"      # Execution exceeded time limit


class Finding(BaseModel):
    """
    A single normalized security finding produced by a scanner module.

    All scanner modules must produce Finding objects — never raw dicts.
    """

    id: str = Field(
        default_factory=lambda: f"CLENS-{uuid.uuid4().hex[:8].upper()}",
        description="Unique finding identifier (e.g. CLENS-A1B2C3D4)",
    )
    title: str = Field(..., description="Short human-readable title of the finding")
    severity: Severity = Field(..., description="Risk severity level")
    scanner: str = Field(..., description="Name of the scanner module that found this")
    category: str = Field(..., description="Finding category (e.g. Headers, SSL, Secrets)")
    description: str = Field(..., description="Technical description of the vulnerability")
    evidence: str = Field(
        ...,
        description="Raw snippet of tool output, network response, or code that proves this finding",
    )
    cve_ids: List[str] = Field(
        default_factory=list,
        description="Related CVE identifiers if applicable",
    )
    cwe_ids: List[str] = Field(
        default_factory=list,
        description="Related CWE identifiers if applicable",
    )
    remediation: str = Field(
        ..., description="Actionable developer instructions to fix this finding"
    )
    references: List[str] = Field(
        default_factory=list,
        description="URLs to documentation, OWASP links, or security advisories",
    )
    # Source location (for code/repository scanners)
    file_path: Optional[str] = Field(
        None, description="Relative file path if this is a code-level finding"
    )
    line_number: Optional[int] = Field(
        None, description="Line number in source file if applicable"
    )
    # Raw metadata from underlying tool (stored for evidence preservation)
    raw_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Raw normalized tool output for this finding — never alter after collection",
    )
    discovered_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when this finding was recorded",
    )


class ScannerResult(BaseModel):
    """
    Complete result package returned by a single scanner module.

    The ScannerManager collects ScannerResult objects from each module
    and aggregates them into the final scan report.
    """

    scanner_name: str = Field(..., description="Canonical name of the scanner module")
    scanner_version: str = Field(
        default="1.0.0", description="Version of the scanner module"
    )
    target: str = Field(..., description="Scan target (URL, domain, or file path)")
    status: ScannerStatus = Field(..., description="Execution status of this scanner")
    findings: List[Finding] = Field(
        default_factory=list,
        description="All normalized security findings from this scanner",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional execution metadata (tool version, command used, etc.)",
    )
    duration_seconds: float = Field(
        default=0.0, description="Wall-clock execution time in seconds"
    )
    tool_command: Optional[str] = Field(
        None, description="Full CLI command that was executed"
    )
    tool_exit_code: Optional[int] = Field(
        None, description="Exit code returned by the underlying tool"
    )
    tool_raw_output: Optional[str] = Field(
        None,
        description="Raw stdout/stderr from the underlying tool — never modified",
    )
    error_message: Optional[str] = Field(
        None, description="Error description if status is FAILED or TIMEOUT"
    )
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when this scanner started",
    )
    finished_at: Optional[datetime] = Field(
        None, description="UTC timestamp when this scanner completed"
    )

    @property
    def finding_count(self) -> int:
        """Total number of findings produced."""
        return len(self.findings)

    @property
    def critical_count(self) -> int:
        """Number of CRITICAL severity findings."""
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def high_count(self) -> int:
        """Number of HIGH severity findings."""
        return sum(1 for f in self.findings if f.severity == Severity.HIGH)

    @property
    def medium_count(self) -> int:
        """Number of MEDIUM severity findings."""
        return sum(1 for f in self.findings if f.severity == Severity.MEDIUM)

    @property
    def low_count(self) -> int:
        """Number of LOW severity findings."""
        return sum(1 for f in self.findings if f.severity == Severity.LOW)

    @property
    def info_count(self) -> int:
        """Number of INFO severity findings."""
        return sum(1 for f in self.findings if f.severity == Severity.INFO)


class AggregatedScanResult(BaseModel):
    """
    Final aggregated output collected by the ScannerManager after all modules run.

    This is the top-level result object that will later be persisted to PostgreSQL
    and displayed in the CipherLens dashboard.
    """

    scan_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique identifier for this full scan run",
    )
    target: str = Field(..., description="Primary scan target")
    target_type: str = Field(
        ..., description="Target type: WEBSITE or REPOSITORY"
    )
    scanner_results: List[ScannerResult] = Field(
        default_factory=list,
        description="Individual results from each scanner module",
    )
    overall_status: ScannerStatus = Field(
        default=ScannerStatus.SUCCESS,
        description="Aggregated status across all scanners",
    )
    total_duration_seconds: float = Field(
        default=0.0, description="Total wall-clock time for all scanners"
    )
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    finished_at: Optional[datetime] = Field(None)

    @property
    def all_findings(self) -> List[Finding]:
        """Flat list of all findings across all scanner modules."""
        findings: List[Finding] = []
        for result in self.scanner_results:
            findings.extend(result.findings)
        return findings

    @property
    def total_findings(self) -> int:
        return len(self.all_findings)

    @property
    def risk_score(self) -> int:
        """
        Compute a 0-100 risk score (100 = perfectly secure, 0 = critical risk).
        Weights: CRITICAL=-25, HIGH=-10, MEDIUM=-5, LOW=-2, INFO=-0.
        Clamped to [0, 100].
        """
        deduction = 0
        for f in self.all_findings:
            if f.severity == Severity.CRITICAL:
                deduction += 25
            elif f.severity == Severity.HIGH:
                deduction += 10
            elif f.severity == Severity.MEDIUM:
                deduction += 5
            elif f.severity == Severity.LOW:
                deduction += 2
        return max(0, min(100, 100 - deduction))
