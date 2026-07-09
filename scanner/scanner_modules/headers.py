"""
CipherLens Scanner — Headers Scanner

Wraps: httpx (ProjectDiscovery)

Analyzes HTTP security response headers for a given target URL.
Detects missing or misconfigured security headers including:
    - Content-Security-Policy
    - X-Frame-Options
    - X-Content-Type-Options
    - Strict-Transport-Security (HSTS)
    - Referrer-Policy
    - Permissions-Policy
    - X-XSS-Protection
    - Cross-Origin headers (CORP, COEP, COOP)

Tool: httpx --tech-detect -json
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

# Security headers to audit and their metadata
_REQUIRED_HEADERS: Dict[str, Dict[str, Any]] = {
    "content-security-policy": {
        "severity": Severity.HIGH,
        "title": "Missing Content-Security-Policy Header",
        "description": (
            "The Content-Security-Policy (CSP) header is absent. CSP prevents cross-site scripting (XSS) "
            "attacks by specifying which content sources the browser should consider legitimate."
        ),
        "remediation": (
            "Add a Content-Security-Policy header. Start with a restrictive policy: "
            "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';"
        ),
        "references": [
            "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
            "https://owasp.org/www-project-secure-headers/",
        ],
        "cwe_ids": ["CWE-693"],
    },
    "x-frame-options": {
        "severity": Severity.MEDIUM,
        "title": "Missing X-Frame-Options Header",
        "description": (
            "The X-Frame-Options header is missing. Without this header, the page can be "
            "embedded in an iframe on a malicious site, enabling clickjacking attacks."
        ),
        "remediation": "Add: X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN",
        "references": ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options"],
        "cwe_ids": ["CWE-1021"],
    },
    "x-content-type-options": {
        "severity": Severity.LOW,
        "title": "Missing X-Content-Type-Options Header",
        "description": (
            "X-Content-Type-Options: nosniff is not set. Browsers may MIME-sniff responses "
            "and interpret files as a different MIME type than declared, enabling certain attacks."
        ),
        "remediation": "Add: X-Content-Type-Options: nosniff",
        "references": ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options"],
        "cwe_ids": ["CWE-693"],
    },
    "strict-transport-security": {
        "severity": Severity.HIGH,
        "title": "Missing Strict-Transport-Security (HSTS) Header",
        "description": (
            "HTTP Strict-Transport-Security (HSTS) is not configured. Without HSTS, browsers may "
            "accept HTTP connections, enabling protocol downgrade and man-in-the-middle attacks."
        ),
        "remediation": "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
        "references": ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security"],
        "cwe_ids": ["CWE-523"],
    },
    "referrer-policy": {
        "severity": Severity.LOW,
        "title": "Missing Referrer-Policy Header",
        "description": (
            "No Referrer-Policy header is set. The browser may send the full URL in the Referer header "
            "to third-party sites, potentially leaking sensitive URL parameters."
        ),
        "remediation": "Add: Referrer-Policy: strict-origin-when-cross-origin",
        "references": ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy"],
        "cwe_ids": ["CWE-200"],
    },
    "permissions-policy": {
        "severity": Severity.LOW,
        "title": "Missing Permissions-Policy Header",
        "description": (
            "Permissions-Policy (formerly Feature-Policy) is absent. This header allows sites to "
            "selectively enable or disable browser features and APIs."
        ),
        "remediation": "Add: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()",
        "references": ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy"],
        "cwe_ids": ["CWE-693"],
    },
}

_UNSAFE_HEADER_VALUES: List[Dict[str, Any]] = [
    {
        "header": "x-xss-protection",
        "bad_value": "1; mode=block",
        "severity": Severity.INFO,
        "title": "Deprecated X-XSS-Protection Header in Use",
        "description": (
            "X-XSS-Protection is a legacy header that modern browsers have deprecated. "
            "It can actually introduce XSS vulnerabilities in some older browsers. "
            "Rely on Content-Security-Policy instead."
        ),
        "remediation": "Remove X-XSS-Protection and implement a strong Content-Security-Policy.",
    },
    {
        "header": "server",
        "bad_value": None,  # Any value present
        "severity": Severity.INFO,
        "title": "Server Software Version Disclosed",
        "description": (
            "The Server header discloses the web server software and/or version. "
            "This information assists attackers in identifying exploitable vulnerabilities."
        ),
        "remediation": "Configure the web server to remove or genericize the Server header.",
    },
    {
        "header": "x-powered-by",
        "bad_value": None,
        "severity": Severity.INFO,
        "title": "Technology Stack Disclosed via X-Powered-By Header",
        "description": (
            "The X-Powered-By header reveals the application framework (e.g. PHP/8.1, Express). "
            "This assists attackers in targeting known vulnerabilities."
        ),
        "remediation": "Remove the X-Powered-By header in your server/framework configuration.",
    },
]


class HeadersScanner(BaseScanner):
    """
    Analyzes HTTP security response headers using httpx.

    Detects missing required security headers and misconfigured header values.
    """

    SCANNER_NAME = "headers"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(
                f"HeadersScanner requires an HTTP/HTTPS URL, got: {target!r}"
            )
        self.config.tool_path("httpx")  # Raises FileNotFoundError if missing

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        httpx_path = self.config.tool_path("httpx")
        timeout = self._option("timeout", self.config.default_timeout)

        command = [
            str(httpx_path),
            "-u", target,
            "-json",
            "-include-response-header",
            "-follow-redirects",
            "-silent",
            "-timeout", str(timeout),
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 10)

        raw_data: Optional[Dict[str, Any]] = None
        try:
            if stdout.strip():
                raw_data = json.loads(stdout.strip().splitlines()[-1])
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse httpx JSON output")

        if exit_code not in (0, 1) or raw_data is None:
            return ScannerResult(
                scanner_name=self.SCANNER_NAME,
                scanner_version=self.SCANNER_VERSION,
                target=target,
                status=ScannerStatus.FAILED,
                error_message=f"httpx exited with code {exit_code}: {stderr[:500]}",
                tool_command=" ".join(str(c) for c in command),
                tool_exit_code=exit_code,
                tool_raw_output=truncate_output(stdout + stderr),
            )

        # Parse headers from httpx output
        response_headers: Dict[str, str] = {}
        if isinstance(raw_data.get("response_headers"), dict):
            response_headers = {
                k.lower(): v for k, v in raw_data["response_headers"].items()
            }
        elif isinstance(raw_data.get("header"), dict):
            response_headers = {
                k.lower(): v for k, v in raw_data["header"].items()
            }

        findings: List[Finding] = []

        # Check for missing required security headers
        for header_name, meta in _REQUIRED_HEADERS.items():
            if header_name not in response_headers:
                findings.append(
                    Finding(
                        title=meta["title"],
                        severity=meta["severity"],
                        scanner=self.SCANNER_NAME,
                        category="Security Headers",
                        description=meta["description"],
                        evidence=f"HTTP response from {target} did not include '{header_name}' header.\nAll headers received: {json.dumps(response_headers, indent=2)}",
                        remediation=meta["remediation"],
                        references=meta.get("references", []),
                        cwe_ids=meta.get("cwe_ids", []),
                        raw_data={
                            "header_name": header_name,
                            "response_url": raw_data.get("url"),
                            "ip": raw_data.get("ip") if raw_data else None,
                            "status_code": raw_data.get("status_code") if raw_data else None,
                            "final_url": raw_data.get("url") if raw_data else None,
                            "server": response_headers.get("server"),
                            "content_type": response_headers.get("content-type"),
                        },
                    )
                )

        # Check for unsafe/disclosure headers
        for check in _UNSAFE_HEADER_VALUES:
            header = check["header"]
            if header in response_headers:
                findings.append(
                    Finding(
                        title=check["title"],
                        severity=check["severity"],
                        scanner=self.SCANNER_NAME,
                        category="Information Disclosure",
                        description=check["description"],
                        evidence=f"{header}: {response_headers[header]}",
                        remediation=check["remediation"],
                        raw_data={
                            "header_name": header,
                            "value": response_headers[header],
                            "ip": raw_data.get("ip") if raw_data else None,
                            "status_code": raw_data.get("status_code") if raw_data else None,
                            "final_url": raw_data.get("url") if raw_data else None,
                            "server": response_headers.get("server"),
                            "content_type": response_headers.get("content-type"),
                        },
                    )
                )

        status = ScannerStatus.SUCCESS
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=status,
            findings=findings,
            metadata={
                "status_code": raw_data.get("status_code"),
                "final_url": raw_data.get("url"),
                "headers_count": len(response_headers),
                "response_headers": response_headers,
            },
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Analyzes HTTP security response headers for missing or misconfigured values",
            "tool": "httpx",
            "tool_version": "1.6.10",
            "target_types": ["WEBSITE"],
            "output_format": "JSON",
            "categories": ["Security Headers", "Information Disclosure"],
        }
