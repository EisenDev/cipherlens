# Phase 3.0 — Scanner Framework Architecture

**Status:** Complete  
**Date:** 2026-07-06  
**Phase:** 3.0 — Scanner Framework & Tool Installation

---

## Overview

CipherLens Phase 3.0 establishes the scanner engine architecture. The scanner is a standalone Python module that wraps well-known open-source security tools and normalizes their output into structured JSON.

```
Frontend
  ↓
FastAPI (Phase 3.1)
  ↓
Scanner Manager
  ↓
Individual Scanner Modules (23)
  ↓
Open Source Security Tools
  ↓
Normalized JSON (ScannerResult / Finding)
  ↓
PostgreSQL (Phase 3.1)
```

---

## Directory Structure

```
scanner/
├── base.py              # Abstract BaseScanner class
├── config.py            # Centralized ScannerConfig (pydantic-settings)
├── manager.py           # ScannerManager orchestrator
├── registry.py          # ScannerRegistry (Registry pattern)
├── result.py            # Normalized data models (Finding, ScannerResult, AggregatedScanResult)
├── runner.py            # CLI entry point
├── utils.py             # Shared utilities (run_tool, parse_jsonl, etc.)
├── requirements.txt     # Python dependencies
├── tools/               # Downloaded binary security tools
│   ├── nuclei
│   ├── httpx
│   ├── katana
│   ├── subfinder
│   ├── dnsx
│   ├── naabu
│   ├── trufflehog
│   ├── gitleaks
│   └── testssl.sh
├── scanner_modules/     # Individual scanner implementations
│   ├── api.py           # api endpoint exposure check (FULLY IMPLEMENTED)
│   ├── cookies.py       # cookie attribute validation (FULLY IMPLEMENTED)
│   ├── crawler.py       # katana web crawler (FULLY IMPLEMENTED)
│   ├── dns.py           # dnsx DNS records audit (FULLY IMPLEMENTED)
│   ├── favicon.py       # favicon hash fingerprint (FULLY IMPLEMENTED)
│   ├── files.py         # sensitive files checker (FULLY IMPLEMENTED)
│   ├── fingerprint.py   # ssl/tls metadata fingerprint (FULLY IMPLEMENTED)
│   ├── headers.py       # httpx security headers (FULLY IMPLEMENTED)
│   ├── http_methods.py  # allowed http methods probe (FULLY IMPLEMENTED)
│   ├── information.py   # exposed server metadata probe (FULLY IMPLEMENTED)
│   ├── owasp.py         # nuclei OWASP template checks (FULLY IMPLEMENTED)
│   ├── ports.py         # naabu port scanner (FULLY IMPLEMENTED)
│   ├── redirects.py     # redirect loop & open redirect check (FULLY IMPLEMENTED)
│   ├── repository.py    # semgrep source code analysis (FULLY IMPLEMENTED)
│   ├── robots.py        # robots.txt configuration audit (FULLY IMPLEMENTED)
│   ├── secrets.py       # trufflehog + gitleaks credentials scan (FULLY IMPLEMENTED)
│   ├── security_txt.py  # security.txt file audit (FULLY IMPLEMENTED)
│   ├── sitemap.py       # sitemap XML parser (FULLY IMPLEMENTED)
│   ├── ssl.py           # testssl.sh comprehensive ssl scan (FULLY IMPLEMENTED)
│   ├── subdomains.py    # subfinder subdomain enum (FULLY IMPLEMENTED)
│   ├── technology.py    # httpx stack detection (FULLY IMPLEMENTED)
│   ├── tls.py           # testssl.sh protocol versions audit (FULLY IMPLEMENTED)
│   └── waf.py           # web application firewall check (FULLY IMPLEMENTED)
├── tests/
│   └── test_scanner_framework.py  # 48 unit tests
└── tmp/                 # Temporary scan output files
```

---

## Installed Security Tools

| Tool | Version | Purpose |
|------|---------|---------|
| nuclei | v3.3.9 | OWASP template checks, CVE detection |
| httpx | v1.6.10 | HTTP probing, header analysis, tech detection |
| katana | v1.1.0 | Web crawling, endpoint discovery |
| subfinder | v2.6.7 | Passive subdomain enumeration |
| dnsx | v1.2.1 | DNS record analysis (SPF, DMARC, etc.) |
| naabu | v2.3.1 | TCP port scanning |
| trufflehog | v3.88.15 | Git secret scanning (verified) |
| gitleaks | v8.24.3 | Filesystem secret scanning |
| testssl.sh | v3.2.0 | SSL/TLS comprehensive analysis |
| semgrep | v1.168.0 | SAST code vulnerability analysis |

All binaries located at `scanner/tools/`.

---

## Scanner Classification by Security Domain

