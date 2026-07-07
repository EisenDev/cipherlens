# Security Principles for CipherLens

As a security intelligence and defensive auditing platform, CipherLens must be built with the highest standards of safety, integrity, and trust. The following core security principles must guide every design choice, API endpoint, database schema, and scanner implementation.

---

## 1. Least Privilege
Every user, service container, and database connection must operate with the absolute minimum level of access required to complete its job.
* **Database Access:** The NestJS API connection must only have access to the public schema. Scanner jobs must never be granted credentials to write to the PostgreSQL database.
* **Worker Execution:** Scanners must run under unprivileged Unix accounts inside containers, with zero root-level operations.

## 2. Defense in Depth
Never rely on a single line of defense. Security controls must be implemented at multiple layers:
* **Network Layer:** API servers, Redis queues, and PostgreSQL databases must reside in private networks, exposed only via reverse proxies.
* **Application Layer:** Strict validation of API tokens, request models, rate-limiting, and content sanitization.
* **Database Layer:** Row-level security where applicable, parameterized queries (via Prisma ORM) to prevent SQL Injection.

## 3. Zero Trust
Never trust inputs, environments, or other services implicitly.
* **Payload Validation:** All results returned by the scanner engine must be fully validated against defined Pydantic and NestJS schemas before storage.
* **Target Validation:** Ensure user-submitted URLs and Git URLs are thoroughly parsed and sanitized to prevent Server-Side Request Forgery (SSRF) or remote code execution.

## 4. Secure by Default
The platform must be secure out of the box.
* **Headers:** Default security headers (Helmet) must be enabled on the API.
* **Cookies:** Cookies used for sessions/JWTs must use `HttpOnly`, `Secure`, and `SameSite=Strict`.
* **CORS:** Cross-Origin Resource Sharing policies must explicitly whitelist authorized origins.

## 5. Principle of Separation
Scanners and backend APIs must remain strictly separated.
* Scanner engines execute code-level checks and web requests. If a scanner is compromised or crashes due to scanning a malicious repository, it must not impact the backend API or expose database credentials.

## 6. Immutable Scan Results
Once a scan is completed and its JSON payload is persisted, it must become read-only.
* The API must not expose any update endpoints (`PATCH`/`PUT`) on historical scan reports or scan details.
* Any edits or recalculations must generate a new scan ID, leaving the original audit trail completely untouched.

## 7. No Destructive Scanning
CipherLens is a **defensive** audit platform, not an offensive exploits platform.
* Scanners are prohibited from executing automated exploits, brute-force attacks, high-load Denial of Service simulation, or writing files/database values to the scan target.
* All assessments must use passive and non-intrusive checking techniques.

## 8. Audit Transparency
Provide full visibility to target owners.
* Every scan must log its initiation details: who started it, when, what targets were audited, and what specific scanner modules were executed.
* User actions (e.g. login, project creation, report deletion) must generate audit logs.

## 9. AI-Assisted Explanations Only
The AI must act as an assistant, explaining findings, prioritizing risks, and suggesting remediation.
* **No Vulnerability Creation:** The AI is strictly forbidden from "finding" new vulnerabilities not reported by the underlying scanners. It must only process scanner evidence and explain it in human-friendly terms.

## 10. Scanner Evidence Preservation
Whenever a security issue is reported, the scanner must preserve the raw proof.
* Save the exact file path and line number of hardcoded secrets.
* Save the exact version and tree hierarchy of a vulnerable dependency.
* Save the exact response headers showing missing configurations.
* This ensures audits are verifiable and reproducible by developers.
