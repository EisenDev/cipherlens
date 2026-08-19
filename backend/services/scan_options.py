"""Normalize and secure the versioned advanced scan configuration contract."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse, urlunparse


class UnsafeScanConfiguration(ValueError):
    """Raised when scan configuration could expose secrets or alter routing."""


FORBIDDEN_HEADER_NAMES = {
    "authorization",
    "connection",
    "content-length",
    "cookie",
    "forwarded",
    "host",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
}

USER_AGENTS = {
    "CipherLens Default": "CipherLens/1.0 Defensive-Security-Auditor",
    "Chrome Desktop": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36"
    ),
    "Firefox Desktop": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) "
        "Gecko/20100101 Firefox/128.0"
    ),
}

DEPTH_VALUES = {
    "Shallow (1 level)": 1,
    "Medium (2 levels)": 2,
    "Deep (5 levels)": 5,
}


def advanced_configuration_from_payload(payload: Any) -> dict[str, Any]:
    """Extract advanced configuration sections from a Pydantic request model."""
    configuration: dict[str, Any] = {"version": 1}
    for section in ("crawling", "auth", "proxy", "performance", "exclusions", "headers"):
        value = getattr(payload, section, None)
        if value is None:
            configuration[section] = [] if section == "headers" else {}
        elif isinstance(value, list):
            configuration[section] = [
                item.model_dump() if hasattr(item, "model_dump") else item for item in value
            ]
        elif hasattr(value, "model_dump"):
            configuration[section] = value.model_dump()
        else:
            configuration[section] = value
    return configuration


def _split_values(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        items = value
    else:
        items = re.split(r"[,\n]", str(value))
    return [str(item).strip() for item in items if str(item).strip()]


def _normalize_proxy(proxy: dict[str, Any]) -> str | None:
    if not proxy.get("useProxy"):
        return None
    raw_url = str(proxy.get("url", "")).strip()
    if not raw_url:
        return None
    proxy_type = str(proxy.get("type", "HTTP")).lower()
    if "://" not in raw_url:
        raw_url = f"{proxy_type}://{raw_url}"
    parsed = urlparse(raw_url)
    return urlunparse(parsed)


def validate_safe_configuration(configuration: dict[str, Any]) -> None:
    """Reject unsupported secret-bearing and header-injection configuration."""
    auth = configuration.get("auth") or {}
    if auth.get("type", "None") != "None":
        raise UnsafeScanConfiguration(
            "Authentication configuration is not supported until secure secret storage is configured."
        )

    proxy = configuration.get("proxy") or {}
    proxy_url = _normalize_proxy(proxy)
    parsed_proxy = urlparse(proxy_url) if proxy_url else None
    if proxy.get("useProxy") and (
        not parsed_proxy
        or parsed_proxy.scheme not in {"http", "https", "socks5"}
        or not parsed_proxy.hostname
    ):
        raise UnsafeScanConfiguration(
            "Proxy URL must use HTTP, HTTPS, or SOCKS5 and include a host."
        )
    if proxy.get("username") or proxy.get("password") or (
        parsed_proxy and (parsed_proxy.username or parsed_proxy.password)
    ):
        raise UnsafeScanConfiguration("Credentialed proxy configuration is not supported.")

    headers = configuration.get("headers") or []
    for header in headers:
        name = str(header.get("name", "")).strip()
        value = str(header.get("value", ""))
        if "\r" in name or "\n" in name or "\r" in value or "\n" in value:
            raise UnsafeScanConfiguration("Custom headers cannot contain line breaks.")
        if name.lower() in FORBIDDEN_HEADER_NAMES:
            raise UnsafeScanConfiguration(f"Custom header '{name}' is not allowed.")

    crawling = configuration.get("crawling") or {}
    if crawling.get("externalLinks") and headers:
        raise UnsafeScanConfiguration(
            "Custom headers cannot be combined with external-link crawling."
        )

    exclusions = configuration.get("exclusions") or {}
    for pattern in _split_values(exclusions.get("paths")) + _split_values(
        exclusions.get("patterns")
    ):
        try:
            re.compile(pattern)
        except re.error as error:
            raise UnsafeScanConfiguration(
                f"Invalid exclusion regular expression: {error}."
            ) from error


def normalize_scan_options(configuration: dict[str, Any]) -> dict[str, Any]:
    """Translate grouped API configuration into canonical scanner options."""
    validate_safe_configuration(configuration)
    crawling = configuration.get("crawling") or {}
    performance = configuration.get("performance") or {}
    exclusions = configuration.get("exclusions") or {}
    proxy = configuration.get("proxy") or {}
    headers = configuration.get("headers") or []

    raw_depth = crawling.get("depth", "Medium (2 levels)")
    depth = DEPTH_VALUES.get(str(raw_depth), raw_depth if isinstance(raw_depth, int) else 2)
    user_agent_name = str(crawling.get("userAgent", "CipherLens Default"))
    user_agent = (
        str(crawling.get("customUserAgent") or "").strip()
        if user_agent_name == "Custom UA"
        else USER_AGENTS.get(user_agent_name, USER_AGENTS["CipherLens Default"])
    )

    raw_patterns = _split_values(exclusions.get("paths")) + _split_values(
        exclusions.get("patterns")
    )
    if not exclusions.get("caseSensitive", False):
        raw_patterns = [f"(?i:{pattern})" for pattern in raw_patterns]

    normalized_headers = [
        {"name": str(header["name"]).strip(), "value": str(header.get("value", ""))}
        for header in headers
        if str(header.get("name", "")).strip()
    ]

    options: dict[str, Any] = {
        "config_version": 1,
        "crawler_depth": int(depth),
        "crawler_max_pages": int(crawling.get("limit", 500)),
        "respect_robots": bool(crawling.get("respectRobots", True)),
        "crawl_subdomains": bool(crawling.get("subdomains", False)),
        "crawl_external_links": bool(crawling.get("externalLinks", False)),
        "discover_forms": bool(crawling.get("discoverForms", False)),
        "ignore_query_params": _split_values(crawling.get("ignoreQueryParams")),
        "user_agent": user_agent or USER_AGENTS["CipherLens Default"],
        "request_delay_ms": int(crawling.get("delay", performance.get("delay", 0))),
        "timeout": int(performance.get("timeout", 30)),
        "connection_timeout": int(performance.get("connectionTimeout", 10)),
        "max_concurrent": int(performance.get("maxConcurrent", 10)),
        "rate_limit_rps": int(performance.get("rpsLimit", 50)),
        "max_retries": int(performance.get("maxRetries", 2)),
        "max_redirects": int(performance.get("maxRedirects", 10)),
        "follow_redirects": int(performance.get("maxRedirects", 10)) > 0,
        "excluded_extensions": [
            extension.removeprefix(".")
            for extension in _split_values(exclusions.get("extensions"))
        ],
        "excluded_url_patterns": raw_patterns,
        "custom_headers": normalized_headers,
    }
    proxy_url = _normalize_proxy(proxy)
    if proxy_url:
        options["proxy_url"] = proxy_url
    return options
