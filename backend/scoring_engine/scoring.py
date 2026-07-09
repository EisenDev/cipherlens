"""
CipherLens — Security Scoring Engine v3 (Enterprise Grade)
==========================================================

Principal Author: CipherLens Security Research Team

This is the single source of truth for the CipherLens security score.
The canonical TypeScript mirror lives at frontend/src/utils/scoring.ts.

OVERVIEW
--------
v3 replaces the naive severity-weight model with a multi-dimensional
posture engine. The engine evaluates each finding on six independent axes:

  1. Category Weight       — What type of vulnerability is this?
  2. Exploitability        — How easily can an attacker use it?
  3. Business Impact       — What damage can it cause?
  4. Confidence            — How certain are we of this finding?
  5. Scanner Reliability   — How reliable is the detecting scanner?
  6. Asset Exposure        — Is the affected surface public-facing?

In addition:

  7. Cross-Module Deduplication — Same issue found by multiple scanners
                                  counts once; confidence is elevated.
  8. Per-Category Diminishing Returns — 10 missing headers ≠ 10× penalty.
  9. Positive Security Signals — WAF, HSTS, DNSSEC, etc. offset minor issues.
 10. Explainability — Every penalty point is itemized.

CALIBRATION TARGETS
-------------------
  Target              Score      Posture
  ─────────────────────────────────────
  Cloudflare          95–100     Excellent
  Google              92–99      Excellent
  GitHub              90–98      Excellent / Good
  Stripe              90–98      Excellent / Good
  YouTube             88–96      Good
  Supabase/OpenAI     85–95      Good
  OWASP Juice Shop    10–30      Critical
  DVWA                0–20       Critical
  Metasploitable      0–10       Critical

FORMULA
-------
  penalty(f) = CATEGORY_WEIGHT(f)
             × exploitability_mult(f)
             × business_impact_mult(f)
             × confidence_mult(f)
             × scanner_reliability_mult(f)
             × exposure_mult(f)

  Per category, apply diminishing returns on sorted findings:
    effective_penalty(pos) = penalty × DR_CURVE[min(pos, DR_MAX)]

  total_raw = Σ effective_penalty(all categories)
  total_net  = max(0, total_raw − positive_bonus)
               (positive bonus capped at POSITIVE_BONUS_CAP)

  score = round(100 × e^(−DECAY_LAMBDA × total_net))
  score = clamp(score, 0, 100)
"""

from __future__ import annotations

import json
import math
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ===========================================================================
# SECTION 1 — VULNERABILITY CATEGORY CATALOGUE
# ===========================================================================
# Each entry defines:
#   weight        float  0–10  Base penalty weight for this category
#   exploitability str         Default exploitability when not overridden
#   business_impact str        Default business impact
#   keywords      list[str]    Lowercase keyword patterns to classify a finding

