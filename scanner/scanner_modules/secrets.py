"""
CipherLens Scanner — Secrets Scanner

Wraps: TruffleHog + Gitleaks

Scans Git repositories for hardcoded secrets including:
    - API keys and tokens
    - Passwords and passphrases
    - Private keys (RSA, EC, PGP)
    - Database connection strings with credentials
    - Cloud provider credentials (AWS, GCP, Azure)
    - Webhook URLs with tokens

This scanner is REPOSITORY type only. For website scans, use the
HeadersScanner and OWASPScanner.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import run_tool, parse_jsonl, ensure_temp_file, truncate_output

import logging

logger = logging.getLogger(__name__)

# Severity mapping for TruffleHog detector types
_TRUFFLEHOG_SEVERITY_MAP: Dict[str, Severity] = {
    "aws": Severity.CRITICAL,
    "gcp": Severity.CRITICAL,
    "azure": Severity.CRITICAL,
    "github": Severity.HIGH,
    "slack": Severity.HIGH,
    "stripe": Severity.HIGH,
    "twilio": Severity.HIGH,
    "sendgrid": Severity.HIGH,
    "postgres": Severity.CRITICAL,
    "mysql": Severity.CRITICAL,
    "privatekey": Severity.CRITICAL,
    "generic": Severity.MEDIUM,
}

# Gitleaks severity mapping
_GITLEAKS_SEVERITY_MAP: Dict[str, Severity] = {
    "critical": Severity.CRITICAL,
    "high": Severity.HIGH,
    "medium": Severity.MEDIUM,
    "low": Severity.LOW,
    "info": Severity.INFO,
}


class SecretsScanner(BaseScanner):
    """
    Scans a Git repository for hardcoded secrets using TruffleHog and Gitleaks.

    Target must be a local directory path to the cloned repository.
    """

    SCANNER_NAME = "secrets"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target_path = Path(self.target)
        if not target_path.exists():
            raise ValueError(
                f"Repository path does not exist: {self.target!r}. "
                "Ensure the repository has been cloned before scanning."
            )
        if not target_path.is_dir():
            raise ValueError(
                f"Target must be a directory (repository path), got: {self.target!r}"
            )
        # Try to find at least one secrets tool
        trufflehog_available = True
        gitleaks_available = True
        try:
            self.config.tool_path("trufflehog")
        except FileNotFoundError:
            trufflehog_available = False

        try:
            self.config.tool_path("gitleaks")
        except FileNotFoundError:
            gitleaks_available = False

        if not trufflehog_available and not gitleaks_available:
            raise FileNotFoundError(
                "Neither 'trufflehog' nor 'gitleaks' are available. "
                "Install at least one secrets scanning tool."
            )

    def execute(self) -> ScannerResult:
        findings: List[Finding] = []
        errors: List[str] = []
        all_raw_output = ""

        # Run TruffleHog
        try:
            trufflehog_path = self.config.tool_path("trufflehog")
            th_findings, th_raw = self._run_trufflehog(str(trufflehog_path))
            findings.extend(th_findings)
            all_raw_output += f"=== TruffleHog ===\n{th_raw}\n"
        except FileNotFoundError:
            logger.info("TruffleHog not available, skipping")
        except Exception as exc:  # noqa: BLE001
            logger.error("TruffleHog scan failed: %s", exc)
            errors.append(f"trufflehog: {exc}")

        # Run Gitleaks
        try:
            gitleaks_path = self.config.tool_path("gitleaks")
            gl_findings, gl_raw = self._run_gitleaks(str(gitleaks_path))
            findings.extend(gl_findings)
            all_raw_output += f"=== Gitleaks ===\n{gl_raw}\n"
        except FileNotFoundError:
            logger.info("Gitleaks not available, skipping")
        except Exception as exc:  # noqa: BLE001
            logger.error("Gitleaks scan failed: %s", exc)
            errors.append(f"gitleaks: {exc}")

        # Deduplicate findings by evidence snippet
        findings = self._deduplicate(findings)

        status = ScannerStatus.PARTIAL if errors else ScannerStatus.SUCCESS
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=self.target,
            status=status,
            findings=findings,
            metadata={"errors": errors, "total_raw_findings": len(findings)},
            tool_raw_output=truncate_output(all_raw_output),
        )

    def _run_trufflehog(self, trufflehog_path: str) -> tuple[List[Finding], str]:
        """Execute TruffleHog against the repository path."""
        timeout = self._option("timeout", self.config.default_timeout)

        command = [
            trufflehog_path,
            "filesystem",
            self.target,
            "--json",
            "--no-update",
            "--only-verified",  # Only return confirmed secrets to reduce false positives
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout)
        raw_items = parse_jsonl(stdout)
        findings: List[Finding] = []

        for item in raw_items:
            detector_name = item.get("DetectorName", "unknown").lower()
            detector_type = item.get("DetectorType", "")
            raw_value = item.get("RawV2", item.get("Raw", ""))
            source_meta = item.get("SourceMetadata", {}).get("Data", {}).get("Filesystem", {})
            file_path = source_meta.get("file", "")

            severity = _TRUFFLEHOG_SEVERITY_MAP.get(detector_name, Severity.HIGH)

            # Mask the actual secret value in evidence — store only first/last chars
            masked_value = self._mask_secret(str(raw_value))

            findings.append(
                Finding(
                    title=f"Hardcoded Secret Detected: {detector_name.upper()} Credential",
                    severity=severity,
                    scanner=self.SCANNER_NAME,
                    category="Secrets",
                    description=(
                        f"TruffleHog identified a verified {detector_name} credential embedded in the repository. "
                        f"Detector type: {detector_type}."
                    ),
                    evidence=(
                        f"File: {file_path}\n"
                        f"Secret type: {detector_name}\n"
                        f"Masked value: {masked_value}\n"
                        f"Verified: {item.get('Verified', False)}"
                    ),
                    remediation=(
                        f"1. Immediately revoke the {detector_name} credential.\n"
                        "2. Remove the secret from the codebase and git history (use git-filter-repo).\n"
                        "3. Store secrets in environment variables or a secrets manager (e.g. HashiCorp Vault).\n"
                        "4. Add the secret pattern to .gitignore and pre-commit hooks."
                    ),
                    cwe_ids=["CWE-798"],
                    references=["https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password"],
                    file_path=file_path or None,
                    raw_data={
                        "detector_name": detector_name,
                        "detector_type": detector_type,
                        "verified": item.get("Verified", False),
                        "source_file": file_path,
                    },
                )
            )

        return findings, stdout

    def _run_gitleaks(self, gitleaks_path: str) -> tuple[List[Finding], str]:
        """Execute Gitleaks against the repository path."""
        timeout = self._option("timeout", self.config.default_timeout)
        output_file = ensure_temp_file("gitleaks_", ".json", self.config.temp_dir)
        self._temp_files.append(str(output_file))

        command = [
            gitleaks_path,
            "detect",
            "--source", self.target,
            "--report-format", "json",
            "--report-path", str(output_file),
            "--no-git",
            "--redact",
        ]

        exit_code, stdout, stderr = run_tool(command, timeout=timeout)
        raw_items: List[Dict[str, Any]] = []

        if output_file.exists():
            try:
                with open(output_file, encoding="utf-8") as f:
                    raw_items = json.load(f) or []
            except (json.JSONDecodeError, OSError):
                pass

        findings: List[Finding] = []
        for item in raw_items:
            rule_id = item.get("RuleID", "unknown")
            description = item.get("Description", "Secret detected")
            file_path = item.get("File", "")
            line_number = item.get("StartLine")
            match_str = item.get("Match", "")
            secret_val = item.get("Secret", "")

            severity = Severity.HIGH

            findings.append(
                Finding(
                    title=f"Secret Exposure: {description}",
                    severity=severity,
                    scanner=self.SCANNER_NAME,
                    category="Secrets",
                    description=f"Gitleaks rule '{rule_id}' matched a potential secret in {file_path}.",
                    evidence=(
                        f"Rule: {rule_id}\n"
                        f"File: {file_path}:{line_number}\n"
                        f"Match: {match_str[:80]}"
                    ),
                    remediation=(
                        "1. Revoke and rotate the exposed credential immediately.\n"
                        "2. Remove from codebase and rewrite git history.\n"
                        "3. Use environment variables or a secrets manager going forward."
                    ),
                    cwe_ids=["CWE-798"],
                    file_path=file_path or None,
                    line_number=int(line_number) if line_number else None,
                    raw_data={"rule_id": rule_id, "file": file_path, "line": line_number},
                )
            )

        return findings, stdout

    @staticmethod
    def _mask_secret(value: str) -> str:
        """Mask a secret value showing only the first and last 3 characters."""
        if len(value) <= 8:
            return "***REDACTED***"
        return f"{value[:3]}{'*' * (len(value) - 6)}{value[-3:]}"

    @staticmethod
    def _deduplicate(findings: List[Finding]) -> List[Finding]:
        """Remove duplicate findings based on file path + evidence snippet."""
        seen: set = set()
        unique: List[Finding] = []
        for f in findings:
            key = (f.file_path, f.title, f.line_number)
            if key not in seen:
                seen.add(key)
                unique.append(f)
        return unique

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Scans repositories for hardcoded secrets, API keys, and credentials using TruffleHog and Gitleaks",
            "tool": "trufflehog + gitleaks",
            "tool_version": "3.88.15 + 8.24.3",
            "target_types": ["REPOSITORY"],
            "output_format": "JSONL + JSON",
            "categories": ["Secrets"],
        }
