import re
import os
from models import ScanResult, Finding
from scanners.base import BaseScanner

class SecretsScanner(BaseScanner):
    """
    Scans a local repository directory for hardcoded secrets.
    """

    # Basic regex patterns for credentials
    PATTERNS = {
        "SEC-SEC-001": ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
        "SEC-SEC-002": ("Generic Secret/Password Key", re.compile(r"(?i)(password|secret|passwd|api_key)\s*[:=]\s*['\"][a-zA-Z0-9_\-\.\/\+]{8,}['\"]")),
    }

    def scan(self, target: str) -> ScanResult:
        findings = []
        status = "success"
        summary = "Completed repository source code secrets auditing."

        if not os.path.exists(target):
            return ScanResult(
                target=target,
                scan_type="repository",
                status="failed",
                summary=f"Target directory {target} does not exist."
            )

        # Recursively search files, skipping .git or typical large node_modules directories
        for root, dirs, files in os.walk(target):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist", "venv")]
            
            for file_name in files:
                file_path = os.path.join(root, file_name)
                # Read as text
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_idx, line in enumerate(f, 1):
                            for pattern_id, (title, pattern) in self.PATTERNS.items():
                                match = pattern.search(line)
                                if match:
                                    # Basic redaction for safety
                                    matched_val = match.group(0)
                                    redacted_val = matched_val[:8] + "..." + matched_val[-4:] if len(matched_val) > 12 else "********"
                                    
                                    findings.append(
                                        Finding(
                                            id=pattern_id,
                                            title=f"Hardcoded {title}",
                                            severity="HIGH",
                                            description=f"Detected potential hardcoded secret or API key matching pattern.",
                                            evidence=f"Line {line_idx}: {redacted_val}",
                                            file_path=os.path.relpath(file_path, target),
                                            line_number=line_idx,
                                            remediation="Rotate this key immediately. Store credentials securely using environment variables or secret vaults."
                                        )
                                    )
                except IOError:
                    pass

        return ScanResult(
            target=target,
            scan_type="repository",
            status=status,
            findings=findings,
            summary=summary
        )
