"""
CipherLens Scanner — Web Crawler

Wraps: katana (ProjectDiscovery)

Crawls the target website to enumerate:
    - All discovered URLs and endpoints
    - JavaScript files (for further analysis)
    - Forms and input endpoints
    - API endpoint patterns

Tool: katana -u <target> -json -depth <n>
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, parse_jsonl, sanitize_target, truncate_output

import logging

logger = logging.getLogger(__name__)


class CrawlerScanner(BaseScanner):
    """
    Crawls the target web application to enumerate all accessible endpoints.
    Discovered endpoints are reported as INFO findings for review.
    Unusual or sensitive endpoints (admin, api, backup) are flagged higher.
    """

    SCANNER_NAME = "crawler"
    SCANNER_VERSION = "1.0.0"

    SENSITIVE_PATHS = [
        "admin", "administrator", "wp-admin", "phpmyadmin", "cpanel",
        "panel", "console", "dashboard", "config", "backup",
        ".env", ".git", ".svn", ".htaccess", "api/internal",
        "swagger", "api-docs", "graphql", "debug", "__debug__",
        "actuator", "metrics", "health", "status",
    ]

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"CrawlerScanner requires an HTTP/HTTPS URL, got: {target!r}")
        self.config.tool_path("katana")

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        katana_path = self.config.tool_path("katana")
        timeout = self._option("timeout", self.config.default_timeout)
        depth = self._option("crawler_depth", self.config.crawler_depth)
        max_pages = self._option("crawler_max_pages", self.config.crawler_max_pages)

        command = [
            str(katana_path),
            "-u", target,
            "-jsonl",
            "-depth", str(depth),
            "-silent",
            "-timeout", str(self.config.request_timeout),
            "-rate-limit", str(self.config.rate_limit_rps),
            "-no-color",
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 30)
        raw_items = parse_jsonl(stdout)
        findings: List[Finding] = []
        discovered_urls: List[str] = []

        for item in raw_items:
            url = item.get("request", {}).get("endpoint", "") or item.get("endpoint", "")
            if not url:
                continue
            discovered_urls.append(url)

            # Flag sensitive endpoints
            url_lower = url.lower()
            for sensitive in self.SENSITIVE_PATHS:
                if sensitive in url_lower:
                    findings.append(
                        Finding(
                            title=f"Sensitive Endpoint Discovered: {sensitive}",
                            severity=Severity.MEDIUM,
                            scanner=self.SCANNER_NAME,
                            category="Exposed Endpoint",
                            description=(
                                f"The crawler discovered a potentially sensitive endpoint at {url}. "
                                f"Sensitive path keyword: '{sensitive}'."
                            ),
                            evidence=f"Discovered URL: {url}\nKeyword matched: {sensitive}",
                            remediation=(
                                f"Verify whether '{url}' should be publicly accessible. "
                                "Restrict access via authentication, network controls, or removal if unused."
                            ),
                            cwe_ids=["CWE-200"],
                            raw_data=item,
                        )
                    )
                    break  # One finding per URL

        # Summary finding for crawl coverage
        if discovered_urls:
            findings.append(
                Finding(
                    title=f"Crawl Complete: {len(discovered_urls)} Endpoints Discovered",
                    severity=Severity.INFO,
                    scanner=self.SCANNER_NAME,
                    category="Crawl Summary",
                    description=f"katana crawled {target} to depth {depth} and discovered {len(discovered_urls)} URLs.",
                    evidence="Top 20 discovered URLs:\n" + "\n".join(discovered_urls[:20]),
                    remediation="Review the endpoint list for unintended public exposure.",
                    raw_data={"total_urls": len(discovered_urls), "depth": depth},
                )
            )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"discovered_urls_count": len(discovered_urls), "depth": depth},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Web crawler that enumerates endpoints and flags sensitive paths",
            "tool": "katana",
            "tool_version": "1.1.0",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
            "categories": ["Exposed Endpoint", "Crawl Summary"],
        }
