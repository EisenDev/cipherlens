# Product Requirements Document (PRD)

This document describes the high-level specifications and MVP requirements for **CipherLens**.

---

## 1. Product Vision
CipherLens provides developers and security engineers with a simple, developer-friendly defensive auditing interface to scan, explain, and mitigate vulnerabilities in website infrastructure and Git repository source code.

---

## 2. Core Functional Requirements (MVP)

### Target Management
* Users must be able to configure and register scanning Targets.
* Target types:
  * **Website Targets:** Defined by domain name or full URL (e.g., `https://example.com`).
  * **Git Repository Targets:** Defined by public or authenticated Git URLs (e.g., `https://github.com/org/repo.git`).

### Security Audits Execution
* **Website Scan Module:**
  * Validate SSL/TLS certificate configurations and expiration.
  * Check HTTP security response headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, etc.).
  * Identify open ports and exposed public files/endpoints.
* **Repository Scan Module:**
  * Scan for hardcoded API keys, database connection strings, passwords, and private SSH keys.
  * Scan project dependency lock files (`package-lock.json`, `requirements.txt`, etc.) for known CVEs.

### Task Scheduling & Queue
* Trigger scans immediately on user request.
* Display real-time status of scans (Pending, Running, Succeeded, Failed).

### AI Audit Reports
* Aggregate scan issues (vulnerabilities, headers config, leaked keys).
* Send context-aware prompt payloads to the AI model.
* Generate explanations detailing:
  * What the risk is.
  * How to remediate it.
  * Recommended code configurations or patches.
* Display report details inside the UI console and support PDF extraction.
