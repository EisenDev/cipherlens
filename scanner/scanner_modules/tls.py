"""
CipherLens Scanner — TLS Protocol Scanner (alias for protocol-level TLS analysis)

Wraps: testssl.sh --protocols

A lightweight scanner focused specifically on supported TLS protocol versions,
separate from the full SSL vulnerability scanner. Detects:
    - SSLv2 / SSLv3 still enabled (DEPRECATED)
    - TLS 1.0 / TLS 1.1 still enabled (DEPRECATED by RFC 8996)
    - TLS 1.2 availability
    - TLS 1.3 support
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, sanitize_target, ensure_temp_file, truncate_output

import logging

logger = logging.getLogger(__name__)

_DEPRECATED_PROTOCOLS = {
    "SSLv2": (Severity.CRITICAL, "CVE-2016-0800"),
    "SSLv3": (Severity.HIGH, "CVE-2014-3566"),
    "TLS1": (Severity.MEDIUM, "RFC 8996"),
    "TLS1_1": (Severity.MEDIUM, "RFC 8996"),
}


class TLSScanner(BaseScanner):
    """
    Checks which TLS/SSL protocol versions are supported by the server.
    Flags deprecated protocols as security findings.
    """

    SCANNER_NAME = "tls"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("https://", "http://")):
            raise ValueError(f"TLSScanner requires an HTTP/HTTPS URL, got: {target!r}")
        self.config.tool_path("testssl.sh")

    def execute(self) -> ScannerResult:
        target = sanitize_target(self.target)
        testssl_path = self.config.tool_path("testssl.sh")
        timeout = self._option("timeout", self.config.default_timeout)
        output_file = ensure_temp_file("tls_", ".json", self.config.temp_dir)
        self._temp_files.append(str(output_file))

        command = [
            str(testssl_path),
            "--protocols",
            "--jsonfile", str(output_file),
            "--color", "0",
            "--quiet",
            "--nodns", "min",
            target,
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 30)
        raw_findings: List[Dict[str, Any]] = []
        if output_file.exists():
            try:
                with open(output_file) as f:
                    data = json.load(f)
                raw_findings = data if isinstance(data, list) else []
            except (json.JSONDecodeError, OSError):
                pass

        findings: List[Finding] = []
        for item in raw_findings:
            finding_id = item.get("id", "")
            finding_text = item.get("finding", "").lower()

            for proto, (severity, ref) in _DEPRECATED_PROTOCOLS.items():
                if proto.lower() in finding_id.lower() and "offered" in finding_text:
                    findings.append(
                        Finding(
                            title=f"Deprecated Protocol Enabled: {proto}",
                            severity=severity,
                            scanner=self.SCANNER_NAME,
                            category="Protocol",
                            description=f"The server still accepts {proto} connections, which has known security vulnerabilities ({ref}).",
                            evidence=f"testssl.sh: {item.get('finding', '')}",
                            cve_ids=[ref] if ref.startswith("CVE") else [],
                            cwe_ids=["CWE-326"],
                            remediation=f"Disable {proto} in your web server / load balancer TLS configuration. Use TLS 1.2 or 1.3 only.",
                            references=["https://tools.ietf.org/html/rfc8996"],
                            raw_data=item,
                        )
                    )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"protocols_checked": len(raw_findings)},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "TLS protocol version audit — detects deprecated SSLv2/v3, TLS 1.0/1.1",
            "tool": "testssl.sh",
            "tool_version": "3.2.0",
            "target_types": ["WEBSITE"],
            "output_format": "JSON",
            "categories": ["Protocol"],
        }
