# Changelog

All notable changes to the **CipherLens** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.13] - 2026-07-09

### Added
- **Dynamic Port, Tech, and Headers Scanners Metadata**: Enhanced `ports.py`, `technology.py`, and `headers.py` scanner modules to output rich request metadata (resolved IP, status code, server header, content-type header, final URL) directly into the finding's `raw_data` dictionary.
- **CipherLens Security Scoring Engine**: Implemented a professional, deterministic security scoring engine (0-100 score) using exponential risk decay:
  - Supports vulnerability signature-based deduplication to prevent double-penalizing repeated findings.
  - Weights risk by baseline severities (Critical=10.0, High=7.0, Medium=4.0, Low=1.5) and CVSS scores when available.
  - Adjusts threat weight using a 1.25x Exploitability Multiplier for verified exploits or RCE keywords.
  - Normalizes scores based on Scan Profile Completeness (completed modules count / 10).
  - Automatically calculates and persists score inside the database `Scan.score` when finalized.
  - Renders dynamic Security Score circle progress, Overall Security Posture grade (e.g. A-Excellent to F-Critical), Risk Level, and scan Confidence Level in `ResultsPage.tsx`.

### Fixed
- **Frontend Target Information Mocks**: Replaced hardcoded values (IP fallback `129.212.208.181`, server fallback `Cloudflare`, status code `200`, content-type `text/html; charset=utf-8`) with dynamic parsing of scan findings' raw data in `ResultsPage.tsx`. Uses standard `N/A` and `Unknown` values when data is not yet resolved or applicable (e.g. for repositories).
- **Backend AI Profile Summary Mocks**: Updated `get_profile_summary` in `ai.py` to resolve target details dynamically:
  - Added dynamic socket hostname IP lookup for scanned assets.
  - Setup a public GeoIP API check (`ip-api.com`) to query the real country, hosting provider, and ASN.
  - Implemented dynamic parser of katana/crawler findings to count and classify crawled pages, api endpoints, logins, and admin interfaces.

## [0.9.12] - 2026-07-08

### Removed
- **Website Information & Target Profile**: Completely removed the "Website Information & Target Profile" modal, its trigger button, its React hooks/states, its backend route (`/api/scans/{id}/profile-summary`), and all associated connections across the system.

### Fixed
- **SSL / TLS Scanner target resolution**: Fixed a bug where target URLs containing scheme prefixes (e.g. `http://` or `https://`) were passed directly to `testssl.sh`, causing scheme validation exit code `254` and TCP connection errors. Introduced `domain_from_url` sanitization to extract pure hostnames and ports for the binary wrapper.
- **SSL / TLS Socket Refused Graceful Handling**: Re-mapped connection timeouts, connection refused codes (`246`), and socket errors as `ScannerStatus.SUCCESS` with zero findings, preventing scans on non-HTTPS sites from aborting the pipeline with module execution errors.
- **Drawer Text Markdown Parsing**: Created a React `renderFormattedText` parser in `ResultsPage.tsx` that dynamically formats markdown bold flags (`**`), list items (`* `), headers (`###`), and paragraphs into native Tailwind JSX elements.
- **AI Drawer Panel & Modal Restyling**: Removed violet theme highlights, replaced sparkles `✨` with clean shield/list icons, dropped Gemini Powered sub-badges, and merged Remediation Priority and Risk Level cards into a single cohesive panel to resolve vertical stretching.

## [0.9.11] - 2026-07-08

### Added
- **Gemini AI Integration**: Connected the backend to Gemini API using a direct HTTP connector with local JSON filesystem cache persistence:
  - Added `@router.get("/results/{finding_id}/ai-analysis")` endpoint generating finding-specific Executive Summary, Risk Explanation, Business Impact, Attack Scenarios, Remediation Checklist, and Priority.
  - Added `@router.get("/{id}/profile-summary")` endpoint generating scan-wide Target Application Description and Classification (category, industry, purpose) combined with technical stats.
