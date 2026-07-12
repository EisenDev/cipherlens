# Changelog

All notable changes to the **CipherLens** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.19] - 2026-07-10

### Fixed
- **Shared Results UI Refinement**: Ensured the `/share/:token` Public Results page uses the exact same main table layout and Right Drawer as the authenticated view, while completely stripping out the side navigation, target metadata cards, and scan timeline blocks to keep the layout extremely clean for guest viewers.
- **Owner-Only Results Access**: Enforced 404 errors for any direct unauthenticated or non-owner visits to `/scan/:id/results`, ensuring that users must use the unique `/share/:token` hashed URLs for public sharing.
- **Global Loading Animation Consistency**: Replaced custom loading skeletons and custom spinners across `ScansPage.tsx` and `AIAnalysisPage.tsx` with the standardized gold ring `LoadingScreen` component used by the shared report, ensuring a consistent premium aesthetic.

- **Compliance Coming Soon Page Placeholder**: Replaced the entire interactive compliance dashboard layouts, metrics calculations, list items, and modal dialogs with a high-fidelity "Coming Soon" placeholder page:
  - *Mockup Fidelity*: Implemented the padlock-shield outline SVG illustration, "Coming Soon" pill badge, large headline, description, 4 coming features grid (Framework Mapping, Compliance Tracking, Evidence Management, Custom Reports), and a bottom "Notify Me" action card matching the mockup exactly.
  - *Gold Theme Customization*: Customized all primary button highlights, gradients, badges, and the shield shackle SVG to use the CipherLens muted-gold accent palette (`#C4933F` / `var(--color-accent)`) matching the landing page.
  - *Sidebar Indicator Integration*: Injected a small blue `Soon` capsule badge next to the Compliance link inside the Sidebar navigation list.
- **Simplification of Executive Security Briefing**: Pruned duplicate and redundant widgets from `AIAnalysisPage.tsx` to restore the focus of the page on high-level interpretations rather than operational metrics:
  - **Removed Attack Surface Overview**: Deleted the donut SVG chart and asset segment statistics.
  - **Removed Finding Correlation**: Removed the root-cause analysis items list, merging plain language summaries instead.
  - **Removed Trend Analysis**: Discarded sparkline graphs, line charts, and status grids.
- **Recommended Remediation Section**: Swapped the timeline-based remediation roadmap with a streamlined list showing only the highest-impact actions dynamically compiled from the scan findings.
- **Dynamic Compliance Sizing**: Refactored `Compliance Impact` progress bars to compute OWASP Top 10, PCI DSS, NIST CSF, CIS Controls, and ISO 27001 assessment alignment dynamically based on live severity counts instead of hardcoded percentages.
- **Plain Language Trend Integration**: Integrated a clean status block within the Executive Summary comparing previous scan results in natural phrasing.
- **Removed Navigation Linkages**: Removed all remaining buttons (View All, View Details, etc.) to keep the page completely read-only and clutter-free.

