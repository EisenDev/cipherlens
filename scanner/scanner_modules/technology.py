"""Passive, evidence-backed public web technology fingerprinting."""

from __future__ import annotations

import json
import logging
import re
import ssl
import sys
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, sanitize_target, truncate_output

logger = logging.getLogger(__name__)

_HIGH_RISK_TECHNOLOGIES = {
    "wordpress", "joomla", "drupal", "magento", "struts", "weblogic"
}

_CATEGORY_ALIASES = {
    "react": "Frontend Frameworks & Libraries",
    "vue.js": "Frontend Frameworks & Libraries",
    "vue": "Frontend Frameworks & Libraries",
    "angular": "Frontend Frameworks & Libraries",
    "svelte": "Frontend Frameworks & Libraries",
    "bootstrap": "Frontend Frameworks & Libraries",
    "tailwind css": "Frontend Frameworks & Libraries",
    "express": "Backend Frameworks & Platforms",
    "node.js": "Backend Frameworks & Platforms",
    "node.js / express": "Backend Frameworks & Platforms",
    "django": "Backend Frameworks & Platforms",
    "flask": "Backend Frameworks & Platforms",
    "laravel": "Backend Frameworks & Platforms",
    "spring boot": "Backend Frameworks & Platforms",
    "asp.net": "Backend Frameworks & Platforms",
    "postgresql": "Databases & Cache",
    "mysql": "Databases & Cache",
    "mariadb": "Databases & Cache",
    "mongodb": "Databases & Cache",
    "redis": "Databases & Cache",
    "sqlite": "Databases & Cache",
    "cloudflare": "Edge / CDN / WAF",
    "cloudflare cdn": "Edge / CDN / WAF",
    "akamai": "Edge / CDN / WAF",
    "fastly": "Edge / CDN / WAF",
}

# Patterns are deliberately specific. Generic words such as "session", "spring", "io",
# and "express" are not sufficient evidence of a backend technology.
_SIGNATURES = (
    ("React", "Frontend Frameworks & Libraries", r"(?:react-dom|data-reactroot|__reactFiber|/react(?:\.production)?\.min\.js)", "body"),
    ("Vue.js", "Frontend Frameworks & Libraries", r"(?:data-v-[0-9a-f]{4,}|__VUE__|/vue(?:\.runtime)?(?:\.global)?(?:\.prod)?\.js)", "body"),
    ("Angular", "Frontend Frameworks & Libraries", r"(?:ng-version=|<app-root\b|angular\.min\.js)", "body"),
    ("Svelte", "Frontend Frameworks & Libraries", r"(?:class=\"svelte-[^\"]+|svelte-announcer)", "body"),
    ("Bootstrap", "Frontend Frameworks & Libraries", r"(?:bootstrap(?:\.min)?\.(?:css|js)|class=\"[^\"]*\bcol-(?:sm|md|lg)-)", "body"),
    ("Node.js / Express", "Backend Frameworks & Platforms", r"^x-powered-by:\s*express\s*$", "headers"),
    ("Django", "Backend Frameworks & Platforms", r"(?:^set-cookie:\s*csrftoken=|^server:\s*WSGIServer)", "headers"),
    ("Laravel", "Backend Frameworks & Platforms", r"(?:^set-cookie:\s*laravel_session=|^x-powered-by:\s*Laravel)", "headers"),
    ("ASP.NET", "Backend Frameworks & Platforms", r"(?:^x-aspnet-version:|^set-cookie:\s*ASP\.NET_SessionId=)", "headers"),
    ("PHP", "Backend Frameworks & Platforms", r"^x-powered-by:\s*PHP(?:/[^\s]+)?\s*$", "headers"),
    ("Cloudflare", "Edge / CDN / WAF", r"(?:^server:\s*cloudflare\s*$|^cf-ray:)", "headers"),
    ("Fastly", "Edge / CDN / WAF", r"(?:^x-served-by:.*cache-|^via:.*varnish)", "headers"),
    ("Google Analytics", "Third-Party Services & Integrations", r"(?:googletagmanager\.com|google-analytics\.com|\bgtag\s*\()", "body"),
    ("Stripe", "Third-Party Services & Integrations", r"js\.stripe\.com", "body"),
    ("Sentry", "Third-Party Services & Integrations", r"(?:sentry\.io|Sentry\.init\s*\()", "body"),
)