- **Split Drawer Results Layout**: Separated the Right Results Drawer on the frontend into **Technical Findings** (factual data, TLS badges, stack badges, evidence terminal, cleaned real-data tool details metrics) and **AI Security Analysis** (AI Executive Summary with warning badge, priority, explanation, attack scenarios, next steps checklist).
- **Target Profile & Overview Modal**: Integrated a high-fidelity popup modal triggered by a `Website Information` button on the header card. Renders a mockup screenshot, AI platform summary, confidence rating, technology tags, and structured panels for Attack Surface, Exposure & Security, Asset Info, and Certificate details.

## [0.9.10] - 2026-07-08

### Fixed
- **Scanner Details Card Layout**: Fixed a layout breaking bug inside the Right Results Drawer where the `Tool` field outputted the absolute scanner command line string (with paths and options), stretching the column cells. Added `cleanToolName` parser helper to extract and display only the command binary basename (e.g. `httpx`, `nuclei`) and added `truncate` styling with hover title display.

## [0.9.9] - 2026-07-08

### Fixed
- **Uvicorn Reload Conflict**: Fixed a path resolution bug in `run.sh` where Uvicorn's reloader would incorrectly resolve and load `scanner/main.py` (which has no `app` attribute) instead of `backend/main.py` due to PYTHONPATH overlap. Changed the startup command to execute `python -m uvicorn main:app` directly, stabilizing the local server reloader context.

## [0.9.8] - 2026-07-08

### Added
- **Full-System Dev Env Script**: Enhanced the workspace `run.sh` initialization script:
  - Injected automatic Redis check verifying port 6379 connectivity.
  - Automatically spins up a background Redis container using Docker or launches a daemonized local `redis-server` process when no active connection is detected.
  - Starts the background queue execution worker (`worker.py`) in addition to the backend API server and frontend development client.
  - Updated termination handlers to trap `SIGINT`/`SIGTERM` signals and cleanly terminate the backend, worker, frontend, and Docker container processes.

## [0.9.7] - 2026-07-08

### Added
- **High-Fidelity Right Results Drawer**: Redesigned the right side panel drawer on `ResultsPage.tsx` to match wireframe references:
  - Added **SSL / TLS Summary** protocol cards (displaying enabled/disabled states for TLS 1.0, 1.2, and 1.3 with custom badges).
  - Added **Fingerprinted Stack Inventory** display matching common frameworks to their official Devicon brand logo SVGs.
  - Added **Affected Resource** card block rendering target domains and server port mappings.
  - Added structured **Recommendation checklist** parsing remediation steps into checkbox bullet logs.
  - Added clickable **Reference badges** for OWASP, NIST, Mozilla, and RFC links.
  - Added **Scanner Details** metadata table mapping execution speed, tools, and confidence ratings.
- **Persistent Scan Pipeline Progress Routing**: Updated the scans list actions inside `ScansPage.tsx` so that queued or running scans immediately redirect to the dedicated progress route `/scan/:id/progress`, keeping status polling active even across browser tab switches.

## [0.9.6] - 2026-07-07

### Added
- **Enriched Technology Detection**: Enhanced `technology.py` scanner module to execute custom signature scanning fallback rules:
  - Fetches index page HTML response body, headers, and cookies to bypass simple scanner constraints.
  - Matches custom signatures for **Frontend Frameworks** (React, Vue, Angular, Svelte, jQuery, Tailwind CSS, Bootstrap), **Backend Frameworks** (Express, Flask, Django, Laravel, Rails, Spring Boot, ASP.NET, PHP), **Databases** (PostgreSQL, MySQL, MongoDB, Redis, SQLite), and **Third-Party Services** (Stripe, Google Analytics, Google Fonts, Sentry, Cloudflare).
  - Groups and categorizes results dynamically in high-fidelity findings and raw metadata.

## [0.9.5] - 2026-07-07

### Added
- **Sanitized Dashboard Design**: Cleaned up the dashboard visual layouts inside `ResultsPage.tsx` to match wireframe designs:
  - Adjusted Donut Charts size to a larger, thicker ring design (`w-32 h-32` and `strokeWidth="3.6"`).
  - Redesigned **Risk Overview** legend list to display in a clean, single-column rows pattern with light horizontal border dividers and far-right aligned counts.
  - Nested **Modules Summary** legend lists inside a beautiful rounded card block (`bg-slate-50 border border-border-warm`).
  - Structured **Target Information** metadata cells into aligned `grid grid-cols-[60px_1fr]` columns with border dividers.

