# Scanner Reliability and Evidence Contract

## Purpose

CipherLens website scans must report what was actually tested and what was actually
observed. A module may not report success merely because its Python function returned.

## Module status contract

- `SUCCESS`: the module completed its intended checks against the requested target.
- `PARTIAL`: at least one intended check completed, but another check or evidence source
  failed. Partial results and a human-readable reason must be preserved.
- `FAILED`: no intended check completed because execution aborted.
- `SKIPPED`: the module is unsupported, disabled, or not implemented. Skipped modules do
  not count toward coverage or modules executed.
- `TIMEOUT`: the module exceeded its configured execution deadline.

Every non-success result must include a safe, actionable error message. Raw tool output
may be retained for operator diagnostics but must not expose credentials or authorization
headers.

## Evidence contract

Every finding must be derived from the current target and contain:

- the requested target and final URL where applicable;
- the observed response header, body fragment, DNS answer, certificate property, or tool
  record that supports the finding;
- the evidence source and collection method;
- confidence (`confirmed`, `probable`, or `possible`) for technology fingerprints;
- no fabricated CVEs, versions, database products, or backend frameworks.

Two targets with different responses must not receive identical target-independent
findings. Deterministic remediation text may be shared; evidence may not.

## Technology fingerprinting

Website scans can only infer technologies exposed across the public HTTP/TLS boundary.
CipherLens must categorize detected technologies as frontend, server/backend, data store,
edge/CDN/WAF, or third-party and preserve the exact signal used for each detection.

Backend frameworks and databases are frequently hidden by reverse proxies and application
boundaries. When no reliable signal exists, the result must say `not externally
detectable`; it must not guess. Confirmed database inventory requires a future authenticated
agent, repository scan, SBOM, or explicit owner-provided integration.

## Passive website-scan boundary

Until ownership verification is implemented, default public website scans remain
non-destructive and low impact:

- only `GET`, `HEAD`, and `OPTIONS` requests are sent by passive modules;
- dangerous HTTP methods are inferred from `Allow`/CORS declarations and are not executed;
- exposed-file checks use a small allowlisted path set and response validation;
- request timeouts, redirect limits, response-size limits, and rate limits are mandatory;
- credentials, cookies, and custom authorization headers must be redacted from logs.

## Acceptance examples

- A valid HTTPS target completes SSL and TLS checks with certificate/protocol evidence.
- A tool installation failure is shown as `FAILED` with the missing dependency identified.
- A placeholder module is `SKIPPED` and does not improve scan coverage.
- A Cloudflare-fronted site may report Cloudflare while backend/database remain unknown.
- A response exposing `X-Powered-By: Express` may report Express with its header evidence.
- Two local fixture sites with different headers/bodies yield different fingerprints and
  findings.

## Error examples

- `TLS tool unavailable: testssl.sh dependency 'openssl' was not found.`
- `TLS scan partial: certificate checks completed, protocol checks timed out.`
- `Technology scan completed: backend and database were not externally detectable.`
