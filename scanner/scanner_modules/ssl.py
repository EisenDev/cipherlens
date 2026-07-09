"""
CipherLens Scanner — SSL/TLS Scanner

Wraps: testssl.sh

Performs a comprehensive SSL/TLS analysis including:
    - Certificate validity, expiry, chain of trust
    - Supported protocol versions (SSLv2/v3, TLS 1.0/1.1 — deprecated)
    - Cipher suite strength
    - Known vulnerabilities (BEAST, POODLE, HEARTBLEED, ROBOT, etc.)
    - HSTS preloading

Tool: testssl.sh --jsonfile <output> --color 0 <target>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, sanitize_target, ensure_temp_file, truncate_output

import logging

logger = logging.getLogger(__name__)

# Known vulnerability IDs reported by testssl.sh and their severity mapping
_TESTSSL_VULNERABILITIES: Dict[str, Dict[str, Any]] = {
    "heartbleed": {
        "severity": Severity.CRITICAL,
        "title": "Heartbleed (CVE-2014-0160) Vulnerability Detected",
        "cve_ids": ["CVE-2014-0160"],
        "cwe_ids": ["CWE-126"],
        "remediation": "Upgrade OpenSSL to 1.0.1g or later immediately and revoke/reissue all certificates.",
    },
    "ccs": {
        "severity": Severity.HIGH,
        "title": "OpenSSL CCS Injection (CVE-2014-0224) Detected",
        "cve_ids": ["CVE-2014-0224"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Upgrade OpenSSL to 0.9.8za, 1.0.0m, or 1.0.1h or later.",
    },
    "ticketbleed": {
        "severity": Severity.HIGH,
        "title": "Ticketbleed (CVE-2016-9244) Vulnerability Detected",
        "cve_ids": ["CVE-2016-9244"],
        "cwe_ids": ["CWE-200"],
        "remediation": "Apply vendor patches for the affected TLS implementation.",
    },
    "robot": {
        "severity": Severity.HIGH,
        "title": "ROBOT (Return Of Bleichenbacher's Oracle Threat) Detected",
        "cve_ids": ["CVE-2017-13099"],
        "cwe_ids": ["CWE-327"],
        "remediation": "Disable RSA encryption cipher suites or update to a patched TLS implementation.",
    },
    "beast": {
        "severity": Severity.MEDIUM,
        "title": "BEAST Attack Vulnerability Detected (TLS CBC Mode)",
        "cve_ids": ["CVE-2011-3389"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Prioritize TLS 1.2+ and RC4/GCM cipher suites. Disable CBC ciphers for TLS 1.0.",
    },
    "poodle": {
        "severity": Severity.HIGH,
        "title": "POODLE Attack (CVE-2014-3566) — SSLv3 Padding Oracle",
        "cve_ids": ["CVE-2014-3566"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Disable SSLv3 completely. Use TLS 1.2 or TLS 1.3 only.",
    },
    "sweet32": {
        "severity": Severity.MEDIUM,
        "title": "SWEET32 Birthday Attack Vulnerability (3DES Cipher)",
        "cve_ids": ["CVE-2016-2183", "CVE-2016-6329"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Disable 3DES cipher suites. Prefer AES-GCM or ChaCha20-Poly1305.",
    },
    "logjam": {
        "severity": Severity.MEDIUM,
        "title": "Logjam — DHE Export Grade Keys Vulnerability",
        "cve_ids": ["CVE-2015-4000"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Use DHE groups of at least 2048 bits. Disable export-grade cipher suites.",
    },
    "drown": {
        "severity": Severity.HIGH,
        "title": "DROWN Attack (CVE-2016-0800) — SSLv2 Still Supported",
        "cve_ids": ["CVE-2016-0800"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Disable SSLv2 on all servers sharing the same certificate and key.",
    },
    "lucky13": {
        "severity": Severity.LOW,
        "title": "Lucky13 Attack Potentially Vulnerable (CBC Mode)",
        "cve_ids": ["CVE-2013-0169"],
        "cwe_ids": ["CWE-326"],
        "remediation": "Upgrade to TLS 1.2+ and prefer AEAD cipher suites (AES-GCM, ChaCha20).",
    },
}


class SSLScanner(BaseScanner):
    """
    Comprehensive SSL/TLS security analysis using testssl.sh.

    Detects protocol weaknesses, certificate issues, and known TLS vulnerabilities.
    """

    SCANNER_NAME = "ssl"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not (target.startswith("https://") or ":" in target):
            raise ValueError(
                f"SSLScanner requires an HTTPS URL or host:port, got: {target!r}"
            )
        self.config.tool_path("testssl.sh")

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        # Extract domain/IP and port to prevent testssl.sh from failing on scheme prefix (e.g. http://)
        from utils import domain_from_url
        clean_target = domain_from_url(target)
        
        testssl_path = self.config.tool_path("testssl.sh")
        timeout = self._option("timeout", self.config.default_timeout)

        # Use JSON output for structured parsing
        output_file = ensure_temp_file("testssl_", ".json", self.config.temp_dir)
        self._temp_files.append(str(output_file))

        command = [
            str(testssl_path),
            "--jsonfile", str(output_file),
            "--color", "0",          # No ANSI colors in output
            "--quiet",               # Minimal stdout noise
            "--fast",                # Skip time-consuming checks when in fast mode
            "--nodns", "min",        # Minimal DNS lookups
            clean_target,
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 30)

        # testssl.sh uses exit codes differently — parse the JSON regardless
        raw_findings: List[Dict[str, Any]] = []
        if output_file.exists():
            try:
                with open(output_file, encoding="utf-8") as f:
                    data = json.load(f)
                raw_findings = data if isinstance(data, list) else data.get("scanResult", [{}])[0].get("findings", [])
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                logger.warning("Failed to parse testssl.sh JSON output: %s", exc)

        findings: List[Finding] = []
        self._parse_testssl_findings(target, raw_findings, findings)

        # Handle connection failures gracefully (e.g. host does not support SSL/TLS/HTTPS)
        output_combined = stdout + stderr
        is_connection_error = (
            "TCP connect problem" in output_combined or 
            "Connection refused" in output_combined or 
            "Can't connect" in output_combined or 
            exit_code in (246, 252, 254)
        )

        if is_connection_error:
            status = ScannerStatus.SUCCESS
            logger.info("SSLScanner: target connection failed/refused. Target likely does not support SSL/TLS on port 443.")
        elif exit_code in (0, 1):
            status = ScannerStatus.SUCCESS
        else:
            status = ScannerStatus.PARTIAL

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=status,
            findings=findings,
            metadata={"raw_finding_count": len(raw_findings)},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout + stderr),
        )

    def _parse_testssl_findings(
        self,
        target: str,
        raw_findings: List[Dict[str, Any]],
        findings: List[Finding],
    ) -> None:
        """Normalize testssl.sh JSON findings into CipherLens Finding objects."""
        for item in raw_findings:
            finding_id = item.get("id", "").lower()
            severity_str = item.get("severity", "INFO").upper()
            finding_text = item.get("finding", "")

            # Map known vulnerabilities
            # Exclude false positive matches where finding_text contains "not vulnerable"
            # or where testssl explicitly sets severity to "OK".
            if (finding_id in _TESTSSL_VULNERABILITIES and 
                    "vulnerable" in finding_text.lower() and 
                    "not vulnerable" not in finding_text.lower() and 
                    severity_str != "OK"):
                vuln = _TESTSSL_VULNERABILITIES[finding_id]
                findings.append(
                    Finding(
                        title=vuln["title"],
                        severity=vuln["severity"],
                        scanner=self.SCANNER_NAME,
                        category="SSL/TLS Vulnerability",
                        description=f"testssl.sh identified: {finding_text}",
                        evidence=f"testssl.sh finding ID '{finding_id}': {finding_text}\nTarget: {target}",
                        cve_ids=vuln.get("cve_ids", []),
                        cwe_ids=vuln.get("cwe_ids", []),
                        remediation=vuln["remediation"],
                        references=["https://testssl.sh"],
                        raw_data=item,
                    )
                )
            elif finding_id in ("cert_chain_of_trust", "cert_notAfter", "cert_expired"):
                severity_map = {"CRITICAL": Severity.CRITICAL, "HIGH": Severity.HIGH, "MEDIUM": Severity.MEDIUM, "LOW": Severity.LOW}
                findings.append(
                    Finding(
                        title=f"Certificate Issue: {finding_id.replace('_', ' ').title()}",
                        severity=severity_map.get(severity_str, Severity.MEDIUM),
                        scanner=self.SCANNER_NAME,
                        category="Certificate",
                        description=f"SSL certificate issue detected: {finding_text}",
                        evidence=f"testssl.sh: {finding_text}",
                        cwe_ids=["CWE-295"],
                        remediation="Review certificate validity and renew if expiring. Ensure chain of trust is complete.",
                        raw_data=item,
                    )
                )
            elif severity_str in ("HIGH", "CRITICAL") and finding_text:
                findings.append(
                    Finding(
                        title=f"SSL Configuration Issue: {finding_id.replace('_', ' ').title()}",
                        severity=Severity.HIGH if severity_str == "HIGH" else Severity.CRITICAL,
                        scanner=self.SCANNER_NAME,
                        category="SSL/TLS Configuration",
                        description=finding_text,
                        evidence=f"testssl.sh finding: {json.dumps(item)}",
                        remediation="Review and harden the SSL/TLS configuration based on testssl.sh recommendations.",
                        raw_data=item,
                    )
                )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Comprehensive SSL/TLS analysis detecting protocol issues, certificate problems, and known vulnerabilities",
            "tool": "testssl.sh",
            "tool_version": "3.2.0",
            "target_types": ["WEBSITE"],
            "output_format": "JSON",
            "categories": ["SSL/TLS Vulnerability", "Certificate", "SSL/TLS Configuration"],
        }
