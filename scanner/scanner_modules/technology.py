"""
CipherLens Scanner — Technology Fingerprinting Scanner

Wraps: httpx --tech-detect + Custom Signature Extraction

Detects technologies used by the target web application:
    - Web framework (Django, Rails, Laravel, React, Next.js, Vue, etc.)
    - Server software (Nginx, Apache, IIS)
    - Databases & Cache (PostgreSQL, MySQL, Redis, MongoDB)
    - CMS (WordPress, Drupal, Joomla)
    - CDN and WAF providers
    - Third-party scripts and integrations (Stripe, Google Analytics, Google Fonts)
"""

from __future__ import annotations

import json
import logging
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, sanitize_target, truncate_output

logger = logging.getLogger(__name__)

# High-risk technologies known to have frequent security issues
_HIGH_RISK_TECHNOLOGIES = [
    "wordpress", "joomla", "drupal", "magento", "struts",
    "phpmailer", "log4j", "spring", "websphere", "weblogic",
]

# Rich regex signature matrix for frontend, backend, databases, and third-parties
_SIGNATURE_MATRIX = {
    "Frontend Frameworks & Libraries": {
        "React": [r"react", r"react-dom", r"__reactFiber", r"data-reactroot"],
        "Vue.js": [r"vue", r"v-bind", r"v-model", r"v-if", r"data-v-"],
        "Angular": [r"angular", r"ng-version", r"ng-app", r"ng-controller"],
        "Svelte": [r"svelte-", r"svelte-announcer"],
        "jQuery": [r"jquery", r"jQuery"],
        "Tailwind CSS": [r"tailwind", r"tw-", r"space-y-", r"bg-bg-"],
        "Bootstrap": [r"bootstrap", r"col-md-", r"col-lg-", r"col-sm-"],
    },
    "Backend Frameworks & Platforms": {
        "Node.js / Express": [r"connect\.sid", r"io", r"express", r"sails"],
        "Django": [r"csrftoken", r"django", r"WSGIServer", r"__admin__"],
        "Flask": [r"session", r"flask"],
        "Ruby on Rails": [r"_session_id", r"X-Rack-Cache", r"actionview", r"activerecord"],
        "Laravel": [r"laravel_session", r"Laravel", r"X-Laravel-Cache"],
        "ASP.NET": [r"ASP\.NET_SessionId", r"__VIEWSTATE", r"X-AspNet-Version"],
        "PHP": [r"PHPSESSID", r"\.php", r"X-Powered-By: PHP"],
        "Spring Boot": [r"JSESSIONID", r"spring", r"Spring Boot"],
    },
    "Databases & Cache (Indirect indicators)": {
        "PostgreSQL": [r"postgresql", r"postgres", r"pg_connect", r"pg_query", r"db_host_port=5432"],
        "MySQL / MariaDB": [r"mysql", r"mysqli", r"mysql_connect", r"db_host_port=3306"],
        "MongoDB": [r"mongodb", r"mongo", r"mongoose", r"db_host_port=27017"],
        "Redis": [r"redis", r"ioredis", r"redis-client", r"db_host_port=6379"],
        "SQLite": [r"sqlite", r"sqlite3"],
    },
    "Third-Party Services & Integrations": {
        "Google Analytics": [r"google-analytics\.com", r"gtag", r"ua-", r"googletagmanager\.com"],
        "Stripe": [r"stripe\.com", r"Stripe", r"stripe\.js"],
        "Cloudflare CDN": [r"__cf_bm", r"__cfduid", r"Server: cloudflare", r"cf-ray"],
        "Google Fonts": [r"fonts\.googleapis\.com", r"fonts\.gstatic\.com"],
        "Font Awesome": [r"font-awesome", r"fa-"],
        "Sentry": [r"sentry\.io", r"Sentry"],
    }
}


