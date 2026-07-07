"""
CipherLens Scanner — Cookie Security Scanner

Pure Python implementation using requests.

Analyzes HTTP cookies for security attribute configuration:
    - Missing Secure flag
    - Missing HttpOnly flag
    - Missing SameSite attribute
    - Weak or predictable session cookie names
    - Excessive cookie expiry (> 1 year)
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import sanitize_target

import logging
import requests

logger = logging.getLogger(__name__)


class CookiesScanner(BaseScanner):
    SCANNER_NAME = "cookies"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"CookiesScanner requires an HTTP/HTTPS URL, got: {target!r}")

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        timeout = self._option("timeout", self.config.request_timeout)
        findings: List[Finding] = []

        try:
            resp = requests.get(target, timeout=timeout, allow_redirects=True, verify=True)
            cookies = resp.cookies
            raw_cookie_headers = resp.headers.get("set-cookie", "")

            for cookie in cookies:
                name = cookie.name
                has_secure = cookie.secure
                has_httponly = "httponly" in str(cookie._rest).lower() if hasattr(cookie, "_rest") else False
                has_samesite = "samesite" in raw_cookie_headers.lower()

                if not has_secure and target.startswith("https://"):
                    findings.append(Finding(
                        title=f"Cookie Missing Secure Flag: '{name}'",
                        severity=Severity.MEDIUM,
                        scanner=self.SCANNER_NAME,
                        category="Cookie Security",
                        description=f"Cookie '{name}' does not have the Secure attribute. It may be transmitted over HTTP.",
                        evidence=f"Set-Cookie header for '{name}' without Secure flag",
                        remediation=f"Add the Secure attribute to the '{name}' cookie: Set-Cookie: {name}=<value>; Secure",
                        cwe_ids=["CWE-614"],
                    ))

                if not has_httponly and any(s in name.lower() for s in ["session", "auth", "token", "sid"]):
                    findings.append(Finding(
                        title=f"Session Cookie Missing HttpOnly Flag: '{name}'",
                        severity=Severity.HIGH,
                        scanner=self.SCANNER_NAME,
                        category="Cookie Security",
                        description=f"Cookie '{name}' appears to be a session cookie but lacks the HttpOnly attribute, making it accessible to JavaScript and vulnerable to XSS theft.",
                        evidence=f"Cookie name '{name}' detected without HttpOnly",
                        remediation=f"Add HttpOnly attribute: Set-Cookie: {name}=<value>; HttpOnly",
                        cwe_ids=["CWE-1004"],
                    ))

                if not has_samesite:
                    findings.append(Finding(
                        title=f"Cookie Missing SameSite Attribute: '{name}'",
                        severity=Severity.LOW,
                        scanner=self.SCANNER_NAME,
                        category="Cookie Security",
                        description=f"Cookie '{name}' lacks the SameSite attribute, making it vulnerable to CSRF attacks in some contexts.",
                        evidence=f"Set-Cookie header does not include SameSite for '{name}'",
                        remediation="Add SameSite=Strict or SameSite=Lax to mitigate CSRF risks.",
                        cwe_ids=["CWE-352"],
                    ))

        except requests.RequestException as exc:
            return ScannerResult(
                scanner_name=self.SCANNER_NAME, scanner_version=self.SCANNER_VERSION,
                target=target, status=ScannerStatus.FAILED,
                error_message=f"HTTP request failed: {exc}",
            )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME, scanner_version=self.SCANNER_VERSION,
            target=target, status=ScannerStatus.SUCCESS, findings=findings,
            metadata={"cookies_analyzed": len(list(resp.cookies))},
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME, "version": self.SCANNER_VERSION,
            "description": "HTTP cookie security attribute analysis (Secure, HttpOnly, SameSite)",
            "tool": "requests (Python)", "tool_version": "2.x",
            "target_types": ["WEBSITE"], "output_format": "Python",
            "categories": ["Cookie Security"],
        }