class TechnologyScanner(BaseScanner):
    """Fingerprint only technology signals observable at the public HTTP boundary."""

    SCANNER_NAME = "technology"
    SCANNER_VERSION = "2.0.0"
    MAX_BODY_BYTES = 2 * 1024 * 1024

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(
                f"TechnologyScanner requires an HTTP/HTTPS URL, got: {target!r}"
            )
        self.config.tool_path("httpx")

    @staticmethod
    def _category_for(technology: str) -> str:
        return _CATEGORY_ALIASES.get(
            technology.casefold(), "Other Stack Components"
        )

    def _match_signatures(
        self, *, headers: str, cookies: str, body: str
    ) -> List[Dict[str, str]]:
        """Return passive matches with the exact source and signal preserved."""
        sources = {"headers": headers, "cookies": cookies, "body": body}
        matches: List[Dict[str, str]] = []
        for name, category, pattern, source in _SIGNATURES:
            match = re.search(pattern, sources[source], re.IGNORECASE | re.MULTILINE)
            if not match:
                continue
            signal = match.group(0)[:240]
            matches.append(
                {
                    "name": name,
                    "category": category,
                    "source": f"http_{source}",
                    "confidence": "confirmed" if source == "headers" else "probable",
                    "signal": signal,
                }
            )
        return matches

    def _run_custom_signature_scan(
        self, target: str, timeout: int
    ) -> List[Dict[str, str]]:
        context = ssl.create_default_context()
        request = urllib.request.Request(
            target,
            headers={"User-Agent": "CipherLens/2.0 (+defensive-security-audit)"},
        )
        try:
            with urllib.request.urlopen(
                request, context=context, timeout=min(timeout, 30)
            ) as response:
                body = response.read(self.MAX_BODY_BYTES).decode("utf-8", errors="ignore")
                header_lines = [f"{key}: {value}" for key, value in response.getheaders()]
                cookies = "\n".join(
                    value
                    for key, value in response.getheaders()
                    if key.casefold() == "set-cookie"
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Passive technology response collection failed: %s", exc)
            return []
        return self._match_signatures(
            headers="\n".join(header_lines), cookies=cookies, body=body
        )

    @staticmethod
    def _merge_inventory(
        httpx_technologies: List[str], passive_signals: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        inventory = list(passive_signals)
        seen = {item["name"].casefold() for item in inventory}
        for technology in httpx_technologies:
            if technology.casefold() in seen:
                continue
            inventory.append(
                {
                    "name": technology,
                    "category": TechnologyScanner._category_for(technology),
                    "source": "httpx",
                    "confidence": "possible",
                    "signal": f"httpx tech-detect: {technology}",
                }
            )
            seen.add(technology.casefold())
        return inventory

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        timeout = self._option("timeout", self.config.default_timeout)
        command = [
            str(self.config.tool_path("httpx")), "-u", target, "-tech-detect",
            "-json", "-silent", "-timeout", str(timeout), "-include-response-header",
        ]
        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 10)

        raw_data: Optional[Dict[str, Any]] = None
        try:
            lines = [line for line in stdout.splitlines() if line.strip()]
            if lines:
                raw_data = json.loads(lines[-1])
        except json.JSONDecodeError:
            logger.warning("httpx returned non-JSON technology output")

        httpx_technologies = list((raw_data or {}).get("tech") or [])
        passive_signals = self._run_custom_signature_scan(target, timeout)
        inventory = self._merge_inventory(httpx_technologies, passive_signals)
        findings: List[Finding] = []

        if inventory:
            grouped: Dict[str, List[Dict[str, str]]] = {}
            for item in inventory:
                grouped.setdefault(item["category"], []).append(item)
            description_lines = [
                "Technologies observable at the public HTTP boundary were fingerprinted."
            ]
            for category, items in grouped.items():
                description_lines.append(f"\n### {category}")
                for item in items:
                    description_lines.append(
                        f"* **{item['name']}** — {item['confidence']} via {item['source']}."
                    )
            if "Backend Frameworks & Platforms" not in grouped:
                description_lines.append("\nBackend framework: not externally detectable.")
            if "Databases & Cache" not in grouped:
                description_lines.append("Database/cache: not externally detectable.")

            names = [item["name"] for item in inventory]
            evidence = "\n".join(
                f"{item['name']} [{item['source']}/{item['confidence']}]: {item['signal']}"
                for item in inventory
            )
            findings.append(
                Finding(
                    title=f"Technology Stack Fingerprinted: {', '.join(names[:5])}",
                    severity=Severity.INFO,
                    scanner=self.SCANNER_NAME,
                    category="Technology Fingerprint",
                    description="\n".join(description_lines),
                    evidence=evidence,
                    remediation=(
                        "Verify detected components and versions through an authenticated "
                        "inventory or SBOM; remove unnecessary public technology disclosures."
                    ),
                    raw_data={
                        "inventory": inventory,
                        "ip": (raw_data or {}).get("ip"),
                        "status_code": (raw_data or {}).get("status_code"),
                        "final_url": (raw_data or {}).get("url"),
                        "server": ((raw_data or {}).get("response_headers") or {}).get("server"),
                    },
                )
            )

            for item in inventory:
                if item["name"].casefold() not in _HIGH_RISK_TECHNOLOGIES:
                    continue
                findings.append(
                    Finding(
                        title=f"High-Risk Technology Detected: {item['name']}",
                        severity=Severity.MEDIUM,
                        scanner=self.SCANNER_NAME,
                        category="Technology Risk",
                        description=(
                            "A technology with a significant security history was "
                            "fingerprinted; the externally visible signal does not prove version."
                        ),
                        evidence=item["signal"],
                        remediation="Confirm the deployed version and apply current security updates.",
                        raw_data=item,
                    )
                )

        if exit_code == -1 and "TIMEOUT" in (stdout + stderr).upper():
            status = ScannerStatus.TIMEOUT
            error_message = "Technology fingerprinting timed out."
        elif exit_code not in (0, 1) and not inventory:
            status = ScannerStatus.FAILED
            error_message = "Technology fingerprinting produced no usable evidence."
        elif exit_code not in (0, 1):
            status = ScannerStatus.PARTIAL
            error_message = "httpx failed, but passive HTTP fingerprint evidence was collected."
        else:
            status = ScannerStatus.SUCCESS
            error_message = None

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=status,
            findings=findings,
            metadata={"inventory": inventory, "evidence_count": len(inventory)},
            tool_command=" ".join(command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout + stderr),
            error_message=error_message,
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Evidence-backed passive public technology fingerprinting",
            "tool": "httpx + passive HTTP signatures",
            "tool_version": "1.6.10",
            "target_types": ["WEBSITE"],
            "output_format": "JSON",
            "categories": ["Technology Fingerprint", "Technology Risk"],
        }