class TechnologyScanner(BaseScanner):
    """
    Detects web application technology stack via httpx fingerprinting.
    Flags high-risk technologies that have known vulnerability histories.
    """

    SCANNER_NAME = "technology"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"TechnologyScanner requires an HTTP/HTTPS URL, got: {target!r}")
        self.config.tool_path("httpx")

    def _run_custom_signature_scan(self, target: str, timeout: int) -> Dict[str, List[str]]:
        detected: Dict[str, List[str]] = {}
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        headers_str = ""
        body_str = ""
        cookies_str = ""
        
        try:
            req = urllib.request.Request(
                target,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CipherLens/1.0"}
            )
            with urllib.request.urlopen(req, context=ctx, timeout=timeout) as response:
                body_bytes = response.read()
                body_str = body_bytes.decode("utf-8", errors="ignore")
                
                # Fetch headers
                for key, val in response.getheaders():
                    headers_str += f"{key}: {val}\n"
                    if key.lower() == "set-cookie":
                        cookies_str += f"{val}; "
        except Exception as e:
            logger.warning(f"Failed to fetch technology HTML for fallback signature scanning: {e}")
            return detected

        # Run regex matching
        for category, items in _SIGNATURE_MATRIX.items():
            for name, patterns in items.items():
                for pattern in patterns:
                    if (re.search(pattern, body_str, re.IGNORECASE) or
                        re.search(pattern, headers_str, re.IGNORECASE) or
                        re.search(pattern, cookies_str, re.IGNORECASE)):
                        
                        if category not in detected:
                            detected[category] = []
                        if name not in detected[category]:
                            detected[category].append(name)
                        break
                        
        return detected

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        httpx_path = self.config.tool_path("httpx")
        timeout = self._option("timeout", self.config.default_timeout)

        command = [
            str(httpx_path),
            "-u", target,
            "-tech-detect",
            "-json",
            "-silent",
            "-timeout", str(timeout),
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 10)

        raw_data: Optional[Dict[str, Any]] = None
        try:
            lines = [l for l in stdout.strip().splitlines() if l.strip()]
            if lines:
                raw_data = json.loads(lines[-1])
        except json.JSONDecodeError:
            pass

        findings: List[Finding] = []
        technologies: List[str] = []

        if raw_data:
            technologies = raw_data.get("tech", []) or []

        # Run custom regex matrix scanning
        custom_techs = self._run_custom_signature_scan(target, timeout)

        # Merge custom-detected techs into list
        for cat, list_techs in custom_techs.items():
            for tech in list_techs:
                if tech not in technologies:
                    technologies.append(tech)

        if technologies:
            # Build high-fidelity categorization explanation
            desc_lines = [f"The following technology components were detected on {target}:\n"]
            
            # Format custom groupings in description
            for cat, items in custom_techs.items():
                desc_lines.append(f"\n### {cat}")
                for item in items:
                    desc_lines.append(f"* **{item}** — Identified component via index fingerprint signatures.")
            
            # Include default ones if they weren't grouped
            ungrouped = []
            flat_custom = [t for sub in custom_techs.values() for t in sub]
            for tech in technologies:
                if tech not in flat_custom:
                    ungrouped.append(tech)
            if ungrouped:
                desc_lines.append("\n### Other Stack Components")
                for u in ungrouped:
                    desc_lines.append(f"* **{u}** — Detected via HTTPX engine analysis.")

            description = "\n".join(desc_lines)

            findings.append(
                Finding(
                    title=f"Technology Stack Fingerprinted: {', '.join(technologies[:5])}",
                    severity=Severity.INFO,
                    scanner=self.SCANNER_NAME,
                    category="Technology Fingerprint",
                    description=description,
                    evidence=f"Detected technologies: {', '.join(technologies)}",
                    remediation=(
                        "Verify detected technologies are up-to-date and patched. "
                        "Consider removing unnecessary technology disclosures."
                    ),
                    raw_data={
                        "technologies": technologies,
                        "categorized": custom_techs
                    },
                )
            )

            # Flag high-risk technologies
            for tech in technologies:
                tech_lower = tech.lower()
                for high_risk in _HIGH_RISK_TECHNOLOGIES:
                    if high_risk in tech_lower:
                        findings.append(
                            Finding(
                                title=f"High-Risk Technology Detected: {tech}",
                                severity=Severity.MEDIUM,
                                scanner=self.SCANNER_NAME,
                                category="Technology Risk",
                                description=(
                                    f"{tech} has a history of critical CVEs. "
                                    "Ensure it is fully up-to-date and hardened."
                                ),
                                evidence=f"Fingerprinted technology: {tech} on {target}",
                                remediation=(
                                    f"Update {tech} to the latest stable version. "
                                    "Enable automatic security updates. Review security advisories."
                                ),
                                raw_data={"technology": tech},
                            )
                        )
                        break

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"technologies": technologies, "categorized": custom_techs},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Technology fingerprinting and high-risk framework detection",
            "tool": "httpx",
            "tool_version": "1.6.10",
            "target_types": ["WEBSITE"],
            "output_format": "JSON",
            "categories": ["Technology Fingerprint", "Technology Risk"],
        }
