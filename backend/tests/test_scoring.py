"""
CipherLens — Scoring Engine Unit Tests
======================================

Covers:
  - Base category classification & scoring
  - Custom CVSS override integration
  - Scanner reliability coefficients
  - Exploitability & business impact multipliers
  - Deduplication logic (cross-scanner merging)
  - Diminishing returns (logarithmic curve)
  - Positive security signals bonus application
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from scoring_engine.scoring import calculate_score, CATEGORY_CATALOGUE


def test_base_clean_scenarios():
    """A target with zero findings should score a perfect 100."""
    res = calculate_score([], ["headers", "ssl"])
    assert res.overall_score == 100
    assert res.posture == "Excellent"
    assert res.risk_level == "LOW"
    assert res.unique_finding_count == 0


def test_cvss_override_integration():
    """CVSS base score should override internal category weights if CVSS is higher."""
    findings = [{
        "title": "CSRF Vulnerability",
        "severity": "HIGH",
        "module": "owasp",
        "description": "Cross-site request forgery",
        "rawData": {"cvss": 9.8}
    }]
    res = calculate_score(findings, ["owasp"])
    assert res.unique_finding_count == 1
    assert res.total_raw_penalty > 3.5
    assert res.overall_score < 90


def test_scanner_reliability_multipliers():
    """Weak scanner detections (like crawler guesses) should hit the score less than reliable ones."""
    findings_nuclei = [{
        "title": "SQL Injection",
        "severity": "CRITICAL",
        "module": "owasp",
        "tool": "nuclei",
        "description": "SQL injection detected"
    }]
    findings_crawler = [{
        "title": "SQL Injection",
        "severity": "CRITICAL",
        "module": "crawler",
        "tool": "katana",
        "description": "SQL injection detected"
    }]

    res_nuclei = calculate_score(findings_nuclei, ["owasp"])
    res_crawler = calculate_score(findings_crawler, ["crawler"])

    assert res_nuclei.total_raw_penalty > res_crawler.total_raw_penalty
    assert res_nuclei.overall_score < res_crawler.overall_score


def test_cross_module_deduplication():
    """Duplicate findings from different scanners should be merged and increase confidence instead of penalty."""
    findings = [
        {
            "title": "Apache Version Disclosure",
            "severity": "LOW",
            "module": "crawler",
            "description": "Apache version disclosed in header"
        },
        {
            "title": "Apache Version Disclosure",
            "severity": "LOW",
            "module": "headers",
            "description": "Apache version disclosed in server header"
        }
    ]
    res = calculate_score(findings, ["crawler", "headers"])
    
    assert res.unique_finding_count == 1
    assert res.negative_signals == 1
    assert len(res.top_contributors[0]["detectors"]) == 2


def test_diminishing_returns():
    """Multiple findings of the same category must scale down progressively (diminishing returns)."""
    findings_1 = [
        {"title": "Missing Referrer-Policy", "severity": "LOW", "module": "headers"}
    ]
    findings_3 = [
        {"title": "Missing Referrer-Policy", "severity": "LOW", "module": "headers"},
        {"title": "Missing Permissions-Policy", "severity": "LOW", "module": "headers"},
        {"title": "Missing X-Content-Type-Options", "severity": "LOW", "module": "headers"},
    ]

    res_1 = calculate_score(findings_1, ["headers"])
    res_3 = calculate_score(findings_3, ["headers"])

    assert res_3.total_raw_penalty < 3.0 * res_1.total_raw_penalty


def test_positive_security_signals():
    """Strong defensive signals like WAF or HSTS should offset minor findings up to the ratio cap."""
    findings = [
        {"title": "Missing Referrer-Policy", "severity": "LOW", "module": "headers"},
        {"title": "WAF Detected", "severity": "INFO", "module": "waf", "description": "Cloudflare active"},
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "max-age=31536000"}
    ]

    res = calculate_score(findings, ["headers", "waf"])
    assert res.positive_signals == 2
    assert res.net_penalty == pytest.approx(res.total_raw_penalty * 0.75, rel=1e-3)


def test_dynamic_posture_and_confidence_calculations():
    """Verify that backend scoring returns dynamic confidence, coverage, recommendation, color, icon, and AI summary."""
    findings = [
        {
            "title": "Deprecated Protocol Enabled: TLS1",
            "severity": "MEDIUM",
            "module": "tls",
            "description": "The server still accepts TLS1 connections."
        },
        {
            "title": "Deprecated Protocol Enabled: TLS1",
            "severity": "MEDIUM",
            "module": "ssl",
            "description": "Double check: TLS1 supported."
        }
    ]

    res = calculate_score(
        findings,
        completed_module_names=["tls", "ssl", "headers"],
        enabled_modules_count=5,
        failed_modules_count=1,
        target_url="https://youtube.com/"
    )

    # 1. Coverage
    # 3 completed out of 5 enabled = 60%
    assert res.coverage_score == 60

    # 2. Confidence
    # base 80 - 8 (coverage gap: 20 * (1 - 3/5)) - 5 (1 failed) + 5 (agreement bonus for duplicate TLS1) = 72
    assert res.confidence_score == 72

    # 3. Posture decision configurations
    assert res.posture in ("Excellent", "Good", "Fair", "Needs Attention", "Critical")
    assert res.posture_color in ("green", "blue", "yellow", "orange", "red")
    assert res.posture_icon in ("shield-check", "shield-alert", "shield-x")
    assert len(res.recommendation) > 5

    # 4. AI summary content checks
    assert "youtube.com" in res.ai_summary
    assert "3 out of 5" in res.ai_summary
    assert "Deprecated Protocol Enabled" in res.ai_summary

