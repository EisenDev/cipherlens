"""
CipherLens Scanner Engine — Abstract Base Scanner

Every scanner module in CipherLens MUST inherit from BaseScanner.

Contract:
    scanner = MyScanner(target="https://example.com", config=config)
    scanner.initialize()
    scanner.validate()
    result = scanner.execute()
    scanner.cleanup()

Or use the convenience method run() which handles the full lifecycle.
"""

from __future__ import annotations

import abc
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from config import ScannerConfig, config as default_config
from result import Finding, ScannerResult, ScannerStatus


logger = logging.getLogger(__name__)


class BaseScanner(abc.ABC):
    """
    Abstract base class that every CipherLens scanner module must inherit from.

    Subclasses must implement:
        - validate() — pre-flight checks (tool available, target reachable?)
        - execute()  — run the scan and return a ScannerResult
        - metadata() — return static metadata about this scanner

    Subclasses should NOT override:
        - initialize() — unless adding setup beyond what's provided here
        - cleanup()    — unless additional teardown is needed
        - run()        — full lifecycle orchestration method
    """

    #: Override in each subclass with the canonical scanner identifier.
    SCANNER_NAME: str = "base"
    #: Version string — update when scanner logic changes significantly.
    SCANNER_VERSION: str = "1.0.0"

    def __init__(
        self,
        target: str,
        config: Optional[ScannerConfig] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize a scanner module.

        :param target: Scan target (URL, domain, or repository path).
        :param config: Scanner configuration. Defaults to global singleton.
        :param options: Per-scan option overrides (e.g. timeout, depth).
        """
        self.target = target.strip().rstrip("/")
        self.config = config or default_config
        self.options: Dict[str, Any] = options or {}
        self.logger = logging.getLogger(
            f"cipherlens.scanner.{self.SCANNER_NAME}"
        )
        self._temp_files: list = []
        self._started_at: Optional[datetime] = None

    # ── Lifecycle methods ────────────────────────────────────────────────────

    def initialize(self) -> None:
        """
        Prepare the scanner for execution.

        Default implementation ensures temp/results directories exist and
        logs the start event. Override to add scanner-specific setup.
        """
        self.config.ensure_directories()
        self._started_at = datetime.now(timezone.utc)
        self.logger.info(
            "Initializing scanner '%s' for target: %s",
            self.SCANNER_NAME,
            self.target,
        )

    @abc.abstractmethod
    def validate(self) -> None:
        """
        Validate preconditions before executing the scan.

        Should raise ValueError if the target is invalid for this scanner,
        or FileNotFoundError if a required tool binary is missing.

        Examples:
            - Check the tool binary exists via config.tool_path()
            - Check target URL scheme is supported
            - Check target is not in the exclusion list
        """

    @abc.abstractmethod
    def execute(self) -> ScannerResult:
        """
        Execute the security scan and return a normalized result.

        This is the primary method to implement. It should:
        1. Build the tool command
        2. Execute it via utils.run_tool()
        3. Parse/normalize the output into Finding objects
        4. Return a ScannerResult with the findings

        Must NOT raise exceptions — catch all errors and return a
        ScannerResult with status=FAILED and an error_message.

        :returns: Fully populated ScannerResult.
        """

    def cleanup(self) -> None:
        """
        Release resources and remove temporary files created during scanning.

        Default implementation deletes all paths registered in self._temp_files.
        Override to add scanner-specific teardown.
        """
        import os
        for path in self._temp_files:
            try:
                os.unlink(path)
                self.logger.debug("Cleaned up temp file: %s", path)
            except OSError:
                pass
        self._temp_files.clear()

    @abc.abstractmethod
    def metadata(self) -> Dict[str, Any]:
        """
        Return static metadata about this scanner module.

        :returns: Dict containing at minimum:
            {
                "name": str,
                "version": str,
                "description": str,
                "tool": str,          # underlying open-source tool name
                "tool_version": str,  # tool version (or "unknown")
                "target_types": list, # ["WEBSITE"] | ["REPOSITORY"] | both
                "output_format": str, # "JSON" | "JSONL" | "TEXT" | "XML"
            }
        """

    # ── Convenience runner ───────────────────────────────────────────────────

    def run(self) -> ScannerResult:
        """
        Execute the full scanner lifecycle: initialize → validate → execute → cleanup.

        This is the primary entry point used by the ScannerManager.

        :returns: ScannerResult (status may be FAILED if any stage fails).
        """
        start_time = time.monotonic()
        self._started_at = datetime.now(timezone.utc)

        try:
            self.initialize()
        except Exception as exc:  # noqa: BLE001
            self.logger.error("initialize() failed: %s", exc)
            return self._make_failed_result(
                f"Initialization failed: {exc}", start_time
            )

        try:
            self.validate()
        except (FileNotFoundError, ValueError) as exc:
            self.logger.error("validate() failed: %s", exc)
            return self._make_failed_result(
                f"Validation failed: {exc}", start_time
            )
        except Exception as exc:  # noqa: BLE001
            self.logger.error("validate() unexpected error: %s", exc)
            return self._make_failed_result(
                f"Validation error: {exc}", start_time
            )

        try:
            result = self.execute()
            result.finished_at = datetime.now(timezone.utc)
            result.duration_seconds = time.monotonic() - start_time
            self.logger.info(
                "Scanner '%s' completed in %.2fs — %d findings, status=%s",
                self.SCANNER_NAME,
                result.duration_seconds,
                result.finding_count,
                result.status.value,
            )
            return result
        except Exception as exc:  # noqa: BLE001
            self.logger.error("execute() unexpected error: %s", exc, exc_info=True)
            return self._make_failed_result(
                f"Execution error: {exc}", start_time
            )
        finally:
            try:
                self.cleanup()
            except Exception as exc:  # noqa: BLE001
                self.logger.warning("cleanup() failed: %s", exc)

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _make_failed_result(
        self, error_message: str, start_time: float
    ) -> ScannerResult:
        """Build a standard FAILED ScannerResult."""
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=self.target,
            status=ScannerStatus.FAILED,
            error_message=error_message,
            duration_seconds=time.monotonic() - start_time,
            started_at=self._started_at or datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
        )

    def _make_skipped_result(self, reason: str) -> ScannerResult:
        """Build a SKIPPED ScannerResult for unsupported configurations."""
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=self.target,
            status=ScannerStatus.SKIPPED,
            error_message=reason,
            started_at=self._started_at or datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
        )

    def _option(self, key: str, default: Any) -> Any:
        """Read a per-scan option with fallback to the given default."""
        return self.options.get(key, default)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} target={self.target!r}>"
