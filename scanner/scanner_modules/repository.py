"""
CipherLens Scanner — Repository Security Scanner

Wraps: Semgrep

Performs static analysis on source code repositories to detect:
    - Security vulnerabilities (injection, XSS, SSRF, etc.)
    - Insecure code patterns
    - Dependency misconfigurations
    - Hardcoded values beyond secrets (SQL patterns, eval(), etc.)

Uses semgrep's pre-built "auto" ruleset which selects language-appropriate rules.

Tool: semgrep --config auto --json <target_dir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, sanitize_target, truncate_output

import logging

logger = logging.getLogger(__name__)

_SEMGREP_SEVERITY_MAP: Dict[str, Severity] = {
    "ERROR": Severity.HIGH,
    "WARNING": Severity.MEDIUM,
    "INFO": Severity.LOW,
}


class RepositoryScanner(BaseScanner):
    """
    Static analysis of source code using Semgrep.
    Detects code-level vulnerabilities, insecure patterns, and misconfigurations.
    """

    SCANNER_NAME = "repository"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target_path = Path(self.target)
        if not target_path.exists():
            raise ValueError(f"Repository path does not exist: {self.target!r}")
        if not target_path.is_dir():
            raise ValueError(f"Target must be a directory: {self.target!r}")
        self.config.tool_path("semgrep")

    def execute(self) -> ScannerResult:
        semgrep_path = self.config.tool_path("semgrep")
        timeout = self._option("timeout", max(self.config.default_timeout, 300))
        config = self._option("semgrep_config", "auto")

        command = [
            str(semgrep_path),
            "--config", config,
            "--json",
            "--no-rewrite-rule-ids",
            "--quiet",
            self.target,
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout)

        data: Optional[Dict[str, Any]] = None
        try:
            data = json.loads(stdout) if stdout.strip() else {}
        except json.JSONDecodeError:
            logger.warning("Failed to parse Semgrep JSON output")

        findings: List[Finding] = []
        if data:
            for result in data.get("results", []):
                rule_id = result.get("check_id", "unknown")
                message = result.get("extra", {}).get("message", "")
                severity_str = result.get("extra", {}).get("severity", "WARNING")
                path = result.get("path", "")
                start_line = result.get("start", {}).get("line")
                end_line = result.get("end", {}).get("line")
                code_snippet = result.get("extra", {}).get("lines", "")
                metadata = result.get("extra", {}).get("metadata", {})
                cwe_list = metadata.get("cwe", [])
                owasp = metadata.get("owasp", [])
                references = metadata.get("references", [])

                if isinstance(cwe_list, str):
                    cwe_list = [cwe_list]
                if isinstance(owasp, str):
                    owasp = [owasp]

                findings.append(
                    Finding(
                        title=f"Code Vulnerability: {rule_id.split('.')[-1].replace('-', ' ').title()}",
                        severity=_SEMGREP_SEVERITY_MAP.get(severity_str, Severity.MEDIUM),
                        scanner=self.SCANNER_NAME,
                        category=f"SAST/{metadata.get('category', 'general').title()}",
                        description=message or f"Semgrep rule {rule_id} matched.",
                        evidence=(
                            f"Rule: {rule_id}\n"
                            f"File: {path}:{start_line}-{end_line}\n"
                            f"Code:\n{code_snippet}"
                        ),
                        cwe_ids=cwe_list,
                        remediation=(
                            metadata.get("fix", "Review and remediate the identified insecure code pattern. "
                            "Refer to OWASP guidelines for the relevant vulnerability category.")
                        ),
                        references=references[:5],
                        file_path=path or None,
                        line_number=int(start_line) if start_line else None,
                        raw_data={
                            "rule_id": rule_id,
                            "severity": severity_str,
                            "owasp": owasp,
                        },
                    )
                )

        errors = data.get("errors", []) if data else []
        status = ScannerStatus.SUCCESS if not errors else ScannerStatus.PARTIAL

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=self.target,
            status=status,
            findings=findings,
            metadata={
                "rules_matched": len(findings),
                "semgrep_errors": len(errors),
                "config": config,
            },
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "SAST code analysis using Semgrep auto rules for vulnerability and insecure pattern detection",
            "tool": "semgrep",
            "tool_version": "1.168.0",
            "target_types": ["REPOSITORY"],
            "output_format": "JSON",
            "categories": ["SAST"],
        }
