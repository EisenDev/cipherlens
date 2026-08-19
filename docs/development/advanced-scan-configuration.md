# Advanced Scan Configuration API Contract (Version 1)

Advanced configuration is accepted by `POST /api/scans` and
`POST /api/schedules`. All fields are optional; omitted sections use scanner
defaults. Invalid values return `422 Unprocessable Entity` from schema
validation, while unsupported combinations return `400 Bad Request`.

## Example

```json
{
  "targetUrl": "https://example.com",
  "targetType": "WEBSITE",
  "scanType": "CUSTOM",
  "modules": ["crawler", "headers"],
  "crawling": {
    "depth": "Medium (2 levels)",
    "limit": 500,
    "respectRobots": true,
    "subdomains": false,
    "externalLinks": false,
    "discoverForms": true,
    "queryParams": "id,page",
    "ignoreQueryParams": "utm_source,ref",
    "userAgent": "CipherLens Default",
    "delay": 200
  },
  "auth": { "type": "None" },
  "proxy": {
    "useProxy": false,
    "type": "HTTP",
    "url": "",
    "noProxy": ""
  },
  "performance": {
    "timeout": 30,
    "connectionTimeout": 10,
    "maxConcurrent": 10,
    "rpsLimit": 50,
    "delay": 200,
    "maxRetries": 3,
    "retryDelay": 1000,
    "maxRedirects": 10,
    "respectRetryAfter": true
  },
  "exclusions": {
    "paths": "/admin/.*",
    "extensions": "pdf,zip",
    "mimeTypes": "",
    "queryParams": "sessionid",
    "patterns": ".*(logout|delete).*",
    "respectSitemap": true,
    "caseSensitive": false
  },
  "headers": [
    { "name": "X-Requested-With", "value": "XMLHttpRequest" }
  ]
}
```

## Effective Runtime Mapping

| API field | Runtime option | Supported modules |
| --- | --- | --- |
| `crawling.depth` | `crawler_depth` (1, 2, or 5) | crawler |
| `crawling.limit` | `crawler_max_pages` | crawler |
| `crawling.respectRobots` | `respect_robots` | crawler |
| `crawling.subdomains` | `crawl_subdomains` | crawler |
| `crawling.externalLinks` | `crawl_external_links` | crawler |
| `crawling.discoverForms` | `discover_forms` | crawler |
| `crawling.ignoreQueryParams` | `ignore_query_params` | crawler |
| `crawling.userAgent` | `user_agent` | crawler, headers, technology |
| `crawling.delay` | `request_delay_ms` | crawler, HTTP-based modules |
| `performance.timeout` | `timeout` | all tool-backed modules |
| `performance.connectionTimeout` | `connection_timeout` | HTTP-based modules |
| `performance.maxConcurrent` | `max_concurrent` | crawler, httpx modules |
| `performance.rpsLimit` | `rate_limit_rps` | crawler, httpx modules |
| `performance.maxRetries` | `max_retries` | crawler, httpx modules |
| `performance.maxRedirects` | `max_redirects` | crawler, httpx modules |
| `exclusions.extensions` | `excluded_extensions` | crawler |
| `exclusions.patterns`/`paths` | `excluded_url_patterns` | crawler |
| `proxy.url` | `proxy_url` | crawler, httpx modules |
| `headers` | `custom_headers` | crawler, httpx modules |

## Unsupported Version 1 Fields

- Authentication types other than `None`.
- Credentialed proxy URLs and proxy username/password fields.
- MIME-type exclusions, allowed-query-parameter allowlists, Retry-After
  orchestration, and retry-delay scheduling where the underlying tool does not
  expose an equivalent control.

The frontend must mark unsupported fields unavailable. The API does not silently
claim they were applied.

## Errors

- Invalid ranges or formats: `422` with field-specific validation details.
- Unsupported authentication: `400`, message `Authentication configuration is
  not supported until secure secret storage is configured.`
- Proxy credentials: `400`, message `Credentialed proxy configuration is not
  supported.`
- Forbidden header: `400`, identifying the rejected header name without echoing
  its value.