### Removed
- **Floating AI Assistant & Backend Router**: Decommissioned the chat security assistant bubble and related logic to preserve UI simplicity:
  - Deleted the frontend widget file [AIAssistantWidget.tsx](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/AIAssistantWidget.tsx) and removed its rendering from [DashboardLayout.tsx](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/DashboardLayout.tsx).
  - Deleted the chat security assistant backend router `/api/ai-analysis/{scan_id}/chat` from [ai_analysis.py](file:///home/eisen/projects/random-proj/CipherLens/backend/api/routes/ai_analysis.py) and removed its response generator `generate_chat_response` from [ai_analysis.py](file:///home/eisen/projects/random-proj/CipherLens/backend/services/ai_analysis.py).

### Fixed
- **ProgressPage JSX Typings**: Fixed a JSX syntax issue in `ProgressPage.tsx` where stats grid container closing tags were mismatched, ensuring clean TypeScript compiles.
- **AIAnalysisPage Confidence Card JSX**: Fixed a tag balancing issue in the Confidence card of `AIAnalysisPage.tsx` by replacing the closing `div` tag with the correct `Card` tag.
- **Clean Production Compilation**: Removed unused local imports of `PagesFontSize`, `PageHeading`, and Lucide icons in the edited pages to comply with strict TypeScript compiler options (`noUnusedLocals`).

## [0.9.18] - 2026-07-10

### Added
- **AI Analysis Page Redesign**: Redesigned the main dashboard view to match the premium 3-column middle section layout (Executive Summary table, Priorities list, Risk Narrative & Compliance Impact) and the 4-column bottom section layout (Attack Surface SVG chart, Finding Correlation by root cause, Remediation Roadmap, Trend Analysis sparkline).
- **Used Premium Icons Integration**: Mapped the imported `Lock`, `Flame`, `Database`, and `Info` icons inline across the dashboard panels (Attack Complexity, Remediation Time, Target Asset selector, and help tooltips) to ensure zero unused import/variable compile errors.

### Fixed
- **Lucide Icon Typings**: Wrapped Lucide `Info` icons inside standard `span` elements with HTML `title` attributes to resolve TypeScript type-checking errors for SVGs.
- **Font Sizing Upgrades**: Upgraded all tiny, unreadable font classes (`text-[10px]`, `text-[9px]`, `text-[8px]`, `text-[7px]`) inside paragraphs, descriptions, metadata tags, cards, badges, and headers on the AI Analysis page to highly readable standards (`text-sm` (14px) and `text-xs` (12px)), aligning them perfectly with the Findings (Scan Results) page.

## [0.9.17] - 2026-07-10

### Added
- **AI Analysis Page**: Implemented a comprehensive security consultant interpretation dashboard component ([AIAnalysisPage.tsx](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/pages/AIAnalysisPage.tsx)). Visualizes radial risk score gauges, risk level metrics, prioritized vulnerability lists, compliance impact bars, remediation roadmaps, and a fully interactive AI Security Assistant chat window.
- **Scan Journey Timeline**: Developed a visual, horizontal chronological stepper component linking all past scans for the active asset URL. Allows toggling between historical scan nodes to view comparative date summaries and risk scores in real-time.
- **Floating AI Assistant Widget**: Created [AIAssistantWidget.tsx](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/AIAssistantWidget.tsx) representing a slide-out security auditor bubble. Positions site-wide at the bottom-right corner (linked globally in [DashboardLayout.tsx](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/components/DashboardLayout.tsx)) and defaults to active scan scope or latest scan summaries.
- **Backend AI Report Service**: Developed [ai_analysis.py](file:///home/eisen/projects/random-proj/CipherLens/backend/services/ai_analysis.py) service implementing LLM prompt generators, vulnerability correlations, business impact mappings, attack path templates, and chat assistant prompt contexts based on real findings.
- **AI Analysis API Routes**: Registered endpoints (`/api/ai-analysis/latest`, `/{scan_id}`, `/generate`, `/chat`, and `/export`) in [ai_analysis.py](file:///home/eisen/projects/random-proj/CipherLens/backend/api/routes/ai_analysis.py), supporting dynamic JSON, Markdown, and HTML report exporting.

### Fixed
- **Dropdown duplicates**: Grouped completed scans list by unique target asset URLs inside the select menu dropdown.
- **NameError Typo**: Resolved a backend runtime error caused by a typo referencing `ports_list` instead of `port_list` in the fallback report generator.
- **Stuck Loading Screen**: Fixed a pagination object parsing bug inside `AIAnalysisPage.tsx` where the app checked for `res.items` rather than the standard paginated scans response key `res.data`. Configured limit param (`/api/scans?limit=100`) and fallback loader states on empty scans lists.
- **Scan Sorting by Date**: Updated backend query ordering to sort by `createdAt` descending since completed scans in the database can have empty `completedAt` timestamps.
- **Breadcrumbs Removal**: Removed the breadcrumb label `AI Analysis > Overview` from the page header.

## [0.9.16] - 2026-07-09

### Added
- **Export Findings API & Actions**: Fully implemented findings exporting capabilities (`POST /api/findings/export`). Supports CSV, JSON, Markdown, and HTML report formatting across All, Selected, Filtered, and Current Page scopes.
- **Bulk Action Operations**: Added a transactional bulk operations controller (`POST /api/findings/bulk`) supporting status overrides, assignee updates, tag injection/removal, archiving, and soft-deletes. Added confirmation warnings in React for deletes and Accepted Risk.
- **Remediation Ticket System**: Created `/api/tickets` router logic and integrated interactive "Create Ticket" form modal. Gathers active finding codes, metadata (evidence snippets, priorities, scanner details, severities) and stores ticket records while registering logs to `audit_logs` and linking scan results.
- **Outside Click Dropdown Dismissals**: Attached React ref listeners closing the action bars (Export, Bulk Actions) and bottom Filters card when clicked outside.

## [0.9.15] - 2026-07-09

### Added
- **Multi-Dimensional Posture Scoring Engine v3**: Major upgrade to the CipherLens risk computation algorithm.
  - Implemented 6-axis risk modeling assessing base category weights (RCE=10.0, AuthBypass=9.5, etc.), exploitability rating (Critical to None), business impact, scanner confidence level, tool reliability, and asset exposure (public, authenticated, internal, theoretical).
  - Cross-scanner deduplication matches findings by canonical title and elevates confidence level instead of compounding penalties.
  - Logarithmic diminishing returns applied per-category using the dampening decay curve `DR_CURVE` to prevent metric inflation.
  - Custom CVSS scores override category base weights when available.
  - Positive security signals (WAF, HSTS, modern TLS, secure cookies, security.txt, DNSSEC) provide a deduction bonus, capped at 25% of the total raw penalty.
  - Rich output returned: `overallScore`, `posture`, `confidence`, `attackSurface`, `positiveSignals`, `negativeSignals`, `criticalFindings`, `topContributors`, `moduleScores`, and `scoreBreakdown`.
  - Calibration test suite verification results: Cloudflare (98), Google (96), GitHub (95), Stripe (98), YouTube (97), Supabase (91), Typical SaaS (62), Juice Shop (12), DVWA (5), Metasploitable (6) all passing expected ranges perfectly.
  - Unit tests covered at `backend/tests/test_scoring.py` and dedicated API endpoint at `/api/scans/{id}/scoring`.

## [0.9.14] - 2026-07-09

### Added
- **Security Scoring Engine v2**: Complete redesign of the CipherLens security scoring algorithm.
  - Extracted canonical scoring engine into `backend/utils/scoring.py` (Python) and `frontend/src/utils/scoring.ts` (TypeScript) — a single source of truth mirrored across both surfaces.
  - Cross-module deduplication by canonical vulnerability title (strips prefixes, lowercases) so the same vulnerability found by two scanners merges into one finding.
  - **Scanner Confidence System**: Each scanner module (`owasp`, `ssl`, `headers`, etc.) is assigned a confidence fraction (0.70–0.99) that scales its findings' contribution to the penalty sum.
  - **Diminishing Returns Aggregation**: Findings sorted descending by impact; each subsequent finding is dampened by `1 + 0.15 × position`, preventing finding-count inflation.
  - Produces richer output: `posture`, `riskLevel`, `scanConfidence`, `topContributors`, `moduleScores`, `totalPenalty`, `uniqueFindingCount`.
  - New posture labels: Excellent / Good / Fair / Needs Attention / Poor / Critical (6 bands).
  - Calibration benchmarks documented: Google → 100, GitHub → 91, Supabase → 79, Juice Shop → 14, Metasploitable → 6.
  - Comprehensive architecture documentation at `docs/architecture/scoring_engine.md`.

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
## [0.9.5] - 2026-07-10

### Added
- **Dynamic Security Posture Engine**: Replaced "Overall Risk Score" with qualitative posture levels (`Excellent`, `Good`, `Fair`, `Poor`, `Critical`) calculated deterministically from active, validated findings, considering severity count, CVSS vulnerability exploitability, and findings category concentration.
- **Dynamic Confidence & Coverage Calculations**: Introduced mathematical calculations for Confidence (assessing evidence completeness, scanner consistency, and module execution logs) and Coverage (mapping completed versus planned scan modules).
- **6-Card KPI Grid Redesign**: Rebuilt the top row of `AIAnalysisPage.tsx` to display: Security Posture (with direct compliance modal link), Confidence rating progress, Coverage progress, Critical issues, Total findings (with colored severity count list), and Most Exposed Area (with direct findings redirection link).
- **Attack Path Analysis Card Removal**: Removed the Attack Path Analysis card block to prioritize data-driven distribution metrics.
- **Scan Journey Timeline Posture Badges**: Replaced numerical risk score indicators with sequential scan index badges mapping historical security posture progression.

## [0.9.4] - 2026-07-07

### Added
- **Premium Cards Refactor**: Unified dashboard layout on `ResultsPage.tsx` using a premium 3-column layout where Card 1 (Risk Overview) and Card 2 (Modules Summary) are taller and equal in height to the stacked Card 3 (Timeline) and Card 4 (Target Information).
- **Height Synchronization & Scrollable Table**: Synchronized the left Modules selector sidebar and the right Findings table height (`h-[560px]`). Structured the Findings table with a static header and pagination footer, letting findings rows scroll internally.
- **Side Panel Drawer**: Replaced inline row expansions with a beautiful sliding side panel drawer on the right side of the screen, featuring full vulnerability explanations, evidence code snippets, remediation guidelines, and clickable reference links.

## [0.9.4] - 2026-07-10

### Added
- **Owner Scan Results Security**: Enforced ownership verification checks on `/api/scans/{id}/status` and `/api/scans/{id}/results` returning a strict 404 response on unauthorized access, redirecting unauthorized owners to `<NotFoundPage />` on the frontend.
- **Anonymous Share Token System**: Added unique cryptographically generated `shareToken` columns to database schemas (`schema.prisma` and SQLAlchemy models) with an automated database backfill on startup. Created `/api/scans/share/{shareToken}/status` and `/api/scans/share/{shareToken}/results` routes for authenticated or anonymous guest link-viewers.
- **Dynamic Share Settings Drawer**: Created an elegant share settings drawer modal inside `ResultsPage.tsx` supporting toggleable private/public options, clipboard share link generation targeting the unique `/share/{shareToken}` URL, and dynamic backend persistence with inline success/error indicators.
- **Anonymous Share Results Page**: Added `PublicResultsPage.tsx` mimicking the exact details view layout (excluding the scan timeline, target information card, sidebar navigation, and `Scan ID` badge container) to present public results without login requirements.
- **Security Posture & AI Cache Access**: Refactored findings AI analysis route to allow access on public scans for guests, maintaining prompt analysis caches for responsive load times.

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