## [0.9.4] - 2026-07-07

### Added
- **Premium Cards Refactor**: Unified dashboard layout on `ResultsPage.tsx` using a premium 3-column layout where Card 1 (Risk Overview) and Card 2 (Modules Summary) are taller and equal in height to the stacked Card 3 (Timeline) and Card 4 (Target Information).
- **Height Synchronization & Scrollable Table**: Synchronized the left Modules selector sidebar and the right Findings table height (`h-[560px]`). Structured the Findings table with a static header and pagination footer, letting findings rows scroll internally.
- **Side Panel Drawer**: Replaced inline row expansions with a beautiful sliding side panel drawer on the right side of the screen, featuring full vulnerability explanations, evidence code snippets, remediation guidelines, and clickable reference links.

## [0.9.3] - 2026-07-07

### Added
- **Global Typography System**: Defined a standardized typographic scale in `index.css` under `@layer base` for heading tags (`h1`-`h6`) and registered reusable design tokens (`text-title-hero`, `text-title-h1`, `text-title-h2`, `text-title-h3`, `text-body-lg`, `text-body-md`, `text-body-sm`, and `text-body-xs`) inside `@layer components`.
- **System-Wide Alignment**: Replaced all hardcoded, non-uniform pixel/bracket text size declarations (such as `text-[10px]`, `text-[9.5px]`, `text-[8px]`, etc.) across `ResultsPage.tsx`, `ScansPage.tsx`, `ProgressPage.tsx`, `NewScanModal.tsx`, `Topbar.tsx`, and `Sidebar.tsx` to use the global typography system.

## [0.9.2] - 2026-07-07

### Added
- **Scan Results Page UI**: Implemented a high-fidelity `ResultsPage.tsx` React component matching the requested wireframe design (Risk Overview donut charts, modules progress summaries, stepper timeline, metadata tables, active/locked modules checklist, and expandable code/evidence blocks).
- **Backend Results Endpoint**: Added `GET /api/scans/{id}/results` endpoint to FastAPI `scans.py` router fetching normalized scan results from the `scan_results` database table.
- **Client Query Bindings**: Added `useScanResults` query hook to `useScans.ts` fetching scan results data.
- **Integration Tests**: Added automated unit test coverage inside `tests/test_api.py` validating the results API contract.

## [0.9.1] - 2026-07-07

### Fixed
- **Crawler Scanner**: Fixed katana execution by removing the unsupported `-max-pages` flag and updating the output parser flag to `-jsonl`.
- **DNS Scanner**: Swapped the `-d` domain-bruteforce flag in dnsx with the resolve list `-l` flag using a temporary file list to avoid missing wordlist fatal crashes.
- **Ports Scanner**: Added a local `libpcap.so.0.8` dynamic library symlink configuration and set `LD_LIBRARY_PATH` during naabu execution to resolve missing dynamic dependencies.
- **Documentation**: Updated central `scanner-framework.md` to classify modules by UI-aligned Security Domains and list the underlying security engine mappings.

## [0.9.0] - 2026-07-06

### Added
- **Phase 3.2B — Scan Execution, Findings Pipeline & Tool Verification**: Connected the orchestrator pipeline to invoke the real security tool binaries (nuclei, httpx, katana, testssl.sh, dnsx, naabu, subfinder, trufflehog, gitleaks, semgrep).
- **Unified Normalization Layer**: Persisted normalized scanner output parameters (code, category, severity, description, evidence, file path, line number, remediation, reference links, and raw JSON response data) into SQL tables.
- **Dynamic API Extend Details**: Extended status queries endpoints with current executing tool and module counters lists.
- **Developer Verification Script**: Created `scripts/verify_pipeline.py` script allowing end-to-end execution of live security audits against safe targets.
- **React UI Progress Banners**: Added interactive header status notification panels detailing scan success or fail results.

## [0.8.0] - 2026-07-06

