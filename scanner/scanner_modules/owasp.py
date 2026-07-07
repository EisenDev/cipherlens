"""
CipherLens Scanner — OWASP/Nuclei Scanner

Wraps: nuclei (ProjectDiscovery)

Runs curated security template checks against a web target.
Nuclei templates cover:
    - OWASP Top 10 categories
    - CVE checks for known web application vulnerabilities
    - Misconfiguration detection
    - Exposed panel/admin endpoints
    - Default credentials exposure
    - Information disclosure

Tool: nuclei -u <target> -json -severity <levels>
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, parse_jsonl, sanitize_target, truncate_output

import logging

logger = logging.getLogger(__name__)

_SEVERITY_MAP: Dict[str, Severity] = {
    "critical": Severity.CRITICAL,
    "high": Severity.HIGH,
    "medium": Severity.MEDIUM,
    "low": Severity.LOW,
    "info": Severity.INFO,
    "unknown": Severity.INFO,
}


class OWASPScanner(BaseScanner):
    """
    Runs OWASP-aligned security template checks via nuclei.
    Covers CVEs, misconfigurations, exposed endpoints, and known web vulnerabilities.
    """

    SCANNER_NAME = "owasp"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"OWASPScanner requires an HTTP/HTTPS URL, got: {target!r}")
        self.config.tool_path("nuclei")

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        nuclei_path = self.config.tool_path("nuclei")
        timeout = self._option("timeout", 300)
        severity = self._option("nuclei_severity", self.config.nuclei_severity)

        command = [
            str(nuclei_path),
            "-u", target,
            "-jsonl",
            "-silent",
            "-severity", severity,
            "-timeout", "5",
            "-rate-limit", str(self.config.rate_limit_rps),
            "-no-color",
        ]

        # Add custom templates dir if configured, otherwise target vulnerabilities folder
        if self.config.nuclei_templates_dir and self.config.nuclei_templates_dir.exists():
            command += ["-t", str(self.config.nuclei_templates_dir)]
        else:
            command += ["-t", "http/vulnerabilities"]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 30)
        raw_items = parse_jsonl(stdout)

        findings: List[Finding] = []
        for item in raw_items:
            info = item.get("info", {})
            severity_str = info.get("severity", "info").lower()
            template_id = item.get("template-id", "unknown")
            template_name = info.get("name", template_id)
            description = info.get("description", "")
            matched_at = item.get("matched-at", target)
            curl_command = item.get("curl-command", "")
            cve_ids = []
            cwe_ids = []

            # Extract CVE / CWE classifications
            classification = info.get("classification", {})
            if classification:
                cve_ids = classification.get("cve-id", []) or []
                cwe_ids = classification.get("cwe-id", []) or []
                if isinstance(cve_ids, str):
                    cve_ids = [cve_ids]
                if isinstance(cwe_ids, str):
                    cwe_ids = [cwe_ids]

            remediation = info.get("remediation", "Apply the recommended fix per the nuclei template documentation.")
            references = info.get("reference", []) or []
            if isinstance(references, str):
                references = [references]

            findings.append(
                Finding(
                    title=template_name,
                    severity=_SEVERITY_MAP.get(severity_str, Severity.INFO),
                    scanner=self.SCANNER_NAME,
                    category=f"Nuclei/{info.get('tags', 'web')}",
                    description=description or f"Nuclei template '{template_id}' matched against {matched_at}",
                    evidence=(
                        f"Template: {template_id}\n"
                        f"Matched URL: {matched_at}\n"
                        f"Tags: {', '.join(info.get('tags', []) or [])}\n"
                        + (f"curl: {curl_command}" if curl_command else "")
                    ),
                    cve_ids=cve_ids,
                    cwe_ids=cwe_ids,
                    remediation=remediation,
                    references=references[:5],  # Cap references
                    raw_data={
                        "template_id": template_id,
                        "matched_at": matched_at,
                        "severity": severity_str,
                    },
                )
            )

        status = ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=status,
            findings=findings,
            metadata={"templates_executed": len(raw_items)},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "OWASP-aligned vulnerability checks via nuclei templates (CVEs, misconfigs, exposed endpoints)",
            "tool": "nuclei",
            "tool_version": "3.3.9",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
            "categories": ["OWASP", "CVE", "Misconfiguration"],
        }
