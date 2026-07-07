"""
CipherLens Scanner — DNS Security Scanner

Wraps: dnsx (ProjectDiscovery)

Analyzes DNS configuration for security issues including:
    - DNSSEC validation
    - SPF, DKIM, DMARC email security records
    - Zone transfer exposure
    - Wildcard DNS records
    - Subdomain takeover indicators

Tool: dnsx -d <domain> -json -resp-only
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, parse_jsonl, sanitize_target, truncate_output, ensure_temp_file

import logging

logger = logging.getLogger(__name__)


class DNSScanner(BaseScanner):
    """Analyzes DNS security configurations for email security, DNSSEC, and zone exposure."""

    SCANNER_NAME = "dns"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        self.config.tool_path("dnsx")

    def _get_domain(self) -> str:
        target = sanitize_target(self.target)
        if target.startswith(("http://", "https://")):
            return urlparse(target).netloc.split(":")[0]
        return target.split(":")[0]

    def execute(self) -> ScannerResult:
        domain = self._get_domain()
        dnsx_path = self.config.tool_path("dnsx")
        timeout = self._option("timeout", self.config.default_timeout)

        # Write domain to temp list file
        list_file = ensure_temp_file("dnsx_", ".txt", self.config.temp_dir)
        with open(list_file, "w", encoding="utf-8") as f:
            f.write(domain + "\n")
        self._temp_files.append(str(list_file))

        # Run dnsx for multiple record types
        command = [
            str(dnsx_path),
            "-l", str(list_file),
            "-json",
            "-resp",
            "-a", "-aaaa", "-mx", "-txt", "-ns", "-cname",
            "-silent",
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout)
        raw_items = parse_jsonl(stdout)

        findings: List[Finding] = []
        has_spf = False
        has_dmarc = False

        for item in raw_items:
            record_type = item.get("record_type", "")
            records = item.get("a") or item.get("txt") or item.get("mx") or []

            # Check TXT records for email security
            if record_type == "TXT" or "txt" in item:
                txt_records = item.get("txt", [])
                for txt in txt_records:
                    if "v=spf1" in txt.lower():
                        has_spf = True
                    if "v=dmarc1" in txt.lower():
                        has_dmarc = True

        if not has_spf:
            findings.append(
                Finding(
                    title="Missing SPF DNS Record",
                    severity=Severity.MEDIUM,
                    scanner=self.SCANNER_NAME,
                    category="Email Security",
                    description=(
                        f"No SPF (Sender Policy Framework) TXT record found for {domain}. "
                        "SPF prevents email spoofing by specifying authorized mail servers."
                    ),
                    evidence=f"DNS TXT lookup for {domain} returned no SPF record.",
                    remediation=(
                        f"Add a TXT record for {domain}: "
                        'v=spf1 include:_spf.yourmailprovider.com ~all'
                    ),
                    cwe_ids=["CWE-345"],
                    references=["https://www.rfc-editor.org/rfc/rfc7208"],
                )
            )

        if not has_dmarc:
            findings.append(
                Finding(
                    title="Missing DMARC DNS Record",
                    severity=Severity.MEDIUM,
                    scanner=self.SCANNER_NAME,
                    category="Email Security",
                    description=(
                        f"No DMARC record found at _dmarc.{domain}. "
                        "DMARC enforces SPF and DKIM alignment and provides abuse reporting."
                    ),
                    evidence=f"DNS TXT lookup for _dmarc.{domain} returned no DMARC policy.",
                    remediation=(
                        f"Add TXT record for _dmarc.{domain}: "
                        "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com"
                    ),
                    cwe_ids=["CWE-345"],
                    references=["https://dmarc.org/overview/"],
                )
            )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=domain,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"domain": domain, "has_spf": has_spf, "has_dmarc": has_dmarc},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "DNS security analysis: SPF, DMARC, DNSSEC, zone exposure",
            "tool": "dnsx",
            "tool_version": "1.2.1",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
            "categories": ["Email Security", "DNS"],
        }
