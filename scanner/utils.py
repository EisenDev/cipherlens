"""
CipherLens Scanner Engine — Utility Functions

Common helper utilities shared across all scanner modules.
"""

from __future__ import annotations

import json
import logging
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def run_tool(
    command: List[str],
    timeout: int = 120,
    cwd: Optional[Path] = None,
    env: Optional[Dict[str, str]] = None,
    capture_stderr: bool = True,
) -> Tuple[int, str, str]:
    """
    Execute an external security tool as a subprocess.

    Logs the command, execution time, and exit code. Does NOT raise
    exceptions — callers should inspect the return code themselves.

    :param command: Command and arguments as a list (already escaped).
    :param timeout: Maximum execution time in seconds.
    :param cwd: Working directory for the subprocess.
    :param env: Optional environment variable overrides.
    :param capture_stderr: Whether to capture stderr (default True).
    :returns: Tuple of (exit_code, stdout, stderr).
    """
    cmd_str = shlex.join(str(c) for c in command)
    logger.info("Executing tool command: %s", cmd_str)
    start = time.monotonic()

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            env=env,
        )
        duration = time.monotonic() - start
        logger.info(
            "Tool finished: exit_code=%d duration=%.2fs command=%s",
            result.returncode,
            duration,
            cmd_str,
        )
        if result.returncode != 0 and result.stderr:
            logger.warning("Tool stderr: %s", result.stderr[:500])
        return result.returncode, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        duration = time.monotonic() - start
        logger.error("Tool timed out after %.2fs: %s", duration, cmd_str)
        return -1, "", f"TIMEOUT after {timeout}s"

    except FileNotFoundError as exc:
        logger.error("Tool binary not found: %s — %s", command[0], exc)
        return -2, "", str(exc)

    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error running tool %s: %s", cmd_str, exc)
        return -3, "", str(exc)


def parse_jsonl(raw: str) -> List[Dict[str, Any]]:
    """
    Parse newline-delimited JSON (JSONL) output from tools like nuclei, trufflehog.

    Lines that cannot be parsed are logged and skipped.

    :param raw: Raw JSONL string from tool stdout.
    :returns: List of parsed JSON objects.
    """
    results: List[Dict[str, Any]] = []
    for i, line in enumerate(raw.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            results.append(json.loads(line))
        except json.JSONDecodeError as exc:
            logger.debug("Skipping unparseable JSONL line %d: %s — %s", i, line[:80], exc)
    return results


def parse_json(raw: str) -> Optional[Dict[str, Any]]:
    """
    Parse a full JSON blob from tool output.

    :param raw: Raw JSON string.
    :returns: Parsed dict or None on failure.
    """
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse JSON output: %s — %s", raw[:100], exc)
        return None


def sanitize_target(target: str) -> str:
    """
    Normalize and sanitize a scan target URL or domain.

    - Strips trailing slashes
    - Lowercases hostname
    - Validates non-empty

    :param target: Raw target string from user input.
    :raises ValueError: If target is empty or clearly invalid.
    :returns: Sanitized target string.
    """
    target = target.strip().rstrip("/")
    if not target:
        raise ValueError("Scan target cannot be empty")
    return target


def domain_from_url(url: str) -> str:
    """
    Extract the hostname/domain from a URL.

    :param url: Full URL (e.g. https://example.com/path)
    :returns: Hostname (e.g. example.com)
    """
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return parsed.netloc or parsed.path


def ensure_temp_file(prefix: str, suffix: str, temp_dir: Path) -> Path:
    """
    Create a unique temporary file path inside the given directory.

    Does NOT create the file — just returns the path. Scanner modules
    should write output there and clean up in their cleanup() method.

    :param prefix: Filename prefix (e.g. "nuclei_scan_")
    :param suffix: File extension including dot (e.g. ".json")
    :param temp_dir: Directory to create the file in.
    :returns: Path to the temporary file.
    """
    import uuid
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir / f"{prefix}{uuid.uuid4().hex[:8]}{suffix}"


def truncate_output(text: str, max_chars: int = 10_000) -> str:
    """
    Truncate raw tool output to a safe maximum length for storage.

    :param text: Raw output string.
    :param max_chars: Maximum character count (default 10,000).
    :returns: Truncated string with truncation notice if needed.
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n... [TRUNCATED: {len(text) - max_chars} additional chars omitted]"


def setup_scanner_logging(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Create a properly configured logger for a scanner module.

    :param name: Logger name (typically __name__ from the calling module).
    :param level: Logging level (default INFO).
    :returns: Configured Logger instance.
    """
    scanner_logger = logging.getLogger(name)
    if not scanner_logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(formatter)
        scanner_logger.addHandler(handler)
    scanner_logger.setLevel(level)
    return scanner_logger
