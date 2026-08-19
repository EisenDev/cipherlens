"""
CipherLens Scanner — SecurityTxtScanner

Checks presence and validity of security.txt disclosure file per RFC 9116
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from base import BaseScanner
from result import Finding, ScannerResult, ScannerStatus, Severity
from utils import sanitize_target

import logging
import requests

logger = logging.getLogger(__name__)


class SecurityTxtScanner(BaseScanner):
    """Checks presence and validity of security.txt disclosure file per RFC 9116"""

    SCANNER_NAME = "security_txt"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"SecurityTxtScanner requires an HTTP/HTTPS URL, got: {target!r}")

    def execute(self) -> ScannerResult:
        """
        Execute the security_txt scan.

        TODO(Phase 3.1): Implement full security_txt logic.
        This scaffold returns a placeholder SUCCESS result.
        The actual implementation will be added in the scanner implementation sprint.
        """
        target = sanitize_target(self.target)
        logger.info("SecurityTxtScanner running against %s (placeholder implementation)", target)

        return self._make_skipped_result(
            "security.txt validation is not implemented; no checks were executed."
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "implemented": False,
            "version": self.SCANNER_VERSION,
            "description": "Checks presence and validity of security.txt disclosure file per RFC 9116",
            "tool": "requests (Python)",
            "tool_version": "2.x",
            "target_types": ["WEBSITE"],
            "output_format": "Python",
            "categories": ["Security_txt"],
        }
