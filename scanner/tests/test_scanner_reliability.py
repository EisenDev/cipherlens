"""Regression tests for evidence-backed, truthful website scanner execution."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import ScannerConfig
from result import ScannerStatus
from scanner_modules.api import APIScanner
from scanner_modules.ssl import SSLScanner
from scanner_modules.technology import TechnologyScanner
from scanner_modules.tls import TLSScanner


def _tool_config(tmp_path: Path) -> ScannerConfig:
    tools = tmp_path / "tools"
    tools.mkdir()
    for name in ("testssl.sh", "httpx"):
        tool = tools / name
        tool.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        tool.chmod(0o755)
    return ScannerConfig(tools_dir=tools, temp_dir=tmp_path / "tmp")


def test_ssl_uses_one_resolved_ip_to_stay_within_module_timeout(tmp_path: Path) -> None:
    config = _tool_config(tmp_path)

    with patch("scanner_modules.ssl.run_tool", return_value=(0, "", "")) as run_tool:
        result = SSLScanner("https://example.test", config=config).run()

    command = run_tool.call_args.args[0]
    assert "--server-defaults" in command
    assert "--vulnerable" in command
    assert "--fast" not in command
    assert "--ip" in command
    assert command[command.index("--ip") + 1] == "one"
    assert result.status == ScannerStatus.SUCCESS


def test_ssl_timeout_is_actionable_timeout_not_partial(tmp_path: Path) -> None:
    config = _tool_config(tmp_path)

    with patch(
        "scanner_modules.ssl.run_tool",
        return_value=(-1, "", "TIMEOUT after 150s"),
    ):
        result = SSLScanner("https://example.test", config=config).run()

    assert result.status == ScannerStatus.TIMEOUT
    assert result.error_message == "SSL/TLS scan timed out before all checks completed."


def test_tls_missing_dns_runtime_is_actionable_failure(tmp_path: Path) -> None:
    config = _tool_config(tmp_path)
    stderr = 'Fatal error: Neither "dig", "host", "drill" nor "nslookup" is present'

    with patch("scanner_modules.tls.run_tool", return_value=(249, "", stderr)):
        result = TLSScanner("https://example.test", config=config).run()

    assert result.status == ScannerStatus.FAILED
    assert result.error_message == (
        "TLS scanner runtime is missing a DNS resolver utility "
        "(dig, host, drill, or nslookup)."
    )


def test_tls_parses_protocol_evidence_and_uses_one_ip(tmp_path: Path) -> None:
    config = _tool_config(tmp_path)

    def fake_run(command: list[str], timeout: int) -> tuple[int, str, str]:
        output_path = Path(command[command.index("--jsonfile") + 1])
        output_path.write_text(
            json.dumps(
                [
                    {"id": "TLS1", "finding": "offered (deprecated)"},
                    {"id": "TLS1_2", "finding": "offered (OK)"},
                ]
            ),
            encoding="utf-8",
        )
        return 0, "protocol evidence", ""

    with patch("scanner_modules.tls.run_tool", side_effect=fake_run) as run_tool:
        result = TLSScanner("https://example.test", config=config).run()

    command = run_tool.call_args.args[0]
    assert command[command.index("--ip") + 1] == "one"
    assert result.status == ScannerStatus.SUCCESS
    assert [finding.title for finding in result.findings] == [
        "Deprecated Protocol Enabled: TLS1"
    ]


def test_unimplemented_module_cannot_report_success() -> None:
    scanner = APIScanner("https://example.test")
    result = scanner.run()

    assert result.status == ScannerStatus.SKIPPED
    assert "not implemented" in (result.error_message or "").lower()
    assert scanner.metadata()["implemented"] is False


def test_technology_signals_are_categorized_with_provenance(tmp_path: Path) -> None:
    config = _tool_config(tmp_path)
    httpx_result = {
        "url": "https://example.test",
        "status_code": 200,
        "tech": ["Cloudflare", "Express", "PostgreSQL"],
        "response_headers": {"server": "cloudflare", "x-powered-by": "Express"},
    }

    with (
        patch(
            "scanner_modules.technology.run_tool",
            return_value=(0, json.dumps(httpx_result), ""),
        ),
        patch.object(TechnologyScanner, "_run_custom_signature_scan", return_value={}),
    ):
        result = TechnologyScanner("https://example.test", config=config).run()

    inventory = result.findings[0].raw_data["inventory"]
    by_name = {item["name"]: item for item in inventory}
    assert by_name["Cloudflare"]["category"] == "Edge / CDN / WAF"
    assert by_name["Express"]["category"] == "Backend Frameworks & Platforms"
    assert by_name["PostgreSQL"]["category"] == "Databases & Cache"
    assert all(item["source"] == "httpx" for item in inventory)
    assert all(item["confidence"] in {"confirmed", "probable", "possible"} for item in inventory)


def test_generic_body_words_do_not_claim_backend_or_database() -> None:
    scanner = TechnologyScanner("https://example.test")
    signals = scanner._match_signatures(
        headers="content-type: text/html",
        cookies="session=abc",
        body="Spring is here. Express yourself. This is a React tutorial.",
    )

    names = {item["name"] for item in signals}
    assert "React" not in names
    assert "Spring Boot" not in names
    assert "Node.js / Express" not in names
    assert "PostgreSQL" not in names