To align the execution framework with both the dashboard reporting logic and product design schemas, scanner modules are classified into five primary Security Domains:

### 1. Security
* **OWASP Top 10 (`owasp`)**: Probes targets against known CVEs and OWASP top 10 categories.
* **Security Headers (`headers`)**: Analyzes response headers to ensure essential policy directives are in place.
* **SSL/TLS Analysis (`ssl`)**: Performs rigorous checks on server certificates, cryptographic handshakes, and cipher trust.
* **TLS Version Audits (`tls`)**: Identifies supported TLS/SSL protocol versions and detects weak/deprecated versions.

### 2. Infrastructure
* **DNS Analysis (`dns`)**: Analyzes target DNS records for configuration security and mail compliance (SPF, DMARC, DKIM).
* **Port Scan (`ports`)**: Discovers exposed TCP ports and identifies running services.
* **Subdomain Enumeration (`subdomains`)**: Enumerates passive and active subdomains.
* **WAF Detection (`waf`)**: Framework integration is complete, but detection logic is currently minimal and will be expanded in future iterations. The module executes successfully and is ready for enhancement with signature-based or heuristic WAF detection.

### 3. Application
* **Technology Detection (`technology`)**: Identifies technologies such as web servers, frameworks, CMS platforms, programming languages, CDNs, JavaScript libraries, and other components powering the target application.
* **HTTP Methods (`http_methods`)**: Verifies which HTTP methods are allowed by the server and identifies potentially dangerous methods such as PUT, DELETE, TRACE, CONNECT, or WebDAV-related verbs.
* **Redirects Analysis (`redirects`)**: Inspects redirects to detect potential open redirect vulnerabilities, redirect loops, and verify strict HTTPS enforcement.
* **Cookie Analysis (`cookies`)**: Validates cookie security attributes including Secure, HttpOnly, SameSite, expiration policies, and other security-related cookie configurations.
* **Information Disclosure (`information`)**: Collects publicly exposed server metadata, response headers, banners, version disclosures, and other informational indicators that may assist further security analysis.
* **Robots.txt (`robots`)**: Audits `robots.txt` directives for crawler exclusions and exposed administrative boundaries.
* **Sitemap (`sitemap`)**: Parses `sitemap.xml` entries to trace target layout and endpoint scopes.
* **security.txt (`security_txt`)**: Validates existence and formatting of standard security contact configurations.

### 4. Discovery
* **Crawler (`crawler`)**: Executes Katana to crawl the application, discover endpoints, JavaScript assets, hidden files, forms, APIs, and attack surface for downstream security modules.
* **Exposed Files (`files`)**: Checks for publicly accessible sensitive files such as .env, .git, backup archives, configuration files, database exports, and other commonly exposed resources.
* **Fingerprint (`fingerprint`)**: Fingerprints SSL/TLS metadata and TLS signatures.
* **Favicon Hash (`favicon`)**: Computes favicon hashes to aid in asset association and OSINT.

### 5. Repository
These modules are fully implemented and execute only when the scan target is a Git repository. They are intentionally excluded from Website scans because they analyze source code, commits, dependencies, and repository contents rather than deployed web applications.
* **Secret Detection (`secrets`)**: Searches repository history and file trees for exposed keys and hardcoded credentials.
* **SAST Analysis (`repository`)**: Executes static application security testing audits on repository code.

---

## Underlying Security Engines

CipherLens combines battle-tested open-source security tools with native Python scanners through a unified execution framework.

### External Security Engines

* **Nuclei**
  - OWASP vulnerability detection
* **Katana**
  - Web crawling and attack surface discovery
* **httpx**
  - Security headers
  - Technology detection
* **testssl.sh**
  - SSL/TLS configuration analysis
* **dnsx**
  - DNS enumeration
* **naabu**
  - Port scanning
* **subfinder**
  - Subdomain discovery
* **TruffleHog**
  - Secret detection
* **Gitleaks**
  - Secret detection
* **Semgrep**
  - Static code analysis

---

## Core Architecture

### BaseScanner Abstract Class

```python
class MyScanner(BaseScanner):
    SCANNER_NAME = "my_scanner"
    SCANNER_VERSION = "1.0.0"

    def validate(self) -> None:
        # Pre-flight checks: tool available? target valid?
        self.config.tool_path("mytool")  # Raises if not installed

    def execute(self) -> ScannerResult:
        # Run the tool, normalize output, return ScannerResult
        return ScannerResult(...)

    def metadata(self) -> Dict[str, Any]:
        return {
            "name": self.SCANNER_NAME,
            "version": self.SCANNER_VERSION,
            "description": "...",
            "tool": "mytool",
            "tool_version": "1.0",
            "target_types": ["WEBSITE"],
            "output_format": "JSONL",
        }
```

