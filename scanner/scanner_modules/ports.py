"""
CipherLens Scanner — Port Scanner

Wraps: naabu (ProjectDiscovery)

Performs TCP port scanning to discover:
    - Open ports on the target host
    - Unexpected service exposure (databases, admin services on public ports)
    - Common dangerous open ports (Redis, MongoDB, Elasticsearch, etc.)

Tool: naabu -host <host> -json -top-ports <n>
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

# Ports that should not be publicly accessible and their risk descriptions
_DANGEROUS_PORTS: Dict[int, Dict[str, Any]] = {
    22: {"service": "SSH", "severity": Severity.MEDIUM, "desc": "SSH exposed publicly can be brute-forced."},
    23: {"service": "Telnet", "severity": Severity.CRITICAL, "desc": "Telnet transmits data in plaintext. Disable immediately."},
    3306: {"service": "MySQL", "severity": Severity.CRITICAL, "desc": "MySQL port exposed publicly allows direct database attacks."},
    5432: {"service": "PostgreSQL", "severity": Severity.CRITICAL, "desc": "PostgreSQL port exposed publicly allows direct database attacks."},
    6379: {"service": "Redis", "severity": Severity.CRITICAL, "desc": "Redis without auth on public ports is commonly exploited for RCE."},
    27017: {"service": "MongoDB", "severity": Severity.CRITICAL, "desc": "MongoDB exposed publicly — likely unauthenticated."},
    9200: {"service": "Elasticsearch", "severity": Severity.CRITICAL, "desc": "Elasticsearch REST API exposed — data leakage risk."},
    5601: {"service": "Kibana", "severity": Severity.HIGH, "desc": "Kibana admin interface exposed publicly."},
    8080: {"service": "HTTP Alt", "severity": Severity.LOW, "desc": "Alternate HTTP port exposed — verify intended."},
    8443: {"service": "HTTPS Alt", "severity": Severity.LOW, "desc": "Alternate HTTPS port exposed — verify intended."},
    2375: {"service": "Docker API (unencrypted)", "severity": Severity.CRITICAL, "desc": "Docker daemon API exposed without TLS — full host compromise risk."},
    2376: {"service": "Docker API (TLS)", "severity": Severity.HIGH, "desc": "Docker daemon API exposed with TLS — verify certificate auth."},
    11211: {"service": "Memcached", "severity": Severity.HIGH, "desc": "Memcached exposed publicly — data leakage and amplification attack risk."},
    4848: {"service": "GlassFish Admin", "severity": Severity.HIGH, "desc": "GlassFish admin console exposed."},
    8161: {"service": "ActiveMQ Admin", "severity": Severity.HIGH, "desc": "ActiveMQ admin console exposed publicly."},
    9090: {"service": "Prometheus", "severity": Severity.MEDIUM, "desc": "Prometheus metrics endpoint exposed — system info leakage."},
}


class PortsScanner(BaseScanner):
    """
    TCP port scanner that discovers open ports and flags dangerous service exposures.
    """

    SCANNER_NAME = "ports"
    SCANNER_VERSION = "1.0.0"

    def _get_host(self) -> str:
        target = sanitize_target(self.target)
        if target.startswith(("http://", "https://")):
            return urlparse(target).netloc.split(":")[0]
        return target.split(":")[0]

    def validate(self) -> None:
        self.config.tool_path("naabu")

    def execute(self) -> ScannerResult:
        host = self._get_host()
        naabu_path = self.config.tool_path("naabu")
        timeout = self._option("timeout", self.config.default_timeout)
        top_ports = self._option("port_scan_top_ports", self.config.port_scan_top_ports)

        command = [
            str(naabu_path),
            "-host", host,
            "-json",
            "-silent",
            "-top-ports", str(top_ports),
            "-timeout", str(self.config.request_timeout * 1000),  # naabu expects ms
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout + 60, env={"LD_LIBRARY_PATH": str(self.config.tools_dir)})
        raw_items = parse_jsonl(stdout)

        open_ports: List[int] = []
        resolved_ip = None
        for item in raw_items:
            port = item.get("port")
            if port:
                open_ports.append(int(port))
            if not resolved_ip and item.get("ip"):
                resolved_ip = item.get("ip")

        findings: List[Finding] = []
        for port in open_ports:
            if port in _DANGEROUS_PORTS:
                meta = _DANGEROUS_PORTS[port]
                findings.append(
                    Finding(
                        title=f"Dangerous Port Exposed: {port}/{meta['service']}",
                        severity=meta["severity"],
                        scanner=self.SCANNER_NAME,
                        category="Network Exposure",
                        description=meta["desc"],
                        evidence=f"naabu confirmed port {port} is open on {host}",
                        remediation=(
                            f"Restrict access to port {port} using firewall rules (e.g. iptables, security groups). "
                            f"Only allow {meta['service']} from trusted IP ranges."
                        ),
                        cwe_ids=["CWE-200"],
                        raw_data={"host": host, "port": port, "service": meta["service"], "ip": resolved_ip},
                    )
                )

        if open_ports:
            findings.append(
                Finding(
                    title=f"Port Scan Summary: {len(open_ports)} Open Ports",
                    severity=Severity.INFO,
                    scanner=self.SCANNER_NAME,
                    category="Network Exposure",
                    description=f"naabu discovered {len(open_ports)} open TCP ports on {host}.",
                    evidence=f"Open ports: {sorted(open_ports)}",
                    remediation="Review all open ports. Close unnecessary services and restrict access with firewall rules.",
                    raw_data={
                        "host": host,
                        "open_ports": sorted(open_ports),
                        "ip": resolved_ip
                    },
                )
            )

        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=host,
            status=ScannerStatus.SUCCESS if exit_code in (0, 1) else ScannerStatus.PARTIAL,
            findings=findings,
            metadata={"open_ports": sorted(open_ports), "total_open": len(open_ports)},
            tool_command=" ".join(str(c) for c in command),
            tool_exit_code=exit_code,
            tool_raw_output=truncate_output(stdout),
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "TCP port scanner detecting dangerous service exposures",
            "tool": "naabu",
            "tool_version": "2.3.1",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
            "categories": ["Network Exposure"],
        }