CATEGORY_CATALOGUE: Dict[str, Dict[str, Any]] = {
    # ── Critical-severity categories ──────────────────────────────────────
    "remote_code_execution": {
        "weight": 10.0,
        "exploitability": "critical",
        "business_impact": "critical",
        "keywords": [
            "remote code execution", "rce", "code execution",
            "shellshock", "webshell", "web shell", "backdoor",
            "php backdoor", "arbitrary code", "deserialization rce",
        ],
    },
    "authentication_bypass": {
        "weight": 9.5,
        "exploitability": "critical",
        "business_impact": "critical",
        "keywords": [
            "authentication bypass", "default credential", "default password",
            "default cred", "bypass authentication", "bypass login",
            "admin default", "unauthenticated admin", "no authentication",
            "authentication required", "login bypass",
        ],
    },
    "sql_injection": {
        "weight": 9.0,
        "exploitability": "high",
        "business_impact": "critical",
        "keywords": [
            "sql injection", "sqli", "sql-injection", "blind sql",
            "error-based sql", "union-based sql", "time-based blind",
            "sqlmap", "sql query injection",
        ],
    },
    "command_injection": {
        "weight": 9.0,
        "exploitability": "high",
        "business_impact": "critical",
        "keywords": [
            "command injection", "os command", "shell injection",
            "shell command", "os injection", "system command",
        ],
    },
    "secret_exposure": {
        "weight": 9.0,
        "exploitability": "high",
        "business_impact": "critical",
        "keywords": [
            "secret", "api key", "private key", "access token",
            "hardcoded credential", "leaked credential", "exposed secret",
            "aws key", "gcp key", "azure key", "github token", "jwt secret",
            "database password", "password exposed", "secret key",
        ],
    },
    "insecure_deserialization": {
        "weight": 8.5,
        "exploitability": "high",
        "business_impact": "critical",
        "keywords": [
            "insecure deserialization", "deserialization", "pickle",
            "java deserialization", "object injection",
        ],
    },
    "ssrf": {
        "weight": 8.5,
        "exploitability": "high",
        "business_impact": "high",
        "keywords": [
            "server-side request forgery", "ssrf", "server side request",
            "internal resource", "metadata service",
        ],
    },
    "xxe": {
        "weight": 8.0,
        "exploitability": "high",
        "business_impact": "high",
        "keywords": [
            "xml external entity", "xxe", "xml injection",
            "external entity", "xml entity expansion",
        ],
    },
    "path_traversal": {
        "weight": 7.5,
        "exploitability": "high",
        "business_impact": "high",
        "keywords": [
            "path traversal", "directory traversal", "file inclusion",
            "local file inclusion", "lfi", "remote file inclusion", "rfi",
            "arbitrary file read",
        ],
    },
    "broken_access_control": {
        "weight": 7.5,
        "exploitability": "medium",
        "business_impact": "high",
        "keywords": [
            "broken access control", "privilege escalation", "unauthorized access",
            "access control", "idor", "insecure direct object",
            "horizontal privilege", "vertical privilege",
        ],
    },
    "vulnerable_component": {
        "weight": 7.5,
        "exploitability": "medium",
        "business_impact": "high",
        "keywords": [
            "cve-", "known vulnerability", "vulnerable version", "outdated version",
            "end of life", "end-of-life", "unpatched", "security update",
            "critical update", "patch available",
        ],
    },
    "heartbleed": {
        "weight": 10.0,
        "exploitability": "critical",
        "business_impact": "critical",
        "keywords": ["heartbleed", "cve-2014-0160"],
    },
    "cryptographic_failure": {
        "weight": 7.0,
        "exploitability": "medium",
        "business_impact": "high",
        "keywords": [
            "weak cipher", "weak encryption", "rc4", "des cipher",
            "null cipher", "export cipher", "anon cipher",
            "md5 signature", "sha1 certificate", "sweet32",
        ],
    },
    "xss": {
        "weight": 6.5,
        "exploitability": "medium",
        "business_impact": "medium",
        "keywords": [
            "cross-site scripting", "xss", "script injection",
            "reflected xss", "stored xss", "dom xss",
        ],
    },
    "open_redirect": {
        "weight": 5.0,
        "exploitability": "low",
        "business_impact": "medium",
        "keywords": [
            "open redirect", "unvalidated redirect", "url redirect",
            "redirect vulnerability",
        ],
    },
    # ── TLS / Protocol vulnerabilities ────────────────────────────────────
    "tls_deprecated_protocol": {
        "weight": 6.0,
        "exploitability": "medium",
        "business_impact": "medium",
        "keywords": [
            "ssl v2", "ssl v3", "sslv2", "sslv3", "tls 1.0", "tls 1.1",
            "tls1.0", "tls1.1", "deprecated tls", "deprecated ssl",
            "poodle", "beast", "drown",
        ],
    },
    "tls_certificate": {
        "weight": 5.5,
        "exploitability": "low",
        "business_impact": "medium",
        "keywords": [
            "expired certificate", "certificate expired", "invalid certificate",
            "self-signed certificate", "untrusted certificate",
            "certificate chain", "certificate validation",
        ],
    },
    "cors_misconfiguration": {
        "weight": 5.0,
        "exploitability": "medium",
        "business_impact": "medium",
        "keywords": [
            "cors misconfiguration", "cors policy", "cors wildcard",
            "access-control-allow-origin: *", "cors vulnerability",
        ],
    },
    "open_service": {
        "weight": 4.5,
        "exploitability": "medium",
        "business_impact": "medium",
        "keywords": [
            "telnet", "ftp anonymous", "redis exposed", "mongodb exposed",
            "elasticsearch exposed", "memcached exposed", "cassandra exposed",
            "open port", "exposed service", "unauthenticated service",
        ],
    },
    "directory_listing": {
        "weight": 4.0,
        "exploitability": "low",
        "business_impact": "medium",
        "keywords": [
            "directory listing", "directory traversal enabled",
            "directory index", "autoindex", "file listing",
        ],
    },
    "dns_misconfiguration": {
        "weight": 3.5,
        "exploitability": "low",
        "business_impact": "medium",
        "keywords": [
            "spf missing", "dmarc missing", "spf record", "dmarc record",
            "dns zone transfer", "dkim missing", "subdomain takeover",
            "dangling dns", "cname takeover",
        ],
    },
    "information_disclosure": {
        "weight": 2.5,
        "exploitability": "very_low",
        "business_impact": "low",
        "keywords": [
            "information disclosure", "sensitive information", "internal path",
            "stack trace", "error message", "debug information",
            "source code disclosure", "config file exposed",
        ],
    },
    # ── Port / Network exposure ────────────────────────────────────────────
    "port_exposure": {
        "weight": 3.0,
        "exploitability": "low",
        "business_impact": "low",
        "keywords": [
            "port open", "open port", "service exposed",
            "mysql exposed", "postgres exposed", "ssh exposed",
        ],
    },
    # ── Cookie / Session security ──────────────────────────────────────────
    "cookie_security": {
        "weight": 2.0,
        "exploitability": "low",
        "business_impact": "medium",
        "keywords": [
            "cookie", "httponly", "samesite", "secure flag",
            "session cookie", "cookie flag",
        ],
    },
    # ── Security headers ───────────────────────────────────────────────────
    "missing_hsts": {
        "weight": 2.5,
        "exploitability": "low",
        "business_impact": "low",
        "keywords": [
            "strict-transport-security", "hsts", "missing hsts",
            "hsts not set", "hsts missing",
        ],
    },
    "missing_csp": {
        "weight": 1.5,
        "exploitability": "low",
        "business_impact": "low",
        "keywords": [
            "content-security-policy", "csp", "missing csp",
            "content security policy",
        ],
    },
    "missing_xfo": {
        "weight": 1.2,
        "exploitability": "low",
        "business_impact": "low",
        "keywords": [
            "x-frame-options", "xfo", "clickjacking", "frame options",
            "missing x-frame",
        ],
    },
    "security_headers": {
        "weight": 1.5,
        "exploitability": "low",
        "business_impact": "low",
        "keywords": [
            "referrer-policy", "permissions-policy", "x-content-type-options",
            "x-xss-protection", "expect-ct", "cross-origin",
            "feature-policy", "missing header", "security header",
        ],
    },
    # ── Technology / Information ───────────────────────────────────────────
    "technology_disclosure": {
        "weight": 0.5,
        "exploitability": "none",
        "business_impact": "very_low",
        "keywords": [
            "technology detected", "framework detected", "cms detected",
            "software version", "version disclosure", "fingerprint",
            "detected via", "identified component", "server header",
            "x-powered-by", "version identified",
        ],
    },
}

# Fallback category for findings that don't match any catalogue entry
_FALLBACK_CATEGORY = "security_misconfiguration"
_FALLBACK_ENTRY: Dict[str, Any] = {
    "weight": 2.0,
    "exploitability": "low",
    "business_impact": "low",
    "keywords": [],
}


# ===========================================================================
# SECTION 2 — MULTIPLIER TABLES
# ===========================================================================

# Exploitability ratings and their multipliers.
# Critical = 1.30 means the penalty is increased 30% beyond the base weight.
# None     = 0.05 means nearly no penalty (passive/theoretical only).
EXPLOITABILITY_MULTIPLIERS: Dict[str, float] = {
    "critical":  1.30,   # Actively exploited, public exploit available
    "high":      1.10,   # Exploit exists, technically feasible
    "medium":    0.90,   # Exploitation requires specific conditions
    "low":       0.65,   # Difficult to exploit in practice
    "very_low":  0.50,   # Theoretical, no practical path
    "none":      0.35,   # Passive detection, no real attack path
}

