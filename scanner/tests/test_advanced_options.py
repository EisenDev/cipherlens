"""Tests proving runtime options alter scanner tool invocations."""

from __future__ import annotations

import sys
from pathlib import Path

SCANNER_ROOT = Path(__file__).resolve().parents[1]
if str(SCANNER_ROOT) not in sys.path:
    sys.path.insert(0, str(SCANNER_ROOT))

from config import ScannerConfig  # noqa: E402
from scanner_modules.crawler import CrawlerScanner  # noqa: E402
from scanner_modules.headers import HeadersScanner  # noqa: E402


def test_crawler_command_applies_supported_advanced_options(tmp_path):
    tool = tmp_path / "katana"
    tool.write_text("#!/bin/sh\n")
    tool.chmod(0o755)
    config = ScannerConfig(tools_dir=tmp_path)
    scanner = CrawlerScanner(
        target="https://example.com",
        config=config,
        options={
            "crawler_depth": 5,
            "crawler_max_pages": 25,
            "respect_robots": True,
            "crawl_subdomains": True,
            "crawl_external_links": False,
            "discover_forms": True,
            "ignore_query_params": ["utm_source"],
            "user_agent": "CipherLens Test Agent",
            "request_delay_ms": 2000,
            "timeout": 40,
            "max_concurrent": 4,
            "rate_limit_rps": 12,
            "max_retries": 2,
            "max_redirects": 0,
            "excluded_extensions": ["pdf", "zip"],
            "excluded_url_patterns": [".*logout.*"],
            "proxy_url": "http://127.0.0.1:8080",
            "custom_headers": [{"name": "X-Test", "value": "safe"}],
        },
    )

    command = scanner.build_command()

    assert command[:3] == [str(tool), "-u", "https://example.com"]
    assert ["-depth", "5"] == command[command.index("-depth") : command.index("-depth") + 2]
    assert ["-timeout", "40"] == command[command.index("-timeout") : command.index("-timeout") + 2]
    assert ["-concurrency", "4"] == command[command.index("-concurrency") : command.index("-concurrency") + 2]
    assert ["-rate-limit", "12"] == command[command.index("-rate-limit") : command.index("-rate-limit") + 2]
    assert ["-retry", "2"] == command[command.index("-retry") : command.index("-retry") + 2]
    assert ["-delay", "2"] == command[command.index("-delay") : command.index("-delay") + 2]
    assert ["-proxy", "http://127.0.0.1:8080"] == command[command.index("-proxy") : command.index("-proxy") + 2]
    assert "-form-extraction" in command
    assert "-ignore-query-params" in command
    assert "-disable-redirects" in command
    assert "-known-files" in command
    assert "-extension-filter" in command
    assert "-crawl-out-scope" in command
    assert command.count("-headers") == 2
    assert scanner.max_pages == 25


def test_headers_command_applies_timeout_rate_proxy_and_safe_headers(tmp_path):
    tool = tmp_path / "httpx"
    tool.write_text("#!/bin/sh\n")
    tool.chmod(0o755)
    config = ScannerConfig(tools_dir=tmp_path)
    scanner = HeadersScanner(
        target="https://example.com",
        config=config,
        options={
            "timeout": 25,
            "max_concurrent": 3,
            "rate_limit_rps": 9,
            "max_retries": 1,
            "max_redirects": 2,
            "request_delay_ms": 250,
            "proxy_url": "http://127.0.0.1:8080",
            "user_agent": "CipherLens Test Agent",
            "custom_headers": [{"name": "X-Test", "value": "safe"}],
        },
    )

    command = scanner.build_command()

    assert ["-timeout", "25"] == command[command.index("-timeout") : command.index("-timeout") + 2]
    assert ["-threads", "3"] == command[command.index("-threads") : command.index("-threads") + 2]
    assert ["-rate-limit", "9"] == command[command.index("-rate-limit") : command.index("-rate-limit") + 2]
    assert ["-retries", "1"] == command[command.index("-retries") : command.index("-retries") + 2]
    assert ["-max-redirects", "2"] == command[command.index("-max-redirects") : command.index("-max-redirects") + 2]
    assert ["-delay", "250ms"] == command[command.index("-delay") : command.index("-delay") + 2]
    assert ["-proxy", "http://127.0.0.1:8080"] == command[command.index("-proxy") : command.index("-proxy") + 2]
    assert command.count("-header") == 2
    assert "-follow-host-redirects" in command


def test_tool_command_redaction_hides_header_and_proxy_values():
    command = [
        "httpx",
        "-header",
        "X-Test:sensitive-value",
        "-proxy",
        "http://private-proxy:8080",
        "-timeout",
        "20",
    ]

    rendered = HeadersScanner._redacted_command(command, {"-header", "-proxy"})

    assert "sensitive-value" not in rendered
    assert "private-proxy" not in rendered
    assert rendered.endswith("-timeout 20")


def test_robots_disallow_paths_become_crawler_exclusion_patterns():
    patterns = CrawlerScanner._parse_robots_disallow(
        "User-agent: *\nDisallow: /admin/\nDisallow: /private?token=1 # note\nAllow: /\n"
    )

    assert patterns == [r".*/admin/.*", r".*/private\?token=1.*"]