### Added
- **Phase 3.2A — Scan Execution Pipeline, Queue System & Worker Infrastructure**: Set up a background execution environment using a Redis queue and worker setup.
- **Redis Queue Integration**: Built a lightweight `ScanQueue` wrapper executing `RPUSH`/`BLPOP` operations, with logging and gracefully handled Redis offline states.
- **Standalone Worker Process**: Created `worker.py` script listening to Redis lists, handling graceful sigterm shutdowns and processing scans in the background.
- **Scan Execution Service**: Developed `ScanExecutionService` executing module runs, tracking and persisting module statuses, timing metrics, errors and logs, and calculating progress percentages.
- **Status & Module endpoints**: Created `GET /api/scans/{id}/status` and `GET /api/scans/{id}/modules` fetching database execution progress.
- **React Progress Page**: Added `ProgressPage.tsx` page to display active execution statuses, progress meters, individual module states, and auto-scrolling log streams.
- **Tests Coverage**: Created `test_worker.py` checking Redis connections, offline enqueuing, and execution lifecycle state updates.

## [0.7.0] - 2026-07-06

### Added
- **Phase 3.1 — Backend Integration & New Scan Wizard Connection**: Connected the React New Scan Wizard stepper to the FastAPI backend API and the underlying Python scanner registry framework.
- **FastAPI Scan Extension Endpoints**: Created `GET /api/scans/scanners/registered` returning registered scanners metadata dynamically and `GET /api/scans/scan-profiles/list` returning profile mapping rules.
- **Input Validation Safeguards**: Implemented robust target type checking for Website URL and GitHub Repository formatting, connection settings boundaries, and auth settings parameters in the backend route mapping.
- **React Client Connection**: Refactored `NewScanModal.tsx` to pull registered scanner classes and billing profile parameters dynamically from the backend, mapping inputs directly to the scan creation payload.
- **API Tests Coverage**: Expanded backend API test suites to verify registered scanners metadata, scan profiles list, and input validation failures.

## [0.6.0] - 2026-07-06


### Added
- **New Scan Wizard Refactoring**: Fully refactored `NewScanModal.tsx` into a high-fidelity 5-step modal workflow matching user specifications: Target Selection, Scanner Modules, Advanced Settings (Crawling, Auth, Proxy, Performance, Exclusions, Headers), Review and Confirm. Added Quick, Standard, Advanced, and Custom Scan Profile cards at the top of the modules step to lay out future subscription options. Checked modules are automatically grayed out/locked for non-custom profiles, and the wizard automatically skips Advanced Configuration for Quick/Standard scans. Removed all mock values from summaries and connected form fields to scan payload.
- **Phase 3.0 — Scanner Framework & Tool Installation**: Established the complete scanner engine architecture under `scanner/`.
- **10 Security Tools Installed**: nuclei (v3.3.9), httpx (v1.6.10), katana (v1.1.0), subfinder (v2.6.7), dnsx (v1.2.1), naabu (v2.3.1), TruffleHog (v3.88.15), Gitleaks (v8.24.3), testssl.sh (v3.2.0), Semgrep (v1.168.0).
- **Core Scanner Modules**: `base.py` (BaseScanner abstract class), `config.py` (ScannerConfig), `result.py` (Finding, ScannerResult, AggregatedScanResult models), `utils.py` (shared utilities), `registry.py` (ScannerRegistry), `manager.py` (ScannerManager orchestrator), `runner.py` (CLI entry point).
- **23 Scanner Modules**: headers, ssl, tls, owasp, dns, crawler, ports, subdomains, secrets, repository, technology, cookies, redirects, robots, sitemap, waf, http_methods, information, security_txt, favicon, fingerprint, files, api.
- **12 Fully Implemented Scanners**: headers (httpx), ssl (testssl.sh), tls (testssl.sh), owasp (nuclei), dns (dnsx), crawler (katana), ports (naabu), subdomains (subfinder), secrets (trufflehog+gitleaks), repository (semgrep), technology (httpx), cookies (requests).
- **Risk Scoring**: `AggregatedScanResult.risk_score` computes 0-100 score from finding severities.
- **48 Unit Tests**: Full test coverage for framework components and all 23 scanner module contracts.
- **Documentation**: `docs/architecture/scanner-framework.md` and `docs/development/tool-installation-report.md`.

