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
import re
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urljoin

import requests

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
        timeout = self._option("timeout", self.config.default_timeout)
        depth = int(self._option("crawler_depth", self.config.crawler_depth))
        robots_patterns = self._load_robots_exclusions() if self._option("respect_robots", True) else []
        command = self.build_command(robots_patterns)

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 30)
        raw_items = parse_jsonl(stdout)
        findings: List[Finding] = []
        discovered_urls: List[str] = []

        for item in raw_items:
            if len(discovered_urls) >= self.max_pages:
                break
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
            tool_command=self._redacted_command(command, {"-headers", "-proxy"}),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    @property
    def max_pages(self) -> int:
        """Maximum number of crawler results accepted into scan output."""
        return int(self._option("crawler_max_pages", self.config.crawler_max_pages))

    def build_command(self, additional_exclusions: List[str] | None = None) -> List[str]:
        """Build a Katana invocation from validated canonical scan options."""
        target = sanitize_target(self.target)
        command = [
            str(self.config.tool_path("katana")),
            "-u", target,
            "-jsonl",
            "-depth", str(self._option("crawler_depth", self.config.crawler_depth)),
            "-silent",
            "-timeout", str(self._option("timeout", self.config.request_timeout)),
            "-concurrency", str(self._option("max_concurrent", self.config.default_concurrency)),
            "-rate-limit", str(self._option("rate_limit_rps", self.config.rate_limit_rps)),
            "-retry", str(self._option("max_retries", self.config.max_retries)),
            "-no-color",
        ]

        delay_ms = int(self._option("request_delay_ms", 0))
        if delay_ms > 0:
            command.extend(["-delay", str(max(1, delay_ms // 1000))])
        if self._option("respect_robots", True):
            command.extend(["-known-files", "robotstxt,sitemapxml"])
        if self._option("discover_forms", False):
            command.append("-form-extraction")
        if self._option("ignore_query_params", []):
            command.append("-ignore-query-params")
        if not self._option("follow_redirects", int(self._option("max_redirects", 10)) > 0):
            command.append("-disable-redirects")

        if self._option("crawl_external_links", False):
            command.append("-no-scope")
        else:
            scope = "rdn" if self._option("crawl_subdomains", False) else "fqdn"
            command.extend(["-field-scope", scope])

        extensions = self._option("excluded_extensions", [])
        if extensions:
            command.extend(["-extension-filter", ",".join(extensions)])
        patterns = list(self._option("excluded_url_patterns", []))
        patterns.extend(additional_exclusions or [])
        for pattern in patterns:
            command.extend(["-crawl-out-scope", pattern])
        proxy_url = self._option("proxy_url", "")
        if proxy_url:
            command.extend(["-proxy", proxy_url])

        headers = list(self._option("custom_headers", []))
        user_agent = self._option("user_agent", "")
        if user_agent:
            headers.append({"name": "User-Agent", "value": user_agent})
        for header in headers:
            command.extend(["-headers", f"{header['name']}:{header['value']}"])
        return command

    def _load_robots_exclusions(self) -> List[str]:
        """Load target-origin robots exclusions without following redirects."""
        target = sanitize_target(self.target)
        headers = {
            header["name"]: header["value"]
            for header in self._option("custom_headers", [])
        }
        user_agent = self._option("user_agent", "")
        if user_agent:
            headers["User-Agent"] = user_agent
        proxy_url = self._option("proxy_url", "")
        proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
        try:
            response = requests.get(
                urljoin(f"{target}/", "/robots.txt"),
                headers=headers,
                proxies=proxies,
                timeout=int(self._option("connection_timeout", 10)),
                allow_redirects=False,
            )
            if response.status_code != 200:
                return []
            return self._parse_robots_disallow(response.text)
        except requests.RequestException:
            return []

    @staticmethod
    def _parse_robots_disallow(content: str) -> List[str]:
        """Convert non-empty Disallow paths into conservative URL regexes."""
        patterns: List[str] = []
        for line in content.splitlines():
            directive, separator, raw_value = line.partition(":")
            if not separator or directive.strip().lower() != "disallow":
                continue
            path = raw_value.split("#", 1)[0].strip()
            if path:
                patterns.append(rf".*{re.escape(path)}.*")
        return patterns

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
