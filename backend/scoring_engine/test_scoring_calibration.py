"""
CipherLens — Scoring Engine v3 Calibration Suite
=================================================

Validates the scoring engine against known calibration targets.
Run: python3 backend/scoring_engine/test_scoring_calibration.py
"""
import sys
sys.path.insert(0, 'backend')

from scoring_engine.scoring import calculate_score, ScoringResult

# ─── CALIBRATION SCENARIOS ────────────────────────────────────────────────────
# Each scenario represents a realistic scan profile for a known target type.
# All findings are representative of what CipherLens scanners actually produce.

MODULES_FULL = [
    "headers", "ssl", "tls", "dns", "ports", "owasp",
    "cookies", "technology", "crawler", "subdomains"
]
MODULES_PARTIAL = ["headers", "ssl", "tls", "dns", "owasp"]


def make_result(name: str, findings: list, modules: list, expected_min: int, expected_max: int) -> bool:
    r = calculate_score(findings, modules)
    ok = expected_min <= r.overall_score <= expected_max
    status = "✅ PASS" if ok else "❌ FAIL"
    print(f"\n{'─'*70}")
    print(f"{status}  {name}")
    print(f"  Score:    {r.overall_score}  (expected {expected_min}–{expected_max})")
    print(f"  Posture:  {r.posture}")
    print(f"  Risk:     {r.risk_level}")
    print(f"  Penalty:  net={r.net_penalty:.3f}  raw={r.total_raw_penalty:.3f}  bonus={r.positive_bonus:.3f}")
    print(f"  Unique:   {r.unique_finding_count} findings (after dedup)")
    print(f"  Positive: {r.positive_signals} signals")
    if r.top_contributors:
        top = r.top_contributors[0]
        print(f"  Top hit:  {top['title'][:60]}  ({top['effective_penalty']:.4f} pts)")
    if r.score_breakdown.get("by_category"):
        cats = list(r.score_breakdown["by_category"].items())[:3]
        print(f"  By cat:   " + " | ".join(f"{k}: {v}" for k, v in cats))
    return ok


# ─── SCENARIO 1: Cloudflare (highly secure CDN, WAF, HSTS, modern TLS) ────────
CLOUDFLARE = dict(
    name="Cloudflare",
    expected_min=93, expected_max=100,
    modules=MODULES_FULL,
    findings=[
        # INFO only — technology disclosures
        {"title": "Cloudflare CDN Detected", "severity": "INFO", "module": "waf", "description": "Cloudflare WAF detected"},
        {"title": "Next.js — Detected via HTTPX", "severity": "INFO", "module": "technology", "description": "Technology fingerprint identified component"},
        {"title": "nginx:1.27 — Detected via HTTPX", "severity": "INFO", "module": "technology", "description": "Version identified"},
        {"title": "React — Detected via HTTPX", "severity": "INFO", "module": "technology", "description": "Framework detected"},
        # Positive signal findings
        {"title": "HSTS Enabled (max-age=31536000)", "severity": "INFO", "module": "headers", "description": "hsts enabled"},
        {"title": "TLS 1.3 Supported", "severity": "INFO", "module": "ssl", "description": "tls1.3 supported"},
        {"title": "WAF Detected: Cloudflare", "severity": "INFO", "module": "waf", "description": "cloudflare waf detected"},
        {"title": "Modern Cipher Suite Only", "severity": "INFO", "module": "ssl", "description": "forward secrecy enabled"},
        {"title": "Rate Limiting Active", "severity": "INFO", "module": "crawler", "description": "rate limiting detected on 429"},
        {"title": "Security.txt Present", "severity": "INFO", "module": "crawler", "description": "security.txt found"},
        # Only minor header issue
        {"title": "Missing Permissions-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
    ],
)

# ─── SCENARIO 2: Google (enterprise, WAF, HSTS, excellent posture) ─────────────
GOOGLE = dict(
    name="Google",
    expected_min=91, expected_max=100,
    modules=MODULES_FULL,
    findings=[
        {"title": "Google Cloud CDN Detected", "severity": "INFO", "module": "technology", "description": "technology detected"},
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "hsts enabled max-age"},
        {"title": "WAF Detected: Google Cloud Armor", "severity": "INFO", "module": "waf", "description": "cloudflare waf detected ddos protection"},
        {"title": "TLS 1.3 Supported", "severity": "INFO", "module": "ssl", "description": "tlsv1.3 supported"},
        {"title": "Modern Cipher Suite", "severity": "INFO", "module": "ssl", "description": "forward secrecy chacha20"},
        {"title": "Missing X-Frame-Options", "severity": "LOW", "module": "headers", "description": "missing x-frame header"},
        {"title": "Missing Referrer-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Missing Permissions-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
    ],
)

# ─── SCENARIO 3: GitHub (good posture, some minor headers) ─────────────────────
GITHUB = dict(
    name="GitHub",
    expected_min=88, expected_max=98,
    modules=MODULES_FULL,
    findings=[
        {"title": "GitHub Technology Detected", "severity": "INFO", "module": "technology", "description": "fingerprint identified component"},
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "hsts enabled present"},
        {"title": "CSP Configured", "severity": "INFO", "module": "headers", "description": "csp present configured"},
        {"title": "Rate Limiting Active", "severity": "INFO", "module": "crawler", "description": "rate limiting detected"},
        {"title": "TLS 1.3 Supported", "severity": "INFO", "module": "ssl", "description": "tls 1.3 supported"},
        {"title": "Missing Referrer-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Missing Permissions-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Cookie missing SameSite attribute", "severity": "LOW", "module": "cookies", "description": "cookie flag missing samesite"},
    ],
)