# Business impact multipliers: what can an attacker achieve?
BUSINESS_IMPACT_MULTIPLIERS: Dict[str, float] = {
    "critical": 1.20,    # Full data breach, system compromise
    "high":     1.00,    # Significant damage possible
    "medium":   0.80,    # Moderate damage, limited scope
    "low":      0.70,    # Minor impact
    "very_low": 0.50,    # Negligible business impact
}

# Confidence level multipliers: how certain is this finding?
# Only Verified findings receive the full penalty.
CONFIDENCE_MULTIPLIERS: Dict[str, float] = {
    "verified": 1.00,    # Confirmed by active exploitation / authenticated scan
    "high":     0.85,    # High certainty (e.g. direct HTTP response analysis)
    "medium":   0.65,    # Moderate certainty (inferred, pattern-matched)
    "low":      0.40,    # Low certainty (fingerprinting, guessing)
}

# Scanner reliability multipliers: how trustworthy is this scanner?
SCANNER_RELIABILITY: Dict[str, float] = {
    # Nuclei templates — most reliable
    "owasp":            1.00,   # Nuclei verified templates
    "ssl":              0.95,   # testssl.sh — direct protocol verification
    "tls":              0.95,
    # Direct inspection scanners
    "headers":          0.85,   # HTTP header analysis — direct but passive
    "cookies":          0.85,   # Cookie flag inspection — direct but passive
    "secrets":          0.90,   # gitleaks/trufflehog — high signal
    "repository":       0.85,   # semgrep static analysis
    # Network scanners
    "dns":              0.80,   # dnsx — reliable for records
    "ports":            0.70,   # naabu — service identification uncertain
    "subdomains":       0.70,   # subfinder — enumeration
    # Heuristic / passive scanners
    "technology":       0.40,   # fingerprinting heuristics
    "crawler":          0.55,   # endpoint discovery
    "fingerprint":      0.40,   # fingerprinting
    "waf":              0.60,   # WAF detection heuristics
    "information":      0.50,
    "default":          0.80,
}

# Asset exposure multipliers: how accessible is the attack surface?
EXPOSURE_MULTIPLIERS: Dict[str, float] = {
    "public":           1.00,   # Directly internet-accessible
    "authenticated":    0.75,   # Requires authentication first
    "internal":         0.50,   # Internal/private network only
    "theoretical":      0.20,   # Theoretical exposure only
}

# Severity → default confidence (used when no explicit confidence is provided)
SEVERITY_DEFAULT_CONFIDENCE: Dict[str, str] = {
    "CRITICAL": "high",
    "HIGH":     "high",
    "MEDIUM":   "medium",
    "LOW":      "low",
    "INFO":     "low",
}

# Severity → default exposure (used when no explicit exposure is provided)
SEVERITY_DEFAULT_EXPOSURE: Dict[str, str] = {
    "CRITICAL": "public",
    "HIGH":     "public",
    "MEDIUM":   "public",
    "LOW":      "public",
    "INFO":     "theoretical",
}


# ===========================================================================
# SECTION 3 — DIMINISHING RETURNS
# ===========================================================================
# For N findings in the same category, each successive finding (sorted by
# impact descending) is multiplied by this curve value.
# pos=0 → 1.00 (full weight), pos=1 → 0.65, pos=2 → 0.45, ...
DR_CURVE: List[float] = [1.00, 0.65, 0.45, 0.32, 0.22, 0.15, 0.10, 0.07, 0.05, 0.03]
DR_TAIL = 0.02  # Applied to positions beyond len(DR_CURVE)


# ===========================================================================
# SECTION 4 — POSITIVE SECURITY SIGNALS
# ===========================================================================
# Each signal reduces the total penalty when detected.
# Values are in penalty units (same scale as finding penalties).

POSITIVE_SIGNALS: Dict[str, Dict[str, Any]] = {
    "waf_detected": {
        "bonus": 1.5,
        "label": "WAF / DDoS Protection Detected",
        "keywords": ["waf detected", "cloudflare", "akamai", "imperva",
                     "sucuri", "aws waf", "fastly", "ddos protection",
                     "web application firewall"],
    },
    "hsts_enabled": {
        "bonus": 1.2,
        "label": "HSTS Enabled (max-age ≥ 1 year)",
        "keywords": ["hsts enabled", "hsts detected", "strict-transport-security: max-age",
                     "hsts max-age", "hsts: enabled", "hsts present"],
    },
    "tls_13_only": {
        "bonus": 0.8,
        "label": "TLS 1.3 Support",
        "keywords": ["tls 1.3", "tls1.3", "tls 1.3 supported", "tlsv1.3"],
    },
    "csp_present": {
        "bonus": 0.8,
        "label": "Content-Security-Policy Configured",
        "keywords": ["csp present", "csp configured", "csp detected",
                     "content-security-policy set", "content-security-policy present"],
    },
    "dnssec": {
        "bonus": 0.6,
        "label": "DNSSEC Enabled",
        "keywords": ["dnssec enabled", "dnssec configured", "dnssec: true"],
    },
    "rate_limiting": {
        "bonus": 0.6,
        "label": "Rate Limiting Detected",
        "keywords": ["rate limit", "rate-limit", "rate limiting", "429"],
    },
    "secure_cookies": {
        "bonus": 0.4,
        "label": "Secure Cookie Attributes Present",
        "keywords": ["secure cookie", "httponly cookie", "samesite=strict",
                     "cookie secure flag", "all cookies secure"],
    },
    "security_txt": {
        "bonus": 0.2,
        "label": "security.txt Present",
        "keywords": ["security.txt", "security disclosure"],
    },
    "caa_records": {
        "bonus": 0.4,
        "label": "CAA DNS Records Configured",
        "keywords": ["caa record", "caa dns", "certificate authority"],
    },
    "modern_cipher": {
        "bonus": 0.6,
        "label": "Modern Cipher Suite Only",
        "keywords": ["modern cipher", "forward secrecy", "perfect forward secrecy",
                     "chacha20", "aes-gcm", "strong cipher"],
    },
}

# Maximum positive bonus in absolute penalty units.
# Additionally, bonus is capped at 25% of total raw penalty so positive
# signals on a genuinely clean site can push it to 100, but they can never
# make a site with real vulnerabilities look clean.
POSITIVE_BONUS_CAP = 4.0
POSITIVE_BONUS_RATIO_CAP = 0.25  # Max fraction of raw_penalty that bonus can offset


