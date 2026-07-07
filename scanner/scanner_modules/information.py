"""
CipherLens Scanner — InformationScanner

Detects information disclosure via error pages, server banners, stack traces, debug endpoints
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


class InformationScanner(BaseScanner):
    """Detects information disclosure via error pages, server banners, stack traces, debug endpoints"""

    SCANNER_NAME = "information"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        target = sanitize_target(self.target)
        if not target.startswith(("http://", "https://")):
            raise ValueError(f"InformationScanner requires an HTTP/HTTPS URL, got: {target!r}")

    def execute(self) -> ScannerResult:
        """
        Execute the information scan.

        TODO(Phase 3.1): Implement full information logic.
        This scaffold returns a placeholder SUCCESS result.
        The actual implementation will be added in the scanner implementation sprint.
        """
        target = sanitize_target(self.target)
        logger.info("InformationScanner running against %s (placeholder implementation)", target)

        # Placeholder: return clean result, findings will be populated in Phase 3.1
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=target,
            status=ScannerStatus.SUCCESS,
            findings=[],
            metadata={"note": "Placeholder implementation — Phase 3.1 will add full logic"},
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Detects information disclosure via error pages, server banners, stack traces, debug endpoints",
            "tool": "requests (Python)",
            "tool_version": "2.x",
            "target_types": ["WEBSITE"],
            "output_format": "Python",
            "categories": ["Information"],
        }
