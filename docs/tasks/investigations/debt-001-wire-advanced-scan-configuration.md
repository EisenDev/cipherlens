# [DEBT-001] Wire Advanced Scan Configuration Through the Scanner Pipeline

> **Implementation status:** Completed on 2026-08-19 for configuration version
> 1. Credentialed authentication and credentialed proxy support remain excluded
> until a dedicated encrypted secret-reference service is approved.

## Ticket ID

[DEBT-001]

## Title

[DEBT-001] Wire Advanced Scan Configuration Through the Scanner Pipeline

## Summary

The New Scan modal exposes crawling, authentication, proxy, performance,
exclusion, and HTTP-header controls, but the scanner runtime does not currently
apply most of their values. Define a typed, validated configuration contract and
map it into supported scanner options so users can trust that the selected scan
behavior is enforced. Remove or disable controls that cannot yet be honored.
This closes a misleading configuration gap and improves scan safety and
predictability.

## Problem

The frontend collects and submits grouped advanced configuration objects, and
the FastAPI backend persists those objects. The execution service forwards the
same nested structure, while scanner modules read unrelated flat option names or
hard-coded global defaults. Consequently, the interface indicates that settings
are active even when scanner behavior remains unchanged; some controls are not
submitted, and several helper actions only display success alerts.

## Expected Behavior

When a user configures an Advanced or Custom website scan, every enabled and
supported setting is validated, stored safely, shown accurately during review,
and applied to each compatible scanner. Unsupported settings are clearly
disabled or labeled rather than presented as functional. Secrets never appear
in API responses, logs, command strings, or duplicated scan configuration.

## Investigation Findings

- All six configuration sections render and their primary controls update local
  React state in `frontend/src/components/NewScanModal.tsx`.
- Scan submission includes grouped `crawling`, `auth`, `proxy`, `performance`,
  `exclusions`, and `headers` objects.
- `discoverForms` and `ignoreQueryParams` are displayed but omitted from both
  scan and schedule submission payloads.
- FastAPI accepts loosely typed dictionaries, performs partial validation, and
  stores each configuration group as JSON in `ScanModule` rows.
- `ScanExecutionService` reloads those groups and forwards them unchanged as a
  nested `options` dictionary.
- Scanner modules use `BaseScanner._option()` for flat keys such as `timeout`,
  `crawler_depth`, and `crawler_max_pages`; nested modal keys therefore fall
  back to global defaults.
- The crawler calculates `max_pages` but does not enforce it, and its request
  timeout and rate limit are read directly from global configuration.
- No scanner module consumes the submitted authentication, proxy, exclusion,
  or request-header groups.
- Basic Auth and Cookie Session lack complete credential/session inputs; cookie
  upload, proxy testing, header import/export, and settings detail actions are
  alert-only placeholders.
- Existing tests verify scan creation and a few validation ranges but do not
  prove persistence-to-runtime option propagation or command/request behavior.

## Proposed Implementation

Define a versioned, typed advanced-scan configuration contract shared between
the frontend API types, backend validation models, persisted JSON, and scanner
runtime adapter. Add a backend translation layer that normalizes UI values (for
example depth labels into numeric depth), applies only module-supported options,
and rejects invalid or unsafe combinations. Extend compatible scanners and HTTP
clients to honor timeout, rate, concurrency, redirects, delays, robots policy,
scope, exclusions, proxy, authentication, and custom headers where technically
supported. Handle credentials through an encrypted or external secret reference
rather than plaintext `ScanModule.config`, redact them from logs and responses,
and prevent secret-bearing configuration from being copied during duplication.
Replace placeholder actions with real workflows or explicitly disabled controls.

## Technical Scope

- Frontend modal: `frontend/src/components/NewScanModal.tsx`
- Frontend API contract: `frontend/src/hooks/useScans.ts`
- Scan schema and validation: `backend/schemas/schemas.py`
- Scan persistence/API: `backend/api/routes/scans.py`
- Scheduled-scan persistence/execution: `backend/api/routes/schedules.py` and
  the schedule trigger path
- Runtime mapping: `backend/services/execution.py`
- Persistence model/migration: `backend/database/models.py` and migration files
- Scanner option contract: `scanner/base.py`, `scanner/config.py`
- Scanner consumers: `scanner/scanner_modules/crawler.py` and applicable web
  scanner modules
- Backend and scanner tests: `backend/tests/`, `scanner/tests/`
- Frontend component tests: new tests beside the frontend test suite
- API/user documentation and changelog: `docs/` and
  `docs/changelog/changelog.md`

## Acceptance Criteria

- A documented, typed schema defines every supported advanced configuration
  field, format, default, range, compatibility rule, and standardized error.
- Every visible enabled control is submitted and round-trips through persistence
  without loss; `discoverForms` and ignored query parameters are included.
- Runtime adapter tests prove each supported field reaches the intended scanner
  option or HTTP/tool invocation with the expected normalized value.
- Crawler depth and maximum-page limits are enforced, and robots, subdomain,
  external-link, form, query-parameter, user-agent, and delay settings either
  work or are visibly disabled with an accurate explanation.
- Performance timeout, connection timeout, concurrency, rate limit, inter-request
  delay, retries, retry delay, redirect limit, and Retry-After behavior are
  enforced only by compatible modules and bounded by server-side validation.
- Authentication modes have complete validated inputs and are applied only to
  in-scope requests; unsupported modes cannot be selected.
- Proxy routing and no-proxy rules affect compatible scanner traffic, and proxy
  testing reports a real sanitized result rather than unconditional success.
- Excluded paths, extensions, MIME types, query parameters, and URL patterns are
  enforced before requests are dispatched; invalid regular expressions are
  rejected with a user-readable error.
