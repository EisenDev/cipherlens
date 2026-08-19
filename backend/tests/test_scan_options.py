"""Contract tests for advanced scan configuration normalization and safety."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.scan_options import (  # noqa: E402
    UnsafeScanConfiguration,
    normalize_scan_options,
    validate_safe_configuration,
)


def test_normalize_scan_options_maps_grouped_contract_to_runtime_keys():
    grouped = {
        "crawling": {
            "depth": "Deep (5 levels)",
            "limit": 250,
            "respectRobots": False,
            "subdomains": True,
            "externalLinks": False,
            "discoverForms": True,
            "ignoreQueryParams": "utm_source, ref",
            "userAgent": "Chrome Desktop",
            "delay": 350,
        },
        "performance": {
            "timeout": 45,
            "connectionTimeout": 8,
            "maxConcurrent": 7,
            "rpsLimit": 20,
            "maxRetries": 2,
            "maxRedirects": 4,
        },
        "exclusions": {
            "paths": "/admin/.*\n/private/.*",
            "extensions": ".pdf\nzip",
            "patterns": ".*(logout|delete).*",
            "caseSensitive": False,
        },
        "proxy": {
            "useProxy": True,
            "type": "HTTP",
            "url": "127.0.0.1:8080",
        },
        "headers": [{"name": "X-Requested-With", "value": "XMLHttpRequest"}],
    }

    options = normalize_scan_options(grouped)

    assert options["config_version"] == 1
    assert options["crawler_depth"] == 5
    assert options["crawler_max_pages"] == 250
    assert options["respect_robots"] is False
    assert options["crawl_subdomains"] is True
    assert options["crawl_external_links"] is False
    assert options["discover_forms"] is True
    assert options["ignore_query_params"] == ["utm_source", "ref"]
    assert options["user_agent"].startswith("Mozilla/5.0")
    assert options["request_delay_ms"] == 350
    assert options["timeout"] == 45
    assert options["connection_timeout"] == 8
    assert options["max_concurrent"] == 7
    assert options["rate_limit_rps"] == 20
    assert options["max_retries"] == 2
    assert options["max_redirects"] == 4
    assert options["excluded_extensions"] == ["pdf", "zip"]
    assert options["excluded_url_patterns"] == [
        "(?i:/admin/.*)",
        "(?i:/private/.*)",
        "(?i:.*(logout|delete).*)",
    ]
    assert options["proxy_url"] == "http://127.0.0.1:8080"
    assert options["custom_headers"] == [
        {"name": "X-Requested-With", "value": "XMLHttpRequest"}
    ]


@pytest.mark.parametrize(
    "configuration, expected_message",
    [
        (
            {"auth": {"type": "Bearer Token", "bearerToken": "secret"}},
            "Authentication configuration is not supported",
        ),
        (
            {"proxy": {"useProxy": True, "url": "http://user:pass@proxy:8080"}},
            "Credentialed proxy configuration is not supported",
        ),
        (
            {"proxy": {"useProxy": True, "url": "ftp://proxy.example:21"}},
            "Proxy URL must use HTTP, HTTPS, or SOCKS5",
        ),
        (
            {"headers": [{"name": "Authorization", "value": "secret"}]},
            "Authorization",
        ),
        (
            {"headers": [{"name": "X-Test\r\nInjected", "value": "value"}]},
            "line breaks",
        ),
    ],
)
def test_validate_safe_configuration_rejects_secret_or_injection_vectors(
    configuration, expected_message
):
    with pytest.raises(UnsafeScanConfiguration, match=expected_message):
        validate_safe_configuration(configuration)


def test_normalize_scan_options_does_not_include_unsupported_fields():
    options = normalize_scan_options(
        {
            "crawling": {"queryParams": "id,page"},
            "performance": {"retryDelay": 1000, "respectRetryAfter": True},
            "exclusions": {"mimeTypes": "image/*"},
        }
    )

    assert "allowed_query_parameters" not in options
    assert "retry_delay" not in options
    assert "respect_retry_after" not in options
    assert "excluded_mime_types" not in options