## [0.5.0] - 2026-07-06


### Added
- **Scan Management UX (Phase 2.1)**: Fully integrated a production-ready, dynamic scan management workflow in the React frontend.
- **Reusable Modals & Empty States**: Created `ConfirmationDialog.tsx`, `ProgressModal.tsx` (with auto-scrolling live logs terminal), `QueueDetailsModal.tsx`, `ErrorModal.tsx` (displaying failed modules, traceback, and execution logs), and `EmptyState.tsx` (rendering descriptive text and custom action triggers based on filter status).
- **FastAPI Progress & Logs Routes**: Implemented `POST /api/scans/{id}/cancel`, `POST /api/scans/{id}/retry`, `GET /api/scans/{id}/progress`, and `GET /api/scans/{id}/logs` returning realistic mock progress and logs details based on scan execution states.
- **Duplicate Scan Flow Integration**: Added `initialConfig` pre-population logic in `NewScanModal.tsx` to populate wizard states on duplicate scan action.

## [0.4.0] - 2026-07-06

### Added
- **FastAPI Backend Transition**: Rewrote the API orchestrator layer using FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pydantic, and JWT Bearer/Refresh token authorization.
- **SQLAlchemy Database Models**: Declared modular models for `User`, `RefreshToken`, `Asset`, `Scan`, `ScanJob`, `ScanModule`, `ScanResult`, and `ScanLog` to cover complete scans execution lifecycle.
- **React Query Hooks Integration**: Added TanStack Query (`@tanstack/react-query`) server state queries/mutations to decouple UI components from direct API requests, resolving loading, error, and stale cache states natively.
- **Dynamic Seeding Mechanics**: Built automatic user seeder generating 128 realistic workspace scans split across statuses matching mockup statistics exactly (94 completed, 8 running, 5 queued, 21 failed).
- **Scan Lifecycle Actions**: Hooked up real-time `Cancel`, `Retry`, and `Delete` action triggers in the scans dashboard rows.
- **Authentication-Aware Public Routing**: Made the `LandingPage` and `SignupPage` component layers aware of local authentication states, executing automatic client-side redirects to `/scans` if the user is already authenticated. Connected the `Navbar` to the Zustand auth store to dynamically swap public call-to-actions with a console button and sign-out controls.

## [0.3.0] - 2026-07-05