- Custom headers are validated against forbidden/hop-by-hop header names and are
  attached only to target-scoped requests; import/export either works safely or
  is disabled.
- Authentication and proxy secrets are encrypted or referenced securely, never
  returned by scan APIs, never copied by duplication, and redacted from logs and
  tool commands.
- Review and summary views display actual effective values and module
  compatibility, not static claims such as "applied to all selected modules."
- Automated frontend, API, execution-adapter, scanner, schedule, negative, and
  regression tests pass without external network access.

## Testing Requirements

- Unit tests for frontend payload construction, conditional fields, and bounds.
- API tests for valid and invalid configurations and standardized error payloads.
- Persistence tests proving lossless non-secret round trips and secret redaction.
- Execution adapter tests asserting normalized per-module options.
- Scanner tests with mocked subprocess/HTTP clients for headers, proxy,
  authentication, timeouts, scope, exclusions, rate limiting, and retries.
- Schedule integration tests proving stored configuration is used by triggered
  scans.
- Manual QA of all six sections, review/confirmation, duplication, and one scan
  against an isolated local mock target.
- Security validation for SSRF boundaries, header injection, regex denial of
  service, proxy credential leakage, and authentication secret handling.

## Risks

- Plaintext credentials currently risk persistence and log exposure.
- Incorrect scope or proxy handling could send credentials to an external host.
- Aggressive concurrency/rate values could violate the non-destructive scanning
  policy or overload a target.
- Tool capabilities differ, so claiming universal support would remain
  misleading without a compatibility matrix.
- Changing persisted configuration shape requires backward-compatible handling
  for existing scans and schedules.

## Dependencies

- Approved advanced-configuration API/schema contract.
- Secret storage/encryption design and key-management configuration.
- Per-scanner capability matrix for supported options.
- Backward-compatible database migration or configuration version adapter.

## Labels

backend, frontend, scanner, api, security, testing, technical-debt

## Area

Scanning

## Priority

High

## Estimated Complexity

Epic

## Suggested Assignee

Full Stack Engineer

## Deliverables

- Versioned advanced scan configuration contract and documentation
- Typed frontend models and effective-configuration review UI
- Backend validation, normalization, persistence, and redaction
- Secure credential/proxy secret handling
- Per-scanner configuration adapters and supported runtime behavior
- Automated frontend, backend, schedule, and scanner tests
- Updated changelog and task documentation

## Definition of Done

- Acceptance criteria pass.
- Required tests pass.
- Documentation is updated.
- No regression is detected.
- Code review is completed.
- The feature behaves as expected in an isolated target environment.

## Investigation Artifact

### Failure State

Expected: changing an Advanced Configuration value changes the corresponding
scanner behavior. Actual: configuration is generally persisted but ignored by
the scanner because the runtime option shape does not match scanner lookups.

### Validated Hypothesis

The configuration pipeline loses behavior, not necessarily data. The modal
creates grouped values, `create_scan` stores those groups, and
`ScanExecutionService` reconstructs the same nested structure. `BaseScanner`
only performs a top-level dictionary lookup, while active scanners request flat
keys. This proves why, for example, `performance.timeout` cannot satisfy a
scanner lookup for `timeout`, and `crawling.depth` cannot satisfy
`crawler_depth`.

### Configuration Status Matrix

| Section | UI state | Submitted/persisted | Applied at runtime | Key gaps |
| --- | --- | --- | --- | --- |
| Crawling | Yes | Partial | No meaningful mapping | Two omitted fields; label/key mismatch; page limit not enforced |
| Authentication | Partial | Yes, including secrets | No | Incomplete modes; plaintext-risk; cookie action is placeholder |
| Proxy | Yes | Yes, including secrets | No | No scanner consumer; test action always claims success |
| Performance | Yes | Yes | Mostly no | Nested/flat mismatch; several scanner globals are hard-coded |
| Exclusions | Yes | Yes | No | No pre-dispatch filtering or regex validation |
| HTTP headers | Yes | Yes | No | No request injection; import/export are placeholders |

### Evidence

- `frontend/src/components/NewScanModal.tsx:527` builds scan and schedule
  payloads; displayed crawling fields at lines 1530 and 1551 are absent from
  those payloads.
- `backend/api/routes/scans.py:255` stores the grouped JSON configuration.
- `backend/services/execution.py:70` forwards grouped values to all scanners.
- `scanner/base.py:240` reads only top-level option keys.
- `scanner/scanner_modules/crawler.py:59` requests flat keys and uses global
  request timeout/rate values; `max_pages` is read but not applied.
- `scanner/scanner_modules/headers.py:172` only recognizes flat `timeout` and
  does not consume submitted custom request headers.
- `frontend/src/components/NewScanModal.tsx:1729`, `:1830`, `:2097`, `:2103`,
  and `:2156` implement placeholder alerts rather than real operations.

### Recommended Boundary

Keep the frontend contract descriptive and stable, normalize it once at the
backend-to-scanner boundary, and expose a capability map so each scanner receives
only the settings it supports. Do not make every scanner understand UI-shaped
nested data, and do not flatten fields ad hoc inside the modal.

### Security Requirements

Treat target credentials, bearer tokens, API keys, cookies, and proxy passwords
as secrets. Use short-lived secret references or authenticated encryption at
rest, authorize access per scan owner, redact all observability output, restrict
redirect credential forwarding to the approved origin, and reject user-supplied
headers that can alter routing or connection semantics.

### Investigation Constraints

This investigation did not modify implementation code, create a branch, run a
live scan against the production site, or submit sensitive test credentials.
Conclusions are based on static control/data-flow tracing and existing tests.