**Lifecycle:** `initialize()` → `validate()` → `execute()` → `cleanup()`  
Use `scanner.run()` to execute the full lifecycle safely.

### ScannerRegistry (Registry Pattern)

```python
from registry import scanner_registry

# Load all 23 default scanners
scanner_registry.load_default_scanners()

# Get names of all registered scanners
scanner_registry.names()  # → ['api', 'cookies', 'crawler', ...]
```

Adding a new scanner: implement `BaseScanner`, add it to `registry.py`'s `load_default_scanners()`. No other code changes needed.

### ScannerManager (Orchestrator)

```python
from manager import ScannerManager

manager = ScannerManager()
result = manager.run_scan(
    target="https://example.com",
    target_type="WEBSITE",
    scanner_names=["headers", "ssl", "dns"],  # None = all applicable
    parallel=False,
)
# result is an AggregatedScanResult
```

### Result Models

```python
Finding           # Single normalized vulnerability finding
ScannerResult     # Output from one scanner module
AggregatedScanResult  # All results combined + risk score
```

Every scanner **must** produce `Finding` objects — never raw dicts.

---

## Running the Scanner (CLI)

```bash
# List all available scanners
python scanner/runner.py --list-scanners

# Run specific scanners against a website
python scanner/runner.py --target https://example.com --scanners headers,ssl,dns

# Run all applicable scanners
python scanner/runner.py --target https://example.com --type WEBSITE

# Run repository scanners
python scanner/runner.py --target /path/to/repo --type REPOSITORY --scanners secrets,repository

# Save results to JSON
python scanner/runner.py --target https://example.com --output results.json
```

---

## Configuration

All settings are in `scanner/config.py` and can be overridden via environment variables:

```bash
# Override tools directory
CIPHERLENS_TOOLS_DIR=/opt/security-tools

# Override specific tool path
CIPHERLENS_TOOL_NUCLEI=/usr/local/bin/nuclei

# Override timeout
CIPHERLENS_DEFAULT_TIMEOUT=300

# Override concurrency
CIPHERLENS_DEFAULT_CONCURRENCY=10
```

---

## Risk Scoring

`AggregatedScanResult.risk_score` returns a 0-100 score:
- Start at 100 (perfect)
- CRITICAL finding: -25
- HIGH finding: -10
- MEDIUM finding: -5
- LOW finding: -2
- Clamped at 0 (worst case)

---

## Rules & Constraints

1. **Never alter raw tool output** — store in `tool_raw_output` unmodified
2. **Never return raw dicts** — always produce `Finding` objects
3. **Never raise exceptions from `execute()`** — catch all errors, return `status=FAILED`
4. **Never call FastAPI, PostgreSQL, or React** — scanner is isolated
5. **Single scanner failure must not halt the pipeline** — `ScannerManager` isolates failures
6. **Evidence preservation is mandatory** — every `Finding` must have real `evidence`

---

## Phase 3.2A — Queue, Worker & Background Execution Pipeline

In Phase 3.2A, we built the asynchronous background execution pipeline. This connects the FastAPI scans router to a dedicated background worker via a Redis task queue.

### Architecture Flow

```
React (NewScanModal) 
  ↓ (POST /api/scans)
FastAPI Endpoint 
  ↓ (Enqueue scan_id)
Redis Queue (cipherlens:scan_queue)
  ↓ (BLPOP)
Background Worker (worker.py)
  ↓ (ScanExecutionService)
ScannerManager
  ↓ (run_scan)
Individual Scanners
  ↓ (Write Results / Logs)
PostgreSQL Database
```

### Queue System (Redis)
- Managed via `ScanQueue` under `backend/services/queue.py`.
- Utilizes Redis list commands (`RPUSH` / `BLPOP`) for low-overhead, resilient job dispatching.
- Gracefully handles offline Redis instances, logging warnings and storing tasks locally without crashing API request processing.

### Background Worker (`worker.py`)
- Standalone Python process running continuously in the workspace.
- Listens for signals (SIGINT, SIGTERM) to shutdown gracefully, ensuring active scans complete or persist correct state logs.
- Retrieves queued scan IDs from Redis and invokes the `ScanExecutionService`.

### Scan Execution Service (`backend/services/execution.py`)
- Coordinates the execution stages and DB status tracking.
- Updates scan lifecycle states (`PREPARING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
- Dynamically executes individual modules independently:
  - Tracks and updates module statuses (`WAITING`, `RUNNING`, `COMPLETED`, `FAILED`).
  - Progress percentage updates progressively: `progress = 10 + (completed_modules / total) * 90`.
  - Aggregates final duration, starts/ends timestamps, logs, and errors directly in SQL tables.