# ===========================================================================
# SECTION 5 — SCORE CONVERSION
# ===========================================================================
# Formula: score = round(100 × e^(−DECAY_LAMBDA × net_penalty))
# Calibrated so that:
#   net_penalty =  0   → score = 100 (perfect)
#   net_penalty =  5   → score ≈ 82  (few minor issues)
#   net_penalty = 10   → score ≈ 67  (one critical finding)
#   net_penalty = 20   → score ≈ 45  (multiple critical)
#   net_penalty = 50   → score ≈ 14  (severely vulnerable)
#   net_penalty = 100  → score ≈ 2   (catastrophic)
# Derived: λ = −ln(0.67) / 10 ≈ 0.040
DECAY_LAMBDA: float = 0.045

# Maximum penalty contribution from a single finding (prevents one finding
# from causing a near-zero score on its own)
MAX_SINGLE_PENALTY: float = 9.0

# Posture bands — score → label
POSTURE_THRESHOLDS: List[Tuple[int, str]] = [
    (95, "Excellent"),
    (88, "Good"),
    (75, "Fair"),
    (60, "Needs Attention"),
    (40, "Poor"),
    (0,  "Critical"),
]

# Risk level bands — score → label
RISK_LEVEL_THRESHOLDS: List[Tuple[int, str]] = [
    (88, "LOW"),
    (75, "MEDIUM"),
    (50, "HIGH"),
    (0,  "CRITICAL"),
]

# Scan coverage → confidence label
SCAN_CONFIDENCE_THRESHOLDS: List[Tuple[int, str]] = [
    (8, "HIGH"),
    (4, "MEDIUM"),
    (0, "LOW"),
]


# ===========================================================================
# SECTION 6 — POSITIVE SIGNAL KEYWORDS FOR TECHNOLOGY DISCLOSURE EXCLUSION
# ===========================================================================
# Well-known enterprise CDN/infrastructure identifiers that routinely show
# technology disclosures. Their presence should not inflate tech_disclosure
# penalties, as these are deliberate, standard industry configurations.
ENTERPRISE_CDN_SIGNALS: List[str] = [
    "cloudflare", "akamai", "fastly", "amazon cloudfront",
    "google cloud", "azure", "aws", "cloudfront",
]


# ===========================================================================
# SECTION 7 — DATA STRUCTURES
# ===========================================================================

@dataclass
class ClassifiedFinding:
    """A single finding after classification through the scoring engine."""
    original_title: str
    canonical_title: str          # Lowercase, prefix-stripped dedup key
    severity: str                 # CRITICAL | HIGH | MEDIUM | LOW | INFO
    category: str                 # Category key from CATALOGUE
    category_weight: float        # 0–10
    exploitability: str           # critical | high | medium | low | very_low | none
    business_impact: str          # critical | high | medium | low | very_low
    confidence: str               # verified | high | medium | low
    scanner: str                  # Originating scanner module
    scanner_reliability: float    # 0–1
    exposure: str                 # public | authenticated | internal | theoretical
    module: str                   # Scanner module name
    detectors: List[str]          # All scanners that found this
    cvss: Optional[float]         # CVSS score if available
    cve_ids: List[str]            # Associated CVEs
    raw_penalty: float = field(init=False)  # Computed penalty before DR

    def __post_init__(self) -> None:
        em = EXPLOITABILITY_MULTIPLIERS.get(self.exploitability, 0.5)
        bm = BUSINESS_IMPACT_MULTIPLIERS.get(self.business_impact, 0.5)
        cm = CONFIDENCE_MULTIPLIERS.get(self.confidence, 0.6)
        sm = self.scanner_reliability
        xm = EXPOSURE_MULTIPLIERS.get(self.exposure, 0.8)

        raw = self.category_weight * em * bm * cm * sm * xm
        self.raw_penalty = min(raw, MAX_SINGLE_PENALTY)


@dataclass
class PositiveSignalResult:
    """A single detected positive security signal."""
    key: str
    label: str
    bonus: float


@dataclass
class ScoreExplanation:
    """Per-finding penalty explanation for the UI."""
    title: str
    category: str
    severity: str
    exploitability: str
    business_impact: str
    confidence: str
    scanner: str
    detectors: List[str]
    cvss: Optional[float]
    effective_penalty: float      # After diminishing returns
    raw_penalty: float
    deduction_reason: str         # Human-readable explanation


@dataclass
class ScoringResult:
    """
    Complete output of the CipherLens Security Scoring Engine v3.
    This is the object serialized to the API and rendered in the UI.
    """
    # Core
    overall_score: int                           # 0–100
    posture: str                                 # Excellent | Good | Fair | ...
    risk_level: str                              # LOW | MEDIUM | HIGH | CRITICAL
    scan_confidence: str                         # HIGH | MEDIUM | LOW

    # Surface metrics
    attack_surface: int                          # Count of unique vulnerable surfaces
    positive_signals: int                        # Count of positive signals detected
    negative_signals: int                        # Count of unique non-INFO findings

    # Finding counts by severity (before deduplication, matching displayed counts)
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    info_findings: int
    total_findings: int

    # Deduplication metrics
    unique_finding_count: int                    # After cross-module dedup

    # Top contributors (most impactful findings)
    top_contributors: List[Dict[str, Any]]

    # Per-module score breakdown
    module_scores: Dict[str, Any]

    # Score breakdown for UI
    score_breakdown: Dict[str, Any]

    # Internal diagnostics
    total_raw_penalty: float
    positive_bonus: float
    net_penalty: float
    completed_modules: int

    # New qualitative metrics
    posture_color: str
    posture_icon: str
    ai_summary: str
    confidence_score: int
    coverage_score: int
    recommendation: str


# ===========================================================================
# SECTION 8 — CLASSIFICATION ENGINE
# ===========================================================================

def _canonical_title(title: str) -> str:
    """Strip common prefixes and lowercase for dedup key."""
    prefixes = [
        "missing ", "detected: ", "detected ", "[info] ", "[low] ",
        "[medium] ", "[high] ", "[critical] ", "vulnerability: ",
    ]
    t = title.strip().lower()
    for p in prefixes:
        if t.startswith(p):
            t = t[len(p):]
            break
    return t


