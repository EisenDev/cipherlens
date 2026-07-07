"""
CipherLens Scanner Engine — Configuration

Central configuration module for all scanner modules.
Scanners MUST read tool paths and settings from here — never hardcode.

Usage:
    from config import ScannerConfig

    config = ScannerConfig()
    nuclei_path = config.tool_path("nuclei")
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


# ─── Path resolution ─────────────────────────────────────────────────────────
# Tools are stored alongside this project in scanner/tools/ by default.
# Override via environment variables for Docker / CI deployments.
_PROJECT_ROOT = Path(__file__).resolve().parent
_DEFAULT_TOOLS_DIR = _PROJECT_ROOT / "tools"
_DEFAULT_TEMP_DIR = _PROJECT_ROOT / "tmp"
_DEFAULT_RESULTS_DIR = _PROJECT_ROOT / "results"


class ScannerConfig(BaseSettings):
    """
    Centralized configuration for the CipherLens scanner engine.

    All settings can be overridden via environment variables using the
    CIPHERLENS_ prefix (e.g. CIPHERLENS_TOOLS_DIR=/opt/security-tools).
    """

    # ── Directory paths ──────────────────────────────────────────────────────
    tools_dir: Path = Field(
        default=_DEFAULT_TOOLS_DIR,
        description="Directory containing downloaded security tool binaries",
    )
    temp_dir: Path = Field(
        default=_DEFAULT_TEMP_DIR,
        description="Temporary working directory for scanner output files",
    )
    results_dir: Path = Field(
        default=_DEFAULT_RESULTS_DIR,
        description="Directory where raw scanner result JSON files are written",
    )

    # ── Execution settings ───────────────────────────────────────────────────
    default_timeout: int = Field(
        default=120,
        description="Default timeout in seconds for any single tool execution",
        ge=10,
        le=3600,
    )
    default_concurrency: int = Field(
        default=5,
        description="Maximum parallel scanner modules when running a full scan",
        ge=1,
        le=50,
    )
    max_retries: int = Field(
        default=2,
        description="Number of times to retry a failed scanner module before marking it FAILED",
        ge=0,
        le=5,
    )

    # ── Network settings ─────────────────────────────────────────────────────
    request_timeout: int = Field(
        default=30,
        description="HTTP request timeout in seconds for web-based scanners",
        ge=5,
        le=300,
    )
    rate_limit_rps: int = Field(
        default=50,
        description="Maximum HTTP requests per second across all scanners",
        ge=1,
        le=1000,
    )
    follow_redirects: bool = Field(
        default=True,
        description="Whether scanners should follow HTTP redirects",
    )

    # ── Crawler settings ─────────────────────────────────────────────────────
    crawler_depth: int = Field(
        default=2,
        description="Maximum crawl depth for the web crawler scanner",
        ge=1,
        le=10,
    )
    crawler_max_pages: int = Field(
        default=500,
        description="Maximum number of pages to crawl per target",
        ge=10,
        le=10000,
    )

    # ── Nuclei settings ──────────────────────────────────────────────────────
    nuclei_templates_dir: Optional[Path] = Field(
        default=None,
        description="Path to custom nuclei templates directory. None = use default ~/.nuclei-templates",
    )
    nuclei_severity: str = Field(
        default="low,medium,high,critical",
        description="Comma-separated severity levels to run nuclei checks for",
    )

    # ── SSL settings ─────────────────────────────────────────────────────────
    testssl_path: Optional[Path] = Field(
        default=None,
        description="Explicit path to testssl.sh. None = auto-detect in tools_dir",
    )

    # ── Port scanning ─────────────────────────────────────────────────────────
    port_scan_top_ports: int = Field(
        default=1000,
        description="Number of top ports to scan with naabu",
        ge=10,
        le=65535,
    )

    model_config = {
        "env_prefix": "CIPHERLENS_",
        "env_file": ".env",
        "extra": "ignore",
    }

    def tool_path(self, tool_name: str) -> Path:
        """
        Resolve the absolute path to a security tool binary.

        Lookup order:
        1. Environment variable: CIPHERLENS_TOOL_{NAME} (e.g. CIPHERLENS_TOOL_NUCLEI)
        2. tools_dir / tool_name
        3. System PATH (via which-style lookup)

        :param tool_name: Tool binary name (e.g. "nuclei", "httpx")
        :raises FileNotFoundError: If the tool cannot be found anywhere
        :returns: Absolute Path to the tool binary
        """
        env_key = f"CIPHERLENS_TOOL_{tool_name.upper().replace('-', '_')}"
        env_override = os.environ.get(env_key)
        if env_override:
            p = Path(env_override)
            if p.is_file():
                return p

        # Check tools_dir
        local_path = self.tools_dir / tool_name
        if local_path.is_file():
            return local_path

        # Check system PATH
        import shutil
        system_path = shutil.which(tool_name)
        if system_path:
            return Path(system_path)

        raise FileNotFoundError(
            f"Tool '{tool_name}' not found. "
            f"Expected at '{local_path}', env '{env_key}', or in system PATH. "
            f"Run 'scripts/install_tools.sh' to install scanner dependencies."
        )

    def ensure_directories(self) -> None:
        """Create required working directories if they do not exist."""
        self.tools_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)


# ── Default singleton used by scanner modules ──────────────────────────────
config = ScannerConfig()