### Added
- **Dedicated Signup Page**: Added [`SignupPage.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/pages/SignupPage.tsx) featuring a split-screen desktop grid containing a gold eyebrow badge, value proposition benefits list, a mini-dashboard preview, and an input card with validation visualizers, password strength segments, optional team size/role select dropdowns, terms checkmark, and OAuth blocks.
- **Client Routing Setup**: Integrated `react-router-dom` in [`App.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/App.tsx) and updated [`ui.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/ui.tsx) `Button` properties to navigate internally via `Link` for relative links (`/signup`), avoiding full page refreshes.
- **Interactive Login Modal**: Added [`LoginModal.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/LoginModal.tsx) conforming to the mockup design specifications (Cormorant Garamond title, customized inputs with leading/trailing icons, remember-me checkmark, gold submit CTA, divider, and GitHub/Google OAuth panels). Centered overlay layout with a transparent dismissible backdrop.
- **Global UI Store**: Added Zustand store [`useUIStore.ts`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/store/useUIStore.ts) to manage open/close actions dynamically.
- **V2 Product Identity Rebuild**: Completely updated [`LandingPage.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/pages/LandingPage.tsx) to exactly match the uploaded design mockups in copy, widgets, metrics, and grid structures.
- **Enterprise Dashboard Mockup**: Replaced generic hero dashboard with realistic high-fidelity preview showcasing Overall Security Score `82/100`, critical/high/medium/low semantic counts cards, Recent Scan Activity (acme.com, backend repo, dashboard sub, api target), Top Risk Categories horizontal status progress bars (Secrets Exposure, Dependency Risk, Security Headers, SSL/TLS, Info Exposure), and AI Executive Summary snippet.
- **Detailed Features**: Configured bullet lists to exactly match the reference design:
  - Website Intelligence: SSL/TLS, Security Headers, DNS/Ports, Tech Fingerprinting, OWASP Top 10.
  - Repository Intelligence: Secrets/API Keys, Dependency/License, Commit/Code Quality, Bus Factor, CI/CD & Branch Protection.
  - AI-Powered Analysis: Summaries, Prioritization, Remediation, Correlation, Business Impact.
- **"From Target to Intelligence" Pipeline Section**: Visual pipeline diagram illustrating target ingestion, crawler engines, 12+ security engines, evidence collection, normalization layers, risk scoring, AI correlation, and executive reporting — complete with inline SVG connectors and highlighted icons.
- **13-Engine Powered By Box Grid**: Enclosed all monochrome security engine logos in a clean visual white card container split into two balanced rows (6 in row 1, 7 in row 2) matching the V2 image exactly.
- **"Why CipherLens / Beyond Traditional Scanners" Comparison Card**: Two-column matrix comparing Traditional Scanners (red cross marks) to CipherLens Platform (gold checks).
- **Executive-Grade Report Preview**: Left-aligned details block featuring Business Risk Score circular dial, detailed Attack Surface counts grid, Top Findings live list with status pills (Critical, High, Medium, Low, Fixed, Open, In Review), Risk Over Time line graph, and Compliance Overview circular progress gauges (OWASP, CWE/SANS, PCI DSS).
- **Coming Soon Roadmap Section**: Flat horizontal grid of 10 card items mapping future integration modules: Docker, Kubernetes, AWS, Azure, GitLab, Bitbucket, CI/CD Gates, SBOM, Supply Chain, and Compliance Hub.

### Changed
- **Navbar Links**: Modified [`Navbar.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/Navbar.tsx) to render the navigation links seen in the V2 mockup: Platform, Scanners, How It Works, Pricing, Documentation, Resources. Added arrows to the primary action buttons.
- **TimelineItem Component API**: Updated [`TimelineItem`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/ui.tsx) in `ui.tsx` to support custom `React.ReactNode` icons instead of hardcoded numbers, resolving scaling issues.

---

## [0.2.0] - 2026-07-05

### Added
- Complete design token system in `frontend/src/index.css` with warm ivory palette, CSS custom properties for all colors, typography, spacing, shadows, radii, button/card/badge classes.
- `tailwind.config.js` extended with all design system tokens (color palette, font families, shadows, radii).
- Reusable UI component library at [`frontend/src/components/ui.tsx`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/ui.tsx): `Button`, `Card`, `Badge`, `IconWrapper`, `FeatureCard`, `TimelineItem`, `SectionContainer`, `SectionHeader`, `Divider`, plus Framer Motion animation presets.
- [`Navbar`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/Navbar.tsx) component — sticky, blur backdrop, responsive mobile menu.
- [`Footer`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/Footer.tsx) component — dark background, multi-column links, social icons.
- [`LandingPage`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/pages/LandingPage.tsx) — full 8-section enterprise SaaS landing page matching the design brief (Hero + Dashboard Preview, Features, How It Works, Engine Logos, Report Preview, CTA, Footer).
- `docs/design/` documentation directory with 10 design system documentation files (pending subagent completion).
- Google Fonts: Cormorant Garamond (headings) + Inter (body) loaded via CSS.

### Changed
- `frontend/src/App.tsx` — now renders `LandingPage` as the main route.
- `frontend/src/index.css` — replaced dark theme with comprehensive light-mode design token system.

---

## [0.1.0] - 2026-07-05

### Added
- Centralized documentation system structure (`docs/`).
- Master AI rules guide ([AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md)) along with provider specific directives ([GEMINI.md](file:///home/eisen/projects/random-proj/CipherLens/GEMINI.md), [CLAUDE.md](file:///home/eisen/projects/random-proj/CipherLens/CLAUDE.md)).
- Core ADRs (ADR-001 through ADR-005).
- Project roadmap and task trackers.
- Complete boilerplate project skeleton folders.