# ─── SCENARIO 4: Stripe (PCI-compliant, strict headers, excellent TLS) ─────────
STRIPE = dict(
    name="Stripe",
    expected_min=88, expected_max=98,
    modules=MODULES_FULL,
    findings=[
        {"title": "HSTS Enabled (max-age=31536000; includeSubDomains)", "severity": "INFO", "module": "headers", "description": "hsts enabled present"},
        {"title": "TLS 1.3 Only", "severity": "INFO", "module": "ssl", "description": "tls1.3 modern cipher forward secrecy"},
        {"title": "WAF Detected", "severity": "INFO", "module": "waf", "description": "cloudflare waf detected"},
        {"title": "CSP Configured", "severity": "INFO", "module": "headers", "description": "csp configured present"},
        {"title": "DNSSEC Enabled", "severity": "INFO", "module": "dns", "description": "dnssec enabled configured"},
        {"title": "CAA DNS Record Present", "severity": "INFO", "module": "dns", "description": "caa record configured"},
        {"title": "Missing Permissions-Policy", "severity": "LOW", "module": "headers", "description": "security header missing"},
    ],
)

# ─── SCENARIO 5: YouTube (Google infra, good headers but some minor issues) ────
YOUTUBE = dict(
    name="YouTube",
    expected_min=86, expected_max=97,
    modules=MODULES_FULL,
    findings=[
        {"title": "Google Cloud Infra Detected", "severity": "INFO", "module": "technology", "description": "technology detected fingerprint"},
        {"title": "WAF Active", "severity": "INFO", "module": "waf", "description": "cloudflare waf detected ddos protection"},
        {"title": "TLS 1.3 Supported", "severity": "INFO", "module": "ssl", "description": "tlsv1.3"},
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "hsts enabled max-age"},
        {"title": "Missing Permissions-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Missing Referrer-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Missing X-Content-Type-Options Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
    ],
)

