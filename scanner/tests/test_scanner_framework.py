"""
CipherLens Scanner — Unit Tests

Tests for the scanner framework core components:
    - ScannerConfig
    - Result models
    - BaseScanner contract
    - ScannerRegistry
    - ScannerManager
    - Individual scanner module imports and metadata

These tests do NOT execute real scans — they validate the framework
architecture and module contracts without network access or file I/O.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import pytest

# Add scanner root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import ScannerConfig
from result import (
    AggregatedScanResult,
    Finding,
    ScannerResult,
    ScannerStatus,
    Severity,
)
from base import BaseScanner
from registry import ScannerRegistry
from manager import ScannerManager


# ── Test Fixtures ─────────────────────────────────────────────────────────────


class ConcreteScanner(BaseScanner):
    """Minimal concrete scanner for testing the base class contract."""

    SCANNER_NAME = "test_scanner"
    SCANNER_VERSION = "0.0.1"

    def __init__(self, *args, should_fail: bool = False, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.should_fail = should_fail

    def validate(self) -> None:
        if self.should_fail:
            raise ValueError("Forced validation failure for testing")

    def execute(self) -> ScannerResult:
        return ScannerResult(
            scanner_name=self.SCANNER_NAME,
            scanner_version=self.SCANNER_VERSION,
            target=self.target,
            status=ScannerStatus.SUCCESS,
            findings=[
                Finding(
                    title="Test Finding",
                    severity=Severity.HIGH,
                    scanner=self.SCANNER_NAME,
                    category="Test",
                    description="A test finding for unit testing.",
                    evidence="Test evidence",
                    remediation="This is a test finding; no action required.",
                )
            ],
        )

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "Test scanner for unit testing",
            "tool": "none",
            "tool_version": "0.0.0",
            "target_types": ["WEBSITE"],
            "output_format": "Python",
        }


# ── Config Tests ──────────────────────────────────────────────────────────────


class TestScannerConfig:
    def test_default_values(self):
        config = ScannerConfig()
        assert config.default_timeout == 120
        assert config.default_concurrency == 5
        assert config.max_retries == 2
        assert config.rate_limit_rps == 50
        assert config.crawler_depth == 2
        assert config.nuclei_severity == "low,medium,high,critical"

    def test_tool_path_in_tools_dir(self, tmp_path):
        # Create a fake tool binary
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        fake_tool = tools_dir / "fakescanner"
        fake_tool.write_text("#!/bin/sh\necho hello")
        fake_tool.chmod(0o755)

        config = ScannerConfig(tools_dir=tools_dir)
        resolved = config.tool_path("fakescanner")
        assert resolved == fake_tool

    def test_tool_path_not_found_raises(self, tmp_path):
        config = ScannerConfig(tools_dir=tmp_path)
        with pytest.raises(FileNotFoundError):
            config.tool_path("nonexistent_tool_xyz")

    def test_ensure_directories_creates_dirs(self, tmp_path):
        config = ScannerConfig(
            tools_dir=tmp_path / "tools",
            temp_dir=tmp_path / "tmp",
            results_dir=tmp_path / "results",
        )
        config.ensure_directories()
        assert (tmp_path / "tools").is_dir()
        assert (tmp_path / "tmp").is_dir()
        assert (tmp_path / "results").is_dir()


# ── Result Model Tests ────────────────────────────────────────────────────────


class TestFinding:
    def test_auto_id_generated(self):
        f = Finding(
            title="Test",
            severity=Severity.HIGH,
            scanner="test",
            category="Test",
            description="desc",
            evidence="ev",
            remediation="fix",
        )
        assert f.id.startswith("CLENS-")
        assert len(f.id) == 14  # "CLENS-" + 8 chars

    def test_optional_fields_default_none(self):
        f = Finding(
            title="Test",
            severity=Severity.LOW,
            scanner="test",
            category="Test",
            description="desc",
            evidence="ev",
            remediation="fix",
        )
        assert f.file_path is None
        assert f.line_number is None
        assert f.raw_data is None
        assert f.cve_ids == []
        assert f.cwe_ids == []


class TestScannerResult:
    def _make_result(self, status=ScannerStatus.SUCCESS) -> ScannerResult:
        findings = [
            Finding(title="C", severity=Severity.CRITICAL, scanner="t", category="T", description="d", evidence="e", remediation="r"),
            Finding(title="H", severity=Severity.HIGH, scanner="t", category="T", description="d", evidence="e", remediation="r"),
            Finding(title="M", severity=Severity.MEDIUM, scanner="t", category="T", description="d", evidence="e", remediation="r"),
            Finding(title="L", severity=Severity.LOW, scanner="t", category="T", description="d", evidence="e", remediation="r"),
            Finding(title="I", severity=Severity.INFO, scanner="t", category="T", description="d", evidence="e", remediation="r"),
        ]
        return ScannerResult(
            scanner_name="test", scanner_version="1.0", target="https://example.com",
            status=status, findings=findings,
        )

    def test_finding_counts(self):
        result = self._make_result()
        assert result.finding_count == 5
        assert result.critical_count == 1
        assert result.high_count == 1
        assert result.medium_count == 1
        assert result.low_count == 1
        assert result.info_count == 1


class TestAggregatedScanResult:
    def test_risk_score_perfect(self):
        result = AggregatedScanResult(target="https://example.com", target_type="WEBSITE")
        assert result.risk_score == 100

    def test_risk_score_with_critical(self):
        finding = Finding(
            title="C", severity=Severity.CRITICAL, scanner="t", category="T",
            description="d", evidence="e", remediation="r",
        )
        scanner_result = ScannerResult(
            scanner_name="test", scanner_version="1.0",
            target="https://example.com", status=ScannerStatus.SUCCESS,
            findings=[finding],
        )
        agg = AggregatedScanResult(
            target="https://example.com", target_type="WEBSITE",
            scanner_results=[scanner_result],
        )
        assert agg.risk_score == 75  # 100 - 25

    def test_risk_score_clamped_at_zero(self):
        findings = [
            Finding(title=f"C{i}", severity=Severity.CRITICAL, scanner="t", category="T",
                    description="d", evidence="e", remediation="r")
            for i in range(10)
        ]
        scanner_result = ScannerResult(
            scanner_name="test", scanner_version="1.0",
            target="https://example.com", status=ScannerStatus.SUCCESS,
            findings=findings,
        )
        agg = AggregatedScanResult(
            target="https://example.com", target_type="WEBSITE",
            scanner_results=[scanner_result],
        )
        assert agg.risk_score == 0  # Clamped at 0


# ── BaseScanner Tests ─────────────────────────────────────────────────────────


class TestBaseScanner:
    def test_run_success(self):
        scanner = ConcreteScanner(target="https://example.com")
        result = scanner.run()
        assert result.status == ScannerStatus.SUCCESS
        assert result.finding_count == 1
        assert result.duration_seconds > 0

    def test_run_validation_failure_returns_failed_result(self):
        scanner = ConcreteScanner(target="https://example.com", should_fail=True)
        result = scanner.run()
        assert result.status == ScannerStatus.FAILED
        assert "Forced validation failure" in result.error_message

    def test_make_failed_result(self):
        import time
        scanner = ConcreteScanner(target="https://example.com")
        scanner.initialize()
        result = scanner._make_failed_result("test error", time.monotonic())
        assert result.status == ScannerStatus.FAILED
        assert result.error_message == "test error"
        assert result.scanner_name == "test_scanner"

    def test_make_skipped_result(self):
        scanner = ConcreteScanner(target="https://example.com")
        scanner.initialize()
        result = scanner._make_skipped_result("reason")
        assert result.status == ScannerStatus.SKIPPED

    def test_option_default(self):
        scanner = ConcreteScanner(target="https://example.com")
        assert scanner._option("nonexistent", 42) == 42

    def test_option_override(self):
        scanner = ConcreteScanner(target="https://example.com", options={"my_opt": "foo"})
        assert scanner._option("my_opt", "bar") == "foo"


# ── ScannerRegistry Tests ─────────────────────────────────────────────────────


class TestScannerRegistry:
    def test_register_and_get(self):
        registry = ScannerRegistry()
        registry.register("test_scanner", ConcreteScanner)
        assert registry.get("test_scanner") is ConcreteScanner

    def test_duplicate_registration_raises(self):
        registry = ScannerRegistry()
        registry.register("test_scanner", ConcreteScanner)
        with pytest.raises(ValueError, match="already registered"):
            registry.register("test_scanner", ConcreteScanner)

    def test_non_base_scanner_raises(self):
        registry = ScannerRegistry()
        with pytest.raises(TypeError):
            registry.register("bad", object)  # type: ignore

    def test_names_sorted(self):
        registry = ScannerRegistry()
        registry.register("z_scanner", ConcreteScanner)
        registry.register("a_scanner", ConcreteScanner)
        names = registry.names()
        assert names == sorted(names)

    def test_all_returns_copy(self):
        registry = ScannerRegistry()
        registry.register("test_scanner", ConcreteScanner)
        copy = registry.all()
        copy.pop("test_scanner")
        assert registry.get("test_scanner") is ConcreteScanner


# ── ScannerManager Tests ──────────────────────────────────────────────────────


class TestScannerManager:
    def _make_manager_with_scanner(self) -> ScannerManager:
        registry = ScannerRegistry()
        registry.register("test_scanner", ConcreteScanner)
        manager = ScannerManager(registry=registry)
        manager._initialized = True  # Skip full initialization
        return manager

    def test_compute_overall_status_all_success(self):
        results = [
            ScannerResult(scanner_name="a", scanner_version="1", target="t", status=ScannerStatus.SUCCESS),
            ScannerResult(scanner_name="b", scanner_version="1", target="t", status=ScannerStatus.SUCCESS),
        ]
        status = ScannerManager._compute_overall_status(results)
        assert status == ScannerStatus.SUCCESS

    def test_compute_overall_status_all_failed(self):
        results = [
            ScannerResult(scanner_name="a", scanner_version="1", target="t", status=ScannerStatus.FAILED),
        ]
        status = ScannerManager._compute_overall_status(results)
        assert status == ScannerStatus.FAILED

    def test_compute_overall_status_mixed_partial(self):
        results = [
            ScannerResult(scanner_name="a", scanner_version="1", target="t", status=ScannerStatus.SUCCESS),
            ScannerResult(scanner_name="b", scanner_version="1", target="t", status=ScannerStatus.FAILED),
        ]
        status = ScannerManager._compute_overall_status(results)
        assert status == ScannerStatus.PARTIAL

    def test_run_scan_unknown_scanner_skipped(self):
        manager = self._make_manager_with_scanner()
        result = manager._run_single_scanner("https://example.com", "nonexistent", {})
        assert result.status == ScannerStatus.FAILED
        assert "not found in registry" in result.error_message


# ── Integration: All Scanner Modules Import ───────────────────────────────────


class TestScannerModuleImports:
    """Verify all scanner modules can be imported and have correct metadata."""

    @pytest.mark.parametrize("module_name,class_name,scanner_name", [
        ("scanner_modules.headers", "HeadersScanner", "headers"),
        ("scanner_modules.ssl", "SSLScanner", "ssl"),
        ("scanner_modules.tls", "TLSScanner", "tls"),
        ("scanner_modules.owasp", "OWASPScanner", "owasp"),
        ("scanner_modules.dns", "DNSScanner", "dns"),
        ("scanner_modules.crawler", "CrawlerScanner", "crawler"),
        ("scanner_modules.ports", "PortsScanner", "ports"),
        ("scanner_modules.subdomains", "SubdomainsScanner", "subdomains"),
        ("scanner_modules.secrets", "SecretsScanner", "secrets"),
        ("scanner_modules.repository", "RepositoryScanner", "repository"),
        ("scanner_modules.technology", "TechnologyScanner", "technology"),
        ("scanner_modules.cookies", "CookiesScanner", "cookies"),
        ("scanner_modules.redirects", "RedirectsScanner", "redirects"),
        ("scanner_modules.robots", "RobotsScanner", "robots"),
        ("scanner_modules.sitemap", "SitemapScanner", "sitemap"),
        ("scanner_modules.waf", "WAFScanner", "waf"),
        ("scanner_modules.http_methods", "HTTPMethodsScanner", "http_methods"),
        ("scanner_modules.information", "InformationScanner", "information"),
        ("scanner_modules.security_txt", "SecurityTxtScanner", "security_txt"),
        ("scanner_modules.favicon", "FaviconScanner", "favicon"),
        ("scanner_modules.fingerprint", "FingerprintScanner", "fingerprint"),
        ("scanner_modules.files", "FilesScanner", "files"),
        ("scanner_modules.api", "APIScanner", "api"),
    ])
    def test_scanner_module_import_and_metadata(
        self, module_name: str, class_name: str, scanner_name: str
    ):
        import importlib
        module = importlib.import_module(module_name)
        klass = getattr(module, class_name)

        # Verify SCANNER_NAME constant
        assert hasattr(klass, "SCANNER_NAME"), f"{class_name} missing SCANNER_NAME"
        assert klass.SCANNER_NAME == scanner_name

        # Verify metadata() returns required keys
        instance = klass.__new__(klass)
        instance.SCANNER_NAME = klass.SCANNER_NAME
        instance.config = ScannerConfig()
        instance.options = {}
        instance.target = "https://example.com"
        instance.logger = MagicMock()
        instance._temp_files = []

        meta = klass.metadata(instance)
        required_keys = {"name", "version", "description", "tool", "tool_version", "target_types", "output_format"}
        missing = required_keys - set(meta.keys())
        assert not missing, f"{class_name}.metadata() missing keys: {missing}"
        assert meta["name"] == scanner_name
