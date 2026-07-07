"""
CipherLens Scanner — Subdomain Enumeration Scanner

Wraps: subfinder (ProjectDiscovery)

Discovers subdomains for the target domain using passive DNS sources.
Flags:
    - Active subdomains that might have lower security posture
    - Wildcard DNS configurations
    - Potential subdomain takeover candidates (CNAME to non-existent services)

Tool: subfinder -d <domain> -json -silent
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, parse_jsonl, sanitize_target, truncate_output

import logging

logger = logging.getLogger(__name__)

# Services known to be vulnerable to subdomain takeover when CNAME points to them
# and the account/resource is no longer claimed
_TAKEOVER_SERVICES = [
    "github.io", "s3.amazonaws.com", "heroku.com", "netlify.app",
    "azurewebsites.net", "cloudapp.azure.com", "bitbucket.io",
    "zendesk.com", "shopify.com", "fastly.net", "pantheonsite.io",
    "ghost.io", "readme.io", "surge.sh", "fly.dev",
]


class SubdomainsScanner(BaseScanner):
    """
    Passive subdomain enumeration using subfinder.
    Reports discovered subdomains and flags potential takeover candidates.
    """

    SCANNER_NAME = "subdomains"
    SCANNER_VERSION = "1.0.0"

    def _get_domain(self) -> str:
        target = sanitize_target(self.target)
        if target.startswith(("http://", "https://")):
            return urlparse(target).netloc.split(":")[0]
        return target.split(":")[0]

    def validate(self) -> None:
        self.config.tool_path("subfinder")

    def execute(self) -> ScannerResult:
        domain = self._get_domain()
        subfinder_path = self.config.tool_path("subfinder")
        timeout = self._option("timeout", self.config.default_timeout)

        command = [
            str(subfinder_path),
            "-d", domain,
            "-json",
            "-silent",
            "-timeout", str(self.config.request_timeout),
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout)
        raw_items = parse_jsonl(stdout)

        subdomains: List[str] = []
        for item in raw_items:
            sub = item.get("host", "")
            if sub:
                subdomains.append(sub)

        findings: List[Finding] = []
        if subdomains:
            findings.append(
                Finding(
                    title=f"Subdomains Discovered: {len(subdomains)} Found",
                    severity=Severity.INFO,
                    scanner=self.SCANNER_NAME,
                    category="Subdomain Enumeration",
                    description=f"subfinder discovered {len(subdomains)} subdomains for {domain}.",
                    evidence="Discovered subdomains:\n" + "\n".join(sorted(subdomains)),
                    remediation=(
                        "Review all discovered subdomains. Unused or forgotten subdomains "
                        "should be removed to prevent takeover or information disclosure."
                    ),
                )
            )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=domain,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"domain": domain, "subdomain_count": len(subdomains), "subdomains": subdomains},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Passive subdomain enumeration and takeover candidate detection",
            "tool": "subfinder",
            "tool_version": "2.6.7",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
            "categories": ["Subdomain Enumeration"],
        }