# ─── SCENARIO 6: Supabase / OpenAI (modern SaaS, a few missing headers) ────────
SUPABASE = dict(
    name="Supabase / OpenAI",
    expected_min=83, expected_max=96,
    modules=MODULES_FULL,
    findings=[
        {"title": "HSTS Enabled", "severity": "INFO", "module": "headers", "description": "hsts enabled"},
        {"title": "TLS 1.3 Supported", "severity": "INFO", "module": "ssl", "description": "tls 1.3 supported"},
        {"title": "Missing Content-Security-Policy", "severity": "MEDIUM", "module": "headers", "description": "content-security-policy missing csp"},
        {"title": "Missing X-Frame-Options Header", "severity": "MEDIUM", "module": "headers", "description": "missing x-frame clickjacking"},
        {"title": "Missing Referrer-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "Missing Permissions-Policy Header", "severity": "LOW", "module": "headers", "description": "security header missing"},
        {"title": "SPF Record Missing", "severity": "MEDIUM", "module": "dns", "description": "spf missing record"},
    ],
)

# ─── SCENARIO 7: Typical SaaS with moderate issues ──────────────────────────────
MODERATE_SAAS = dict(
    name="Typical SaaS (moderate issues)",
    expected_min=60, expected_max=82,
    modules=MODULES_FULL,
    findings=[
        {"title": "TLS 1.0 Supported (Deprecated)", "severity": "HIGH", "module": "ssl", "description": "tls 1.0 deprecated ssl protocol"},
        {"title": "Missing Strict-Transport-Security (HSTS)", "severity": "HIGH", "module": "headers", "description": "missing hsts"},
        {"title": "Missing Content-Security-Policy", "severity": "MEDIUM", "module": "headers", "description": "missing csp content-security-policy"},
        {"title": "Missing X-Frame-Options", "severity": "MEDIUM", "module": "headers", "description": "missing x-frame clickjacking"},
        {"title": "SPF Record Missing", "severity": "MEDIUM", "module": "dns", "description": "spf missing record"},
        {"title": "DMARC Record Missing", "severity": "MEDIUM", "module": "dns", "description": "dmarc missing record"},
        {"title": "Directory Listing Enabled", "severity": "MEDIUM", "module": "crawler", "description": "directory listing autoindex"},
        {"title": "Server Header Discloses Version", "severity": "LOW", "module": "headers", "description": "version disclosure server header"},
        {"title": "Cookie Missing Secure Flag", "severity": "LOW", "module": "cookies", "description": "cookie secure flag missing"},
        {"title": "Open CORS Policy", "severity": "MEDIUM", "module": "headers", "description": "cors misconfiguration wildcard"},
    ],
)

# ─── SCENARIO 8: OWASP Juice Shop (intentionally vulnerable) ────────────────────
JUICE_SHOP = dict(
    name="OWASP Juice Shop",
    expected_min=8, expected_max=30,
    modules=MODULES_FULL,
    findings=[
        {"title": "SQL Injection Detected", "severity": "CRITICAL", "module": "owasp", "description": "sql injection sqli blind sql verified"},
        {"title": "Cross-Site Scripting (XSS)", "severity": "HIGH", "module": "owasp", "description": "cross-site scripting xss reflected"},
        {"title": "Broken Authentication", "severity": "CRITICAL", "module": "owasp", "description": "authentication bypass broken authentication"},
        {"title": "Sensitive Data Exposure", "severity": "HIGH", "module": "owasp", "description": "sensitive data exposure information disclosure"},
        {"title": "Insecure Direct Object Reference (IDOR)", "severity": "HIGH", "module": "owasp", "description": "idor broken access control"},
        {"title": "Open Redirect", "severity": "MEDIUM", "module": "owasp", "description": "open redirect url redirect"},
        {"title": "Missing Content-Security-Policy", "severity": "MEDIUM", "module": "headers", "description": "missing csp content-security-policy"},
        {"title": "Missing HSTS", "severity": "HIGH", "module": "headers", "description": "missing hsts strict-transport-security"},
        {"title": "Directory Listing Enabled on /assets/", "severity": "MEDIUM", "module": "crawler", "description": "directory listing autoindex file listing"},
        {"title": "Command Injection Possible", "severity": "CRITICAL", "module": "owasp", "description": "command injection os command injection verified"},
        {"title": "Admin Panel Exposed (/administration)", "severity": "HIGH", "module": "owasp", "description": "unauthenticated admin panel exposed"},
        {"title": "Debug Mode Enabled", "severity": "MEDIUM", "module": "owasp", "description": "debug information disclosure"},
    ],
)

# ─── SCENARIO 9: DVWA (Damn Vulnerable Web App) ─────────────────────────────────
DVWA = dict(
    name="DVWA",
    expected_min=0, expected_max=22,
    modules=MODULES_FULL,
    findings=[
        {"title": "SQL Injection (Low Security)", "severity": "CRITICAL", "module": "owasp", "description": "sql injection sqli verified exploitable"},
        {"title": "Remote Code Execution via File Upload", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution rce file upload arbitrary code"},
        {"title": "Command Injection (Ping utility)", "severity": "CRITICAL", "module": "owasp", "description": "command injection os command"},
        {"title": "Broken Authentication (default admin/password)", "severity": "CRITICAL", "module": "owasp", "description": "authentication bypass default password default credential"},
        {"title": "Stored XSS in Guestbook", "severity": "HIGH", "module": "owasp", "description": "cross-site scripting xss stored xss"},
        {"title": "CSRF Vulnerability", "severity": "HIGH", "module": "owasp", "description": "broken access control unauthorized access"},
        {"title": "Local File Inclusion (LFI)", "severity": "HIGH", "module": "owasp", "description": "local file inclusion lfi path traversal"},
        {"title": "File Upload Bypass — Unrestricted", "severity": "HIGH", "module": "owasp", "description": "broken access control arbitrary file"},
        {"title": "PHP Source Code Disclosure", "severity": "HIGH", "module": "owasp", "description": "source code disclosure information disclosure"},
        {"title": "Open CORS Policy", "severity": "MEDIUM", "module": "headers", "description": "cors misconfiguration wildcard cors vulnerability"},
        {"title": "Missing HSTS", "severity": "HIGH", "module": "headers", "description": "missing hsts strict-transport-security"},
        {"title": "Missing Content-Security-Policy", "severity": "MEDIUM", "module": "headers", "description": "missing csp content-security-policy"},
    ],
)

# ─── SCENARIO 10: Metasploitable 2 (catastrophic) ────────────────────────────────
METASPLOITABLE = dict(
    name="Metasploitable 2",
    expected_min=0, expected_max=10,
    modules=MODULES_FULL,
    findings=[
        {"title": "Heartbleed (CVE-2014-0160)", "severity": "CRITICAL", "module": "ssl", "description": "heartbleed cve-2014-0160 exploit verified"},
        {"title": "Remote Code Execution via distccd (CVE-2004-2687)", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution rce cve- exploit"},
        {"title": "vsftpd 2.3.4 Backdoor (CVE-2011-2523)", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution rce backdoor cve-"},
        {"title": "Samba Arbitrary Code Execution (CVE-2007-2447)", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution rce arbitrary code cve-"},
        {"title": "Default Credentials — PostgreSQL (postgres/postgres)", "severity": "CRITICAL", "module": "ports", "description": "default credential authentication bypass default password"},
        {"title": "Default Credentials — MySQL (root/empty)", "severity": "CRITICAL", "module": "ports", "description": "default credential authentication bypass default password"},
        {"title": "UnrealIRCd Backdoor (CVE-2010-2075)", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution rce backdoor cve-"},
        {"title": "PHP 5.2 Remote Code Execution (CVE-2012-1823)", "severity": "CRITICAL", "module": "owasp", "description": "remote code execution cve- exploit"},
        {"title": "Apache Tomcat Default Credentials (admin/admin)", "severity": "CRITICAL", "module": "owasp", "description": "authentication bypass default credential default password"},
        {"title": "Telnet Service Exposed (unauthenticated)", "severity": "CRITICAL", "module": "ports", "description": "telnet unauthenticated service exposed"},
        {"title": "VNC Without Authentication", "severity": "CRITICAL", "module": "ports", "description": "unauthenticated service exposed no authentication"},
        {"title": "SSL v2 Supported (DROWN-vulnerable)", "severity": "CRITICAL", "module": "ssl", "description": "sslv2 deprecated ssl drown"},
        {"title": "FTP Anonymous Login Enabled", "severity": "HIGH", "module": "ports", "description": "ftp anonymous exposed service"},
        {"title": "MySQL Exposed Publicly (Port 3306)", "severity": "HIGH", "module": "ports", "description": "mysql exposed port open"},
        {"title": "PostgreSQL Exposed Publicly (Port 5432)", "severity": "HIGH", "module": "ports", "description": "postgres exposed port open"},
        {"title": "NFS Share Exposed Without Auth", "severity": "HIGH", "module": "ports", "description": "unauthenticated service exposed"},
    ],
)


def run_all():
    scenarios = [
        CLOUDFLARE, GOOGLE, GITHUB, STRIPE, YOUTUBE, SUPABASE,
        MODERATE_SAAS, JUICE_SHOP, DVWA, METASPLOITABLE,
    ]
    passed = 0
    failed = 0
    print("\n" + "═" * 70)
    print("  CipherLens Scoring Engine v3 — Calibration Suite")
    print("═" * 70)

    for s in scenarios:
        ok = make_result(
            name=s["name"],
            findings=s["findings"],
            modules=s["modules"],
            expected_min=s["expected_min"],
            expected_max=s["expected_max"],
        )
        if ok:
            passed += 1
        else:
            failed += 1

    print("\n" + "═" * 70)
    print(f"  Results: {passed}/{passed+failed} scenarios passed")
    print("═" * 70 + "\n")
    return failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