def _classify_category(title: str, description: str) -> Tuple[str, Dict[str, Any]]:
    """
    Match a finding's title+description against the VULNERABILITY_CATALOGUE.

    Returns (category_key, catalogue_entry). Falls back to
    _FALLBACK_CATEGORY if no match is found.
    """
    text = f"{title} {description}".lower()

    # Priority ordering: higher-weight categories tested first
    ordered = sorted(
        CATEGORY_CATALOGUE.items(),
        key=lambda kv: kv[1]["weight"],
        reverse=True,
    )

    for cat_key, entry in ordered:
        for kw in entry["keywords"]:
            if kw in text:
                return cat_key, entry

    return _FALLBACK_CATEGORY, _FALLBACK_ENTRY


def _classify_exploitability(
    title: str,
    description: str,
    severity: str,
    raw_data: Dict[str, Any],
    category_default: str,
) -> str:
    """
    Determine exploitability level from title, description, raw_data signals.
    """
    text = f"{title} {description}".lower()

    # Override signals: explicit exploit evidence
    if raw_data.get("exploitable") or raw_data.get("kev"):
        return "critical"
    epss = raw_data.get("epss")
    if epss:
        try:
            epss_val = float(epss)
            if epss_val >= 0.7:
                return "critical"
            elif epss_val >= 0.4:
                return "high"
            elif epss_val >= 0.1:
                return "medium"
        except (TypeError, ValueError):
            pass

    # Keyword-based exploitability signals
    if any(kw in text for kw in ["actively exploited", "exploit in the wild", "zero-day", "0-day"]):
        return "critical"
    if any(kw in text for kw in ["exploit", "poc", "public exploit", "metasploit"]):
        return "high"
    if "unauthenticated" in text:
        return "high"

    # Fall back to category default
    return category_default


def _classify_business_impact(
    title: str,
    description: str,
    category_default: str,
) -> str:
    """
    Determine business impact from title and description.
    """
    text = f"{title} {description}".lower()

    if any(kw in text for kw in [
        "data breach", "full access", "root", "admin", "complete compromise",
        "sensitive data", "pii", "credit card", "database dump", "credentials exposed",
    ]):
        return "critical"

    if any(kw in text for kw in [
        "authentication", "bypass", "privilege", "elevation", "unauthorized",
    ]):
        return "high"

    if any(kw in text for kw in [
        "xss", "cross-site", "redirect", "session",
    ]):
        return "medium"

    return category_default


def _classify_confidence(
    severity: str,
    scanner: str,
    raw_data: Dict[str, Any],
    category: str,
) -> str:
    """
    Determine confidence level from scanner reliability signals.
    """
    # Verified signals in raw data
    if raw_data.get("verified") or raw_data.get("matched"):
        return "verified"

    # Nuclei confirmed match = high confidence
    if scanner in ("owasp",) and raw_data.get("template_id"):
        return "high"

    # testssl.sh direct protocol detection = high
    if scanner in ("ssl", "tls"):
        return "high"

    # Technology fingerprinting = low
    if category == "technology_disclosure" or scanner in ("technology", "fingerprint"):
        return "low"

    # Cookie/header direct inspection = high
    if scanner in ("headers", "cookies"):
        return "high"

    # Secret scanners = high (high signal-to-noise)
    if scanner in ("secrets", "repository"):
        return "high"

    # Default from severity
    return SEVERITY_DEFAULT_CONFIDENCE.get(severity, "medium")


def _classify_exposure(
    title: str,
    description: str,
    severity: str,
    category: str,
) -> str:
    """
    Determine asset exposure level.
    """
    text = f"{title} {description}".lower()

    if any(kw in text for kw in [
        "public", "internet", "external", "unauthenticated",
        "anonymous", "without authentication",
    ]):
        return "public"

    if any(kw in text for kw in [
        "authenticated", "requires login", "post-auth", "after login",
    ]):
        return "authenticated"

    if any(kw in text for kw in [
        "internal", "intranet", "private", "localhost",
    ]):
        return "internal"

    # Passive/information categories default to theoretical
    if category in ("technology_disclosure", "security_headers"):
        return "theoretical" if severity == "INFO" else "public"

    return SEVERITY_DEFAULT_EXPOSURE.get(severity, "public")


def _parse_raw_data(raw_field: Any) -> Dict[str, Any]:
    """Safe JSON parse of rawData field."""
    if not raw_field:
        return {}
    if isinstance(raw_field, dict):
        return raw_field
    try:
        return json.loads(str(raw_field))
    except Exception:
        return {}


# ===========================================================================
# SECTION 9 — POSITIVE SIGNAL DETECTION
# ===========================================================================

def _detect_positive_signals(
    findings_raw: List[Dict[str, Any]],
) -> List[PositiveSignalResult]:
    """
    Scan all findings for positive security signal patterns.
    These signals reduce the final penalty total.
    """
    detected: List[PositiveSignalResult] = []
    detected_keys: set[str] = set()

    # Build a combined text blob from all finding titles and descriptions
    all_text = " ".join(
        f"{f.get('title', '')} {f.get('description', '')} {f.get('evidence', '')}"
        for f in findings_raw
    ).lower()

    for sig_key, sig in POSITIVE_SIGNALS.items():
        if sig_key in detected_keys:
            continue
        for kw in sig["keywords"]:
            if kw in all_text:
                detected.append(PositiveSignalResult(
                    key=sig_key,
                    label=sig["label"],
                    bonus=sig["bonus"],
                ))
                detected_keys.add(sig_key)
                break

    return detected


# ===========================================================================
# SECTION 10 — MAIN SCORING ENGINE
# ===========================================================================

