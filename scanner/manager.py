"""
CipherLens Scanner Engine — Scanner Manager

The ScannerManager is the top-level orchestrator for running security scans.
It loads scanners from the registry, executes them (sequentially or in parallel),
collects results, and handles failures gracefully.

The manager knows NOTHING about:
    - HTTP endpoints (FastAPI)
    - The database (PostgreSQL / SQLAlchemy)
    - The React frontend
    - Task queues (BullMQ / Redis)

These integrations will be added in Phase 3.1.

Usage:
    from manager import ScannerManager

    manager = ScannerManager()
    result = manager.run_scan(
        target="https://example.com",
        target_type="WEBSITE",
        scanner_names=["headers", "ssl", "dns"],
    )
"""

from __future__ import annotations

import concurrent.futures
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config import ScannerConfig, config as default_config
from registry import ScannerRegistry, scanner_registry as default_registry
from result import AggregatedScanResult, ScannerResult, ScannerStatus

logger = logging.getLogger(__name__)


class ScannerManager:
    """
    Orchestrates the execution of one or more scanner modules against a target.

    Responsibilities:
        - Load and validate the scanner registry
        - Execute scanners (sequential or parallel)
        - Collect and aggregate results
        - Handle individual scanner failures without aborting the full scan
        - Report timing metrics
    """

    def __init__(
        self,
        config: Optional[ScannerConfig] = None,
        registry: Optional[ScannerRegistry] = None,
    ) -> None:
        """
        :param config: Scanner configuration. Defaults to the global singleton.
        :param registry: Scanner registry. Defaults to the global singleton.
        """
        self.config = config or default_config
        self.registry = registry or default_registry
        self._initialized = False

    def initialize(self) -> None:
        """Load all registered scanners and ensure working directories exist."""
        if self._initialized:
            return
        self.config.ensure_directories()
        self.registry.load_default_scanners()
        self._initialized = True
        logger.info(
            "ScannerManager initialized with %d registered scanners",
            len(self.registry.all()),
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def run_scan(
        self,
        target: str,
        target_type: str = "WEBSITE",
        scanner_names: Optional[List[str]] = None,
        options: Optional[Dict[str, Any]] = None,
        parallel: bool = False,
    ) -> AggregatedScanResult:
        """
        Execute a full security scan against the given target.

        :param target: Target URL (for WEBSITE) or local repo path (for REPOSITORY).
        :param target_type: "WEBSITE" or "REPOSITORY".
        :param scanner_names: Specific scanner names to run. None = run all applicable.
        :param options: Per-scan option overrides passed to each scanner.
        :param parallel: Run scanners in parallel threads (default False for safety).
        :returns: AggregatedScanResult containing all individual scanner results.
        """
        if not self._initialized:
            self.initialize()

        scan_start = time.monotonic()
        started_at = datetime.now(timezone.utc)

        logger.info(
            "Starting scan — target=%s type=%s scanners=%s parallel=%s",
            target,
            target_type,
            scanner_names or "ALL",
            parallel,
        )

        # Resolve which scanners to run
        selected_scanners = self._resolve_scanners(scanner_names, target_type)
        if not selected_scanners:
            logger.warning("No applicable scanners found for target_type=%s", target_type)
            return AggregatedScanResult(
                target=target,
                target_type=target_type,
                overall_status=ScannerStatus.SKIPPED,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )

        # Execute scanners
        if parallel and len(selected_scanners) > 1:
            results = self._run_parallel(
                target=target,
                scanner_names=selected_scanners,
                options=options or {},
            )
        else:
            results = self._run_sequential(
                target=target,
                scanner_names=selected_scanners,
                options=options or {},
            )

        # Aggregate
        total_duration = time.monotonic() - scan_start
        overall_status = self._compute_overall_status(results)

        aggregated = AggregatedScanResult(
            target=target,
            target_type=target_type,
            scanner_results=results,
            overall_status=overall_status,
            total_duration_seconds=total_duration,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
        )

        logger.info(
            "Scan complete — target=%s duration=%.2fs findings=%d score=%d status=%s",
            target,
            total_duration,
            aggregated.total_findings,
            aggregated.risk_score,
            overall_status.value,
        )
        return aggregated

    def available_scanners(self) -> List[str]:
        """Return names of all currently registered scanner modules."""
        if not self._initialized:
            self.initialize()
        return self.registry.names()

    # ── Internal execution ────────────────────────────────────────────────────

    def _resolve_scanners(
        self, scanner_names: Optional[List[str]], target_type: str
    ) -> List[str]:
        """
        Determine the ordered list of scanner names to execute.

        Filters by target_type if scanner_names is None.
        Unknown names are logged and skipped.
        """
        all_registered = self.registry.all()

        if scanner_names is not None:
            resolved = []
            for name in scanner_names:
                if name in all_registered:
                    resolved.append(name)
                else:
                    logger.warning("Unknown scanner requested: '%s' — skipping", name)
            return resolved

        # Filter by target type
        resolved = []
        for name, klass in all_registered.items():
            meta = {}
            try:
                # Instantiate temporarily just to read metadata
                temp = klass.__new__(klass)
                temp.SCANNER_NAME = klass.SCANNER_NAME
                meta = klass.metadata(temp)  # type: ignore[arg-type]
            except Exception:  # noqa: BLE001
                meta = {}

            supported_types = meta.get("target_types", ["WEBSITE", "REPOSITORY"])
            if target_type in supported_types:
                resolved.append(name)

        return sorted(resolved)

    def _run_sequential(
        self,
        target: str,
        scanner_names: List[str],
        options: Dict[str, Any],
    ) -> List[ScannerResult]:
        """Execute scanners one at a time."""
        results: List[ScannerResult] = []
        total = len(scanner_names)

        for i, name in enumerate(scanner_names, start=1):
            logger.info("Running scanner %d/%d: %s", i, total, name)
            result = self._run_single_scanner(target, name, options)
            results.append(result)

        return results

    def _run_parallel(
        self,
        target: str,
        scanner_names: List[str],
        options: Dict[str, Any],
    ) -> List[ScannerResult]:
        """Execute scanners concurrently using a thread pool."""
        max_workers = min(self.config.default_concurrency, len(scanner_names))
        results: List[ScannerResult] = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_name = {
                executor.submit(self._run_single_scanner, target, name, options): name
                for name in scanner_names
            }
            for future in concurrent.futures.as_completed(future_to_name):
                name = future_to_name[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as exc:  # noqa: BLE001
                    logger.error("Scanner '%s' raised unhandled exception: %s", name, exc)
                    results.append(
                        ScannerResult(
                            scanner_name=name,
                            target=target,
                            status=ScannerStatus.FAILED,
                            error_message=f"Unhandled thread exception: {exc}",
                        )
                    )

        return results

    def _run_single_scanner(
        self,
        target: str,
        name: str,
        options: Dict[str, Any],
    ) -> ScannerResult:
        """Instantiate and run a single scanner by name."""
        klass = self.registry.get(name)
        if klass is None:
            return ScannerResult(
                scanner_name=name,
                target=target,
                status=ScannerStatus.FAILED,
                error_message=f"Scanner '{name}' not found in registry",
            )

        try:
            scanner = klass(target=target, config=self.config, options=options)
            return scanner.run()
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Unhandled error instantiating scanner '%s': %s", name, exc
            )
            return ScannerResult(
                scanner_name=name,
                target=target,
                status=ScannerStatus.FAILED,
                error_message=f"Instantiation error: {exc}",
            )

    @staticmethod
    def _compute_overall_status(results: List[ScannerResult]) -> ScannerStatus:
        """
        Derive the overall scan status from individual scanner results.

        - All SUCCESS → SUCCESS
        - All FAILED → FAILED
        - Mixed → PARTIAL
        - Any SUCCESS with some FAILED → PARTIAL
        """
        if not results:
            return ScannerStatus.FAILED

        statuses = {r.status for r in results}

        if statuses == {ScannerStatus.SUCCESS}:
            return ScannerStatus.SUCCESS
        if statuses == {ScannerStatus.FAILED}:
            return ScannerStatus.FAILED
        if statuses == {ScannerStatus.SKIPPED}:
            return ScannerStatus.SKIPPED
        if ScannerStatus.SUCCESS in statuses or ScannerStatus.PARTIAL in statuses:
            return ScannerStatus.PARTIAL
        return ScannerStatus.PARTIAL
