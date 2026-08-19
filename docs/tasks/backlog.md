# Project Backlog (backlog.md)

This list contains features and technical tasks scheduled for future sprints.

## Tech Debt & Infrastructure
- [ ] Configure GitHub Actions workflows for backend linting and testing.
- [ ] Setup Docker Compose configurations for local dev, integration tests, and production simulation.
- [ ] Implement database migration pipelines in CI/CD.

## Backend (NestJS API)
- [x] Initialize JWT/OAuth Authentication module.
- [x] Set up CRUD API endpoints for target configuration (websites, repos).
- [ ] Implement BullMQ event listeners to track real-time job execution state.
- [ ] Create AI Report Service wrapping LangChain/SDK for prompt generation.

## Frontend (React UI)
- [x] Build login and organization onboarding screens.
- [x] Create main dashboard containing cards with security scores, scan queues, and recent alerts.
- [ ] Design scan result detail page featuring interactive vulnerability list.
- [ ] Implement Framer Motion transitions between views.
- [x] [ENHANCEMENT-001] Remove SSL/TLS Summary Cards from Technical Findings Right Drawer (ClickUp: #86d3mpxxp)
- [x] [ENHANCEMENT-002] Design and Implement Security Scoring Engine (0-100 exponential decay)

## Scanner Engine (Python)
- [ ] Write TLS certificate expiration and cipher suite validation parser.
- [ ] Incorporate open-source secrets analyzer into repository scan suite.
- [ ] Define standardized Pydantic models for scanner output to validate schema integrity.
- [ ] [FEATURE-001] Implement passive API discovery with allowlisted OpenAPI/GraphQL
  evidence checks.
- [ ] [FEATURE-002] Implement favicon retrieval, hashing, and evidence inventory.
- [ ] [FEATURE-003] Implement bounded exposed-file checks with content validation to avoid
  soft-404 false positives.
- [ ] [FEATURE-004] Implement consolidated passive fingerprinting or remove the duplicate
  fingerprint module in favor of technology scanning.
- [ ] [FEATURE-005] Implement safe HTTP method analysis using `OPTIONS`/`Allow` evidence
  without sending destructive verbs.
- [ ] [FEATURE-006] Implement information-disclosure checks with redacted evidence.
- [ ] [FEATURE-007] Implement redirect-chain, robots.txt, security.txt, and sitemap parsers.
- [ ] [FEATURE-008] Implement passive WAF fingerprinting with vendor-specific evidence.
- [ ] [SECURITY-001] Add website ownership verification before enabling higher-impact or
  authenticated scan profiles.
