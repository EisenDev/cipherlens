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
from utils.scoring import calculate_score, CATEGORY_CATALOGUE


def test_base_clean_scenarios():
    """A target with zero findings should score a perfect 100."""
    res = calculate_score([], ["headers", "ssl"])
    assert res.overall_score == 100
    assert res.posture == "Excellent"
    assert res.risk_level == "LOW"
    assert res.unique_finding_count == 0


def test_cvss_override_integration():
    """CVSS base score should override internal category weights if CVSS is higher."""
    # CSRF has weight 7.5 under IDOR/access control or fallback 2.0.
    # Let's verify with an explicit CVSS of 9.8.
    findings = [{
        "title": "CSRF Vulnerability",
        "severity": "HIGH",
        "module": "owasp",
        "description": "Cross-site request forgery",
        "rawData": {"cvss": 9.8}
    }]
    # With cvss 9.8 (ex=medium: 0.90, bi=high: 1.00, conf=high: 0.85, rel=1.00, exp=public: 1.0)
    # raw penalty = 9.8 * 0.9 * 1.0 * 0.85 * 1.0 * 1.0 = 7.497
    res = calculate_score(findings, ["owasp"])
    assert res.unique_finding_count == 1
    # Check that the raw penalty is high due to the CVSS override (> 3.5)
    assert res.total_raw_penalty > 3.5
    assert res.overall_score < 90


def test_scanner_reliability_multipliers():
    """Weak scanner detections (like crawler guesses) should hit the score less than reliable ones."""
    # SQL injection detected via verified nuclei vs crawler guess
    findings_nuclei = [{
        "title": "SQL Injection",
        "severity": "CRITICAL",
        "module": "owasp", # reliability 1.00
        "tool": "nuclei",
        "description": "SQL injection detected"
    }]
    findings_crawler = [{
        "title": "SQL Injection",
        "severity": "CRITICAL",
        "module": "crawler", # reliability 0.55
        "tool": "katana",
        "description": "SQL injection detected"
    }]

    res_nuclei = calculate_score(findings_nuclei, ["owasp"])
    res_crawler = calculate_score(findings_crawler, ["crawler"])

    # Nuclei detection should produce higher penalty and lower score than crawler guess
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
    # Run with both modules
    res = calculate_score(findings, ["crawler", "headers"])
    
    # Both report the same title -> should deduplicate to 1 unique finding
    assert res.unique_finding_count == 1
    assert res.negative_signals == 1
    # Multi-scanner agreement should escalate confidence compared to single passive detection
    assert len(res.top_contributors[0]["detectors"]) == 2


def test_diminishing_returns():
    """Multiple findings of the same category must scale down progressively (diminishing returns)."""
    # 1 missing header vs 3 missing headers of same type
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

    # Penalty for 3 findings should be strictly less than 3 * penalty of 1 finding
    assert res_3.total_raw_penalty < 3.0 * res_1.total_raw_penalty


def test_positive_security_signals():
    """Strong defensive signals like WAF or HSTS should offset minor findings up to the ratio cap."""
    findings = [
        {"title": "Missing Referrer-Policy", "severity": "LOW", "module": "headers"},
        # Positive signals
        {"title": "WAF Detected", "severity": "INFO", "module": "waf", "description": "Cloudflare active"},
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "max-age=31536000"}
    ]

    res = calculate_score(findings, ["headers", "waf"])
    # 2 positive signals detected
    assert res.positive_signals == 2
    # Bonus ratio cap (25%) should apply to raw penalty, leaving 75% net penalty
    assert res.net_penalty == pytest.approx(res.total_raw_penalty * 0.75, rel=1e-3)