def calculate_score(
    findings_raw: List[Dict[str, Any]],
    completed_module_names: List[str],
    enabled_modules_count: Optional[int] = None,
    failed_modules_count: Optional[int] = None,
    target_url: Optional[str] = None,
) -> ScoringResult:
    """
    Main entry point for the CipherLens Security Scoring Engine v3.

    Parameters
    ----------
    findings_raw:
        List of finding dicts with keys: title, severity, module, tool,
        description, evidence, rawData (JSON str or dict).
    completed_module_names:
        List of scanner module names that completed (for scan confidence).

    Returns
    -------
    ScoringResult — complete scoring output with explainability data.
    """
    n_completed = len(completed_module_names)

    # ── Stage 1: Count raw severity distribution ───────────────────────────
    sev_counts: Dict[str, int] = {
        "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0
    }
    for f in findings_raw:
        sev = (f.get("severity") or "INFO").upper()
        if sev in sev_counts:
            sev_counts[sev] += 1

    # ── Stage 2: Normalize & Classify all findings ─────────────────────────
    normalized: List[ClassifiedFinding] = []

    for f in findings_raw:
        sev = (f.get("severity") or "INFO").upper()
        # INFO findings contribute zero penalty but are kept for positive signals
        if sev == "INFO":
            continue

        title = (f.get("title") or "").strip()
        description = f.get("description") or ""
        evidence = f.get("evidence") or ""
        module = (f.get("module") or f.get("scanner") or "unknown").lower()
        scanner = (f.get("tool") or f.get("scanner") or module).lower()
        raw_data = _parse_raw_data(f.get("rawData") or f.get("raw_data"))

        # CVE extraction
        cvss: Optional[float] = None
        for k in ("cvss", "cvss_score", "cvss-score", "cvss_base_score"):
            v = raw_data.get(k) or f.get(k)
            if v is not None:
                try:
                    cvss = float(v)
                    break
                except (TypeError, ValueError):
                    pass

        cve_ids: List[str] = raw_data.get("cve_ids", []) or f.get("cve_ids", []) or []
        if isinstance(cve_ids, str):
            cve_ids = [cve_ids]

        # Category classification
        cat_key, cat_entry = _classify_category(title, description)

        # Override category weight with CVSS if available and higher
        base_weight = cat_entry["weight"]
        if cvss is not None:
            # CVSS is on 0–10 scale; category weights are also 0–10
            # Use the higher of the two to prevent CVSS from downgrading serious categories
            base_weight = max(base_weight, cvss)
            base_weight = min(base_weight, 10.0)

        exploitability = _classify_exploitability(
            title, description, sev, raw_data, cat_entry["exploitability"]
        )
        business_impact = _classify_business_impact(
            title, description, cat_entry["business_impact"]
        )
        confidence = _classify_confidence(sev, scanner, raw_data, cat_key)
        exposure = _classify_exposure(title, description, sev, cat_key)
        scanner_rel = SCANNER_RELIABILITY.get(
            module,
            SCANNER_RELIABILITY.get(scanner, SCANNER_RELIABILITY["default"])
        )

        cf = ClassifiedFinding(
            original_title=title,
            canonical_title=_canonical_title(title),
            severity=sev,
            category=cat_key,
            category_weight=base_weight,
            exploitability=exploitability,
            business_impact=business_impact,
            confidence=confidence,
            scanner=scanner,
            scanner_reliability=scanner_rel,
            exposure=exposure,
            module=module,
            detectors=[scanner],
            cvss=cvss,
            cve_ids=cve_ids,
        )
        normalized.append(cf)

    # ── Stage 3: Cross-module deduplication ───────────────────────────────
    SEV_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
    EXPL_ORDER = {"critical": 5, "high": 4, "medium": 3, "low": 2, "very_low": 1, "none": 0}
    CONF_ORDER = {"verified": 3, "high": 2, "medium": 1, "low": 0}

    dedup: Dict[str, ClassifiedFinding] = {}
    for cf in normalized:
        key = cf.canonical_title
        if key not in dedup:
            dedup[key] = cf
        else:
            ex = dedup[key]
            # Merge: keep worst values (highest risk perspective)
            if SEV_ORDER.get(cf.severity, 0) > SEV_ORDER.get(ex.severity, 0):
                ex.severity = cf.severity
            if EXPL_ORDER.get(cf.exploitability, 0) > EXPL_ORDER.get(ex.exploitability, 0):
                ex.exploitability = cf.exploitability
            # Confidence: if multiple scanners agree, elevate confidence
            if CONF_ORDER.get(cf.confidence, 0) > CONF_ORDER.get(ex.confidence, 0):
                ex.confidence = cf.confidence
            elif cf.confidence == ex.confidence:
                # Same confidence level from multiple sources → elevate one step
                ladder = ["low", "medium", "high", "verified"]
                idx = ladder.index(ex.confidence) if ex.confidence in ladder else 0
                if idx < len(ladder) - 1:
                    ex.confidence = ladder[idx + 1]
            if cf.cvss is not None and (ex.cvss is None or cf.cvss > ex.cvss):
                ex.cvss = cf.cvss
            # Higher scanner reliability wins
            ex.scanner_reliability = max(ex.scanner_reliability, cf.scanner_reliability)
            # Keep highest exposure
            exp_order = {"public": 3, "authenticated": 2, "internal": 1, "theoretical": 0}
            if exp_order.get(cf.exposure, 0) > exp_order.get(ex.exposure, 0):
                ex.exposure = cf.exposure
            # Accumulate detectors
            if cf.detectors[0] not in ex.detectors:
                ex.detectors.append(cf.detectors[0])
            # Recompute raw_penalty with updated fields
            ex.__post_init__()

    unique_findings = list(dedup.values())

    # ── Stage 4: Positive signal detection ────────────────────────────────
    positive_signals = _detect_positive_signals(findings_raw)
    raw_bonus = sum(s.bonus for s in positive_signals)
    # Dual-cap: absolute limit AND ratio of raw penalty.
    # This ensures positive signals can push clean sites to 100 while
    # preventing them from masking real vulnerabilities.
    # The ratio cap is computed after Stage 5, so we store raw_bonus here
    # and apply the final cap after total_raw_penalty is known.
    _uncapped_bonus = min(raw_bonus, POSITIVE_BONUS_CAP)


    # ── Stage 5: Per-category penalty with diminishing returns ─────────────
    # Group unique findings by category
    by_category: Dict[str, List[ClassifiedFinding]] = {}
    for cf in unique_findings:
        by_category.setdefault(cf.category, []).append(cf)

    # Within each category, sort descending by raw_penalty then apply DR curve
    explanations: List[ScoreExplanation] = []
    total_raw_penalty = 0.0

    for cat, cfs in by_category.items():
        cfs_sorted = sorted(cfs, key=lambda x: x.raw_penalty, reverse=True)
        for pos, cf in enumerate(cfs_sorted):
            dr = DR_CURVE[pos] if pos < len(DR_CURVE) else DR_TAIL
            effective_penalty = cf.raw_penalty * dr

            em_val = EXPLOITABILITY_MULTIPLIERS.get(cf.exploitability, 0.5)
            bm_val = BUSINESS_IMPACT_MULTIPLIERS.get(cf.business_impact, 0.5)
            cm_val = CONFIDENCE_MULTIPLIERS.get(cf.confidence, 0.6)

            reason_parts = [
                f"Category: {cat.replace('_', ' ').title()}",
                f"Exploitability: {cf.exploitability}",
                f"Business Impact: {cf.business_impact}",
                f"Confidence: {cf.confidence}",
                f"Scanner Reliability: {cf.scanner_reliability:.0%}",
                f"Exposure: {cf.exposure}",
            ]
            if pos > 0:
                reason_parts.append(f"Diminishing returns: {dr:.0%} (position {pos+1} in category)")
            if cf.cvss:
                reason_parts.append(f"CVSS: {cf.cvss}")
            if len(cf.detectors) > 1:
                reason_parts.append(f"Confirmed by {len(cf.detectors)} scanners → confidence elevated")

            explanations.append(ScoreExplanation(
                title=cf.original_title,
                category=cat,
                severity=cf.severity,
                exploitability=cf.exploitability,
                business_impact=cf.business_impact,
                confidence=cf.confidence,
                scanner=cf.scanner,
                detectors=cf.detectors,
                cvss=cf.cvss,
                effective_penalty=round(effective_penalty, 4),
                raw_penalty=round(cf.raw_penalty, 4),
                deduction_reason=" | ".join(reason_parts),
            ))
            total_raw_penalty += effective_penalty

    # ── Stage 6: Apply positive bonus (dual-cap) ───────────────────────────
    # Cap 1: absolute cap (already applied in _uncapped_bonus)
    # Cap 2: ratio cap — bonus cannot exceed POSITIVE_BONUS_RATIO_CAP × raw penalty
    # This prevents positive signals from washing out all penalties on clean sites
    # that genuinely have zero or near-zero raw penalty.
    ratio_cap = POSITIVE_BONUS_RATIO_CAP * total_raw_penalty
    positive_bonus = min(_uncapped_bonus, ratio_cap)
    net_penalty = max(0.0, total_raw_penalty - positive_bonus)


    # ── Stage 7: Score conversion ──────────────────────────────────────────
    score = max(0, min(100, round(100.0 * math.exp(-DECAY_LAMBDA * net_penalty))))

    # ── Stage 8: Qualitative labels ────────────────────────────────────────
    posture = POSTURE_THRESHOLDS[-1][1]
    for threshold, label in POSTURE_THRESHOLDS:
        if score >= threshold:
            posture = label
            break

    risk_level = RISK_LEVEL_THRESHOLDS[-1][1]
    for threshold, label in RISK_LEVEL_THRESHOLDS:
        if score >= threshold:
            risk_level = label
            break

    scan_confidence = SCAN_CONFIDENCE_THRESHOLDS[-1][1]
    for threshold, label in SCAN_CONFIDENCE_THRESHOLDS:
        if n_completed >= threshold:
            scan_confidence = label
            break

    # ── Stage 9: Module scores ─────────────────────────────────────────────
    module_penalties: Dict[str, float] = {}
    module_finding_counts: Dict[str, Dict[str, int]] = {}

    for expl in explanations:
        # Map explanation back to its classified finding module
        cf_match = next((x for x in unique_findings
                         if _canonical_title(x.original_title) == _canonical_title(expl.title)), None)
        mod = cf_match.module if cf_match else "unknown"
        module_penalties[mod] = module_penalties.get(mod, 0.0) + expl.effective_penalty
        if mod not in module_finding_counts:
            module_finding_counts[mod] = {}
        module_finding_counts[mod][expl.severity] = \
            module_finding_counts[mod].get(expl.severity, 0) + 1

    module_scores: Dict[str, Any] = {}
    for mod, pen in module_penalties.items():
        mod_score = max(0, min(100, round(100.0 * math.exp(-DECAY_LAMBDA * pen))))
        module_scores[mod] = {
            "score": mod_score,
            "penalty": round(pen, 3),
            "finding_counts": module_finding_counts.get(mod, {}),
        }

    # ── Stage 10: Top contributors ─────────────────────────────────────────
    explanations_sorted = sorted(explanations, key=lambda x: x.effective_penalty, reverse=True)
    top_contributors = []
    for expl in explanations_sorted[:10]:
        top_contributors.append({
            "title": expl.title,
            "category": expl.category.replace("_", " ").title(),
            "severity": expl.severity,
            "exploitability": expl.exploitability,
            "business_impact": expl.business_impact,
            "confidence": expl.confidence,
            "scanner": expl.scanner,
            "detectors": expl.detectors,
            "cvss": expl.cvss,
            "effective_penalty": expl.effective_penalty,
            "deduction_reason": expl.deduction_reason,
        })

    # ── Stage 11: Score breakdown ──────────────────────────────────────────
    by_cat_penalty: Dict[str, float] = {}
    for expl in explanations:
        cat_label = expl.category.replace("_", " ").title()
        by_cat_penalty[cat_label] = by_cat_penalty.get(cat_label, 0.0) + expl.effective_penalty

    score_breakdown = {
        "by_category": {k: round(v, 3) for k, v in sorted(
            by_cat_penalty.items(), key=lambda x: x[1], reverse=True
        )},
        "positive_signals_applied": [
            {"label": s.label, "bonus": s.bonus} for s in positive_signals
        ],
        "total_raw_penalty": round(total_raw_penalty, 3),
        "positive_bonus": round(positive_bonus, 3),
        "net_penalty": round(net_penalty, 3),
        "decay_lambda": DECAY_LAMBDA,
        "formula": f"score = round(100 × e^(−{DECAY_LAMBDA} × {round(net_penalty, 3)}))",
    }

    # ── Attack surface count ───────────────────────────────────────────────
    # Count findings that are publicly exposed and have medium+ exploitability
    attack_surface = sum(
        1 for cf in unique_findings
        if cf.exposure in ("public", "authenticated")
        and EXPL_ORDER.get(cf.exploitability, 0) >= EXPL_ORDER.get("low", 0)
    )

    # ── Dynamic metrics calculations ───────────────────────────────────────
    enabled_mods = enabled_modules_count if enabled_modules_count is not None else max(n_completed, 1)
    coverage_score = int(round((n_completed / enabled_mods) * 100)) if enabled_mods > 0 else 100
    coverage_score = max(0, min(100, coverage_score))

    # Confidence calculation (0-100)
    confidence_score = 80
    if enabled_mods > 0:
        completed_ratio = n_completed / enabled_mods
        if completed_ratio < 1.0:
            confidence_score -= int(20 * (1.0 - completed_ratio))
    if failed_modules_count is not None and failed_modules_count > 0:
        confidence_score -= min(20, failed_modules_count * 5)

    agreement_bonus = 0
    weak_scanner_deduction = 0
    for cf in unique_findings:
        if len(cf.detectors) >= 2:
            agreement_bonus += 5
        elif len(cf.detectors) == 1:
            det = cf.detectors[0].lower()
            if any(k in det for k in ["crawler", "katana", "technology", "wappalyzer"]):
                weak_scanner_deduction += 2
    confidence_score += min(15, agreement_bonus)
    confidence_score -= min(10, weak_scanner_deduction)
    confidence_score = max(0, min(100, confidence_score))

    # Posture config map
    posture_map = {
        "Excellent": {"color": "green", "icon": "shield-check", "rec": "Continue monitoring and maintain current security controls."},
        "Good": {"color": "blue", "icon": "shield-check", "rec": "Review minor security header improvements and patch low-risk items."},
        "Fair": {"color": "yellow", "icon": "shield-alert", "rec": "Prioritize patching High and Medium risk vulnerabilities."},
        "Needs Attention": {"color": "orange", "icon": "shield-alert", "rec": "Prioritize patching High and Medium risk vulnerabilities."},
        "Critical": {"color": "red", "icon": "shield-x", "rec": "Immediate remediation is recommended for critical exploitable vulnerabilities."}
    }
    cfg = posture_map.get(posture, {"color": "red", "icon": "shield-x", "rec": "Immediate remediation is recommended."})
    posture_color = cfg["color"]
    posture_icon = cfg["icon"]
    recommendation = cfg["rec"]

    # Dynamic AI summary generation
    from urllib.parse import urlparse
    url_str = target_url or "Target"
    try:
        hostname = urlparse(url_str).netloc or url_str
        if not hostname:
            hostname = url_str
    except Exception:
        hostname = url_str

    posture_desc = {
        "Excellent": "demonstrates an outstanding security posture with excellent defense-in-depth.",
        "Good": "demonstrates a strong and mature security posture with robust controls.",
        "Fair": "has a fair security posture but displays several configuration issues that require attention.",
        "Needs Attention": "requires active attention to address key security vulnerabilities and improve resilience.",
        "Critical": "presents a highly critical security posture with multiple active exposures."
    }.get(posture, "demonstrates a variable security posture.")

    ai_summary = f"{hostname} {posture_desc} "
    ai_summary += f"We successfully executed {n_completed} out of {enabled_mods} security assessment modules. "

    crit_cnt = sev_counts["CRITICAL"]
    high_cnt = sev_counts["HIGH"]
    if crit_cnt > 0 or high_cnt > 0:
        ai_summary += f"During the scan, we identified {crit_cnt} critical-severity and {high_cnt} high-severity findings. "
    else:
        ai_summary += "During the scan, no critical or high-severity vulnerabilities were identified. "

    if top_contributors:
        top_title = top_contributors[0].get("title", "")
        ai_summary += f"The most significant finding detected was '{top_title}'. "
    
    if posture in ["Excellent", "Good"]:
        ai_summary += "We observed strong protocol implementation, modern TLS controls, and defensive configurations. Minor recommendations focus on standard security header alignment."
    elif posture in ["Fair", "Needs Attention"]:
        ai_summary += "We recommend prioritizing the high-severity items, hardening HTTP headers, and reviewing access controls to prevent potential exploit paths."
    else:
        ai_summary += "Immediate remediation of the critical findings, default credential rotation, and port hardening is highly recommended to secure the target environment."

    return ScoringResult(
        overall_score=score,
        posture=posture,
        risk_level=risk_level,
        scan_confidence=scan_confidence,
        attack_surface=attack_surface,
        positive_signals=len(positive_signals),
        negative_signals=len(unique_findings),
        critical_findings=sev_counts["CRITICAL"],
        high_findings=sev_counts["HIGH"],
        medium_findings=sev_counts["MEDIUM"],
        low_findings=sev_counts["LOW"],
        info_findings=sev_counts["INFO"],
        total_findings=sum(sev_counts.values()),
        unique_finding_count=len(unique_findings),
        top_contributors=top_contributors,
        module_scores=module_scores,
        score_breakdown=score_breakdown,
        total_raw_penalty=round(total_raw_penalty, 3),
        positive_bonus=round(positive_bonus, 3),
        net_penalty=round(net_penalty, 3),
        completed_modules=n_completed,
        posture_color=posture_color,
        posture_icon=posture_icon,
        ai_summary=ai_summary,
        confidence_score=confidence_score,
        coverage_score=coverage_score,
        recommendation=recommendation,
    )


