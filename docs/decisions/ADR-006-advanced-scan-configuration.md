# ADR-006: Versioned Advanced Scan Configuration Boundary

## Status

Approved for DEBT-001 implementation.

## Context

The New Scan modal sends grouped configuration, while scanner modules currently
read unrelated flat option keys. Persisted settings therefore do not reliably
change runtime behavior. Authentication and proxy credential fields also create
a risk of storing secrets in plaintext scan-module JSON.

## Options Evaluated

### Option A: Teach every scanner the frontend payload shape

- Pros: minimal orchestration code.
- Cons: couples scanner modules to UI naming, duplicates validation and
  normalization, and makes capability differences difficult to communicate.

### Option B: Normalize once at the backend/scanner boundary

- Pros: one validated contract, explicit capability mapping, backward-compatible
  adapters, and scanner modules receive only executable options.
- Cons: adds a translation layer that must be covered by contract tests.

## Decision

Select Option B. API input remains a grouped, versioned configuration document.
The execution service converts it into canonical flat scanner options before
invoking a module. Scanner modules remain independent of frontend field names.

Version 1 supports non-secret website options that the bundled ProjectDiscovery
tools can enforce:

- Crawling: depth, maximum pages, robots/sitemap discovery, subdomain/external
  scope, form extraction, ignored query parameters, user agent, and delay.
- Performance: request timeout, concurrency, rate limit, delay, retries,
  redirect behavior, and maximum redirects.
- Exclusions: URL regexes and file extensions supported by Katana.
- Proxy: unauthenticated HTTP, HTTPS, or SOCKS5 URL routing. Inline proxy
  usernames/passwords are rejected.
- Headers: validated request headers, excluding sensitive and routing headers.

Authentication modes remain disabled in version 1. They require an encrypted
secret-reference service and origin-bound credential forwarding. The API rejects
authentication configurations other than `None`, preventing new plaintext
credentials from being persisted.

## Security Constraints

- Reject `Authorization`, `Cookie`, `Proxy-Authorization`, `Host`,
  `Content-Length`, `Connection`, `Transfer-Encoding`, `Upgrade`, and forwarding
  headers supplied through custom headers.
- Reject CR/LF characters in header names or values.
- Never log custom header values or proxy URLs containing user information.
- Keep scoped crawling enabled by default. External crawling requires explicit
  opt-in and never carries custom headers outside the original host.
- Enforce server-side bounds regardless of frontend input.

## Consequences

- Existing grouped records remain readable through the normalizer.
- Unsupported settings are not silently accepted.
- UI capability labels must match the version 1 matrix.
- Credentialed scanning requires a future ADR and secret-store migration.
