"""
CipherLens Scanner Engine — Runner

Convenience entry point for running scans from CLI or future background workers.
The runner bridges external invocation and the ScannerManager.

CLI Usage:
    python runner.py --target https://example.com --type WEBSITE --scanners headers,ssl,dns
    python runner.py --target /path/to/repo --type REPOSITORY
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import List, Optional

from manager import ScannerManager

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("cipherlens.runner")


def run(
    target: str,
    target_type: str = "WEBSITE",
    scanner_names: Optional[List[str]] = None,
    parallel: bool = False,
    output_file: Optional[str] = None,
) -> dict:
    """
    Execute a scan and return the result as a plain dict.

    :param target: Scan target URL or repository path.
    :param target_type: "WEBSITE" or "REPOSITORY".
    :param scanner_names: List of scanner names to run (None = all applicable).
    :param parallel: Run scanners in parallel threads.
    :param output_file: Optional path to write JSON results.
    :returns: AggregatedScanResult serialized as a dict.
    """
    manager = ScannerManager()
    manager.initialize()

    logger.info(
        "Starting runner — target=%s type=%s parallel=%s",
        target,
        target_type,
        parallel,
    )

    result = manager.run_scan(
        target=target,
        target_type=target_type,
        scanner_names=scanner_names,
        parallel=parallel,
    )

    result_dict = result.model_dump(mode="json")

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=2, default=str)
        logger.info("Results written to: %s", output_file)

    return result_dict


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CipherLens Scanner Runner — Execute security scans from the CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python runner.py --target https://example.com --type WEBSITE
  python runner.py --target https://example.com --scanners headers,ssl,dns
  python runner.py --target /path/to/repo --type REPOSITORY --scanners secrets,repository
  python runner.py --target https://example.com --parallel --output results.json
        """,
    )
    parser.add_argument("--target", required=False, default=None, help="Scan target (URL or repository path)")
    parser.add_argument(
        "--type", dest="target_type", default="WEBSITE",
        choices=["WEBSITE", "REPOSITORY"],
        help="Target type (default: WEBSITE)",
    )
    parser.add_argument(
        "--scanners", default=None,
        help="Comma-separated list of scanner names (default: all applicable)",
    )
    parser.add_argument(
        "--parallel", action="store_true",
        help="Run scanners in parallel threads",
    )
    parser.add_argument(
        "--output", default=None,
        help="File path to write JSON scan results",
    )
    parser.add_argument(
        "--list-scanners", action="store_true",
        help="List all available scanner modules and exit",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    if args.list_scanners:
        manager = ScannerManager()
        manager.initialize()
        print("Available scanners:")
        for name in manager.available_scanners():
            print(f"  - {name}")
        sys.exit(0)

    if not args.target:
        print("Error: --target is required when not using --list-scanners", file=sys.stderr)
        sys.exit(1)

    scanner_names = (
        [s.strip() for s in args.scanners.split(",") if s.strip()]
        if args.scanners
        else None
    )

    result = run(
        target=args.target,
        target_type=args.target_type,
        scanner_names=scanner_names,
        parallel=args.parallel,
        output_file=args.output,
    )

    # Print summary to stdout
    print(json.dumps(
        {
            "scan_id": result.get("scan_id"),
            "target": result.get("target"),
            "status": result.get("overall_status"),
            "total_findings": len(result.get("all_findings", [])),
            "risk_score": result.get("risk_score"),
            "duration_seconds": result.get("total_duration_seconds"),
            "scanners_run": len(result.get("scanner_results", [])),
        },
        indent=2,
    ))