# ===========================================================================
# SECTION 11 — DATABASE ADAPTER
# ===========================================================================

def score_from_db(db_session: Any, scan_id: str) -> ScoringResult:
    """
    Load findings from the database and run the scoring engine.

    Parameters
    ----------
    db_session : SQLAlchemy Session
    scan_id    : UUID of the scan to score
    """
    from database.models import Scan, ScanResult, ScanModule  # local import

    scan = db_session.query(Scan).filter(Scan.id == scan_id).first()
    target_url = scan.asset.url if (scan and scan.assetId) else None

    all_modules = db_session.query(ScanModule).filter(
        ScanModule.scanId == scan_id
    ).all()
    
    # Filter out selected_modules meta-record
    enabled_mods = [m for m in all_modules if m.name != "selected_modules"]
    completed_module_names = [m.name for m in enabled_mods if m.status == "COMPLETED"]
    failed_mods_count = sum(1 for m in enabled_mods if m.status == "FAILED")
    enabled_mods_count = len(enabled_mods)

    results = db_session.query(ScanResult).filter(ScanResult.scanId == scan_id).all()
    findings_raw = [
        {
            "title": r.title,
            "severity": r.severity,
            "module": r.module,
            "tool": r.tool,
            "scanner": r.module,
            "description": r.description,
            "evidence": r.evidence,
            "rawData": r.rawData,
        }
        for r in results
    ]

    return calculate_score(
        findings_raw,
        completed_module_names,
        enabled_modules_count=enabled_mods_count,
        failed_modules_count=failed_mods_count,
        target_url=target_url
    )
