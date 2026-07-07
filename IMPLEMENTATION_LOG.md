# CipherLens Backend Auth Implementation Log (IMPLEMENTATION_LOG.md)

This log tracks the chronological development steps, design decisions, database setup, and testing verification completed for the **CipherLens Backend Authentication System**.

---

## 1. Work Completed (V1 MVP Backend Auth)

*   **Database Schema & Engine Setup**:
    *   Configured [`schema.prisma`](file:///home/eisen/projects/random-proj/CipherLens/backend/prisma/schema.prisma) to map models to `users` and `refresh_tokens` tables.
    *   Updated local [`docker-compose.yml`](file:///home/eisen/projects/random-proj/CipherLens/infrastructure/docker-compose.yml) ports to run PostgreSQL on host port `5434` and Redis on `6380` to resolve local development port collisions.
    *   Executed Prisma migrations to synchronize database states and generated the TS client.
*   **Security & Hashing Integration**:
    *   Created [`password.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/utils/password.ts) using bcrypt with configurable rounds (defaulting to 12) for plaintext password hashing.
    *   Created [`jwt.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/utils/jwt.ts) to handle generation of Access Tokens (15m) and Refresh Tokens (7d). Integrated unique `jti` parameters via Node's `crypto.randomUUID()` to prevent duplicate token hashes during sequential test calls.
    *   Implemented SHA-256 secure hashing for storing refresh tokens in the database, protecting sessions against potential database leaks.
*   **NestJS Auth Module & Routing**:
    *   Created [`auth.service.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/auth/auth.service.ts) and [`auth.controller.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/auth/auth.controller.ts) implementing signup, login, logout, and token refresh/rotation endpoints under prefix `/api/auth/`.
    *   Implemented [`AuthGuard`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/middleware/auth.middleware.ts) to verify bearer JWT tokens, retrieve the database profile, validate that the account is active, and attach metadata to the request context.
*   **Validation & Error Infrastructure**:
    *   Designed Zod schemas and classes in [`auth.validation.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/auth/auth.validation.ts) to validate request payloads.
    *   Created `ZodValidationPipe` to catch Zod validation errors and format them into consistent JSON payloads.
    *   Created [`GlobalExceptionFilter`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/middleware/error.filter.ts) to catch unhandled errors and format clean, secure responses without leaking stack traces.
*   **Security Headers & Rate Limiting**:
    *   Enabled **Helmet** global headers and configured **express-rate-limit** on all `/api/auth/` routes in [`main.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/src/main.ts).

---

## 2. Testing & Quality Verification

*   **E2E Integration Testing Suite**:
    *   Created [`auth.e2e-spec.ts`](file:///home/eisen/projects/random-proj/CipherLens/backend/test/auth.e2e-spec.ts) covering signup validation, happy paths, duplicate email rejections, login failures, profile queries, token rotation, and logout revocation.
*   **Validation Checks**:
    *   Ran full Jest unit and integration E2E suites:
        ```bash
        $ npm run test
        PASS src/app.controller.spec.ts (Hello World)

        $ npm run test:e2e
        PASS test/app.e2e-spec.ts
        PASS test/auth.e2e-spec.ts
        Test Suites: 2 passed, 2 total
        Tests:       10 passed, 10 total
        ```
    *   Verified clean typescript builds:
        ```bash
        $ npm run build
        vite v8.1.3 building client environment for production...
        ✓ built in 537ms
        ```

---

## 3. Engineering Decisions

*   **Why Classes for DTOs instead of TypeScript Types?**:
    Under NestJS's compilation setup with `emitDecoratorMetadata` and `isolatedModules`, standard interface/type definitions used inside controller decorator signatures throw build errors at runtime. Creating standard class wrappers resolves metadata emission conflicts cleanly.
*   **Decoupled Table Structure (`users`, `refresh_tokens`)**:
    Instead of adding authentication state metadata inside the `users` table directly, we mapped them to independent database tables to keep the architecture ready for multi-tenant organizations, third-party OAuth provider links, and future MFA requirements.
*   **Rethrowing NestJS HttpExceptions in Service Catches**:
    Catch blocks wrapping database checks must rethrow `HttpException` instances so specific exceptions like `ConflictException` and `UnauthorizedException` propagate correct status codes and error payloads to the global exception filters rather than being masked as standard validation or server crashes.

---

## 4. FastAPI Backend Transition & React Query Integration

*   **FastAPI Framework Transition**:
    *   Transitioned the backend system from NestJS to Python FastAPI to establish a robust framework foundation for future security scan engine integrations.
    *   Setup a virtualenv under `backend/venv` containing `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `pydantic-settings`, `pyjwt`, `bcrypt`, `dnspython`, and `email-validator`.
*   **SQLAlchemy Database Models**:
    *   Defined declarative mapping models in [`models.py`](file:///home/eisen/projects/random-proj/CipherLens/backend/database/models.py) for all scan structures: `User` (users), `RefreshToken` (refresh_tokens), `Asset` (assets), `Scan` (scans), `ScanJob` (scan_jobs), `ScanModule` (scan_modules), `ScanResult` (scan_results), and `ScanLog` (scan_logs).
    *   Integrated auto-creation on app startup. Set up Alembic migration tracking.
*   **Token Cryptography**:
    *   Configured JWT token signatures with unique `jti` UUID claims to prevent token hash collisions.
    *   Switched to direct Python `bcrypt` calls to sidestep system-level `passlib` compatibility exceptions on Python 3.14.
*   **Seeding Mechanism**:
    *   Created [`seed.py`](file:///home/eisen/projects/random-proj/CipherLens/backend/services/seed.py) to populate exactly 128 scan records in PostgreSQL on user signup, distributing them realistically (94 completed, 8 running, 5 queued, 21 failed) matching mockup expectations.
*   **TanStack Query Connection**:
    *   Created API helper client [`client.ts`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/api/client.ts) capturing bearer tokens and `401` states.
    *   Wrote React Query hooks inside [`useScans.ts`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/hooks/useScans.ts) managing all list paging, statistic summaries, creations, updates, and deletes.
*   **Test Verification**:
    *   Wrote FastAPI integration test suite [`test_api.py`](file:///home/eisen/projects/random-proj/CipherLens/backend/tests/test_api.py) and ran verification:
        ```bash
        $ PYTHONPATH=. ./venv/bin/pytest tests/
        ======================== 3 passed in 1.56s =========================
        ```

---

## 5. Phase 3.1 — Backend Integration & New Scan Wizard Connection (2026-07-06)

*   **FastAPI Scan Profiles & Registered Scanners APIs**:
    *   Exposed `/api/scans/scanners/registered` to return available scanner modules and their Pydantic/BaseScanner metadata (Name, Description, Category, Tool name, Tool version, target types, format) fetched dynamically from `scanner_registry`.
    *   Exposed `/api/scans/scan-profiles/list` to return mapped modules for website/repository configurations across QUICK, STANDARD, ADVANCED, and CUSTOM scan profiles.
*   **Backend Validation Guards**:
    *   Implemented website target URL regex format validation checking for http:// or https:// and a valid host name.
    *   Implemented GitHub repository target URL regex format validation matching standard `owner/repo` path parameters.
    *   Added form credentials validation for Form Login authentication settings, Bearer Tokens, and API Keys.
    *   Implemented connection timeouts range validation (5s to 300s), concurrency limits (1 to 50), and rate limit RPS ranges (1 to 1000).
    *   Added header format validation guaranteeing valid name-value parameters.
*   **Frontend-to-Backend State Connection**:
    *   Updated `NewScanModal.tsx` to query registered scanners and profiles mapping dynamically.
    *   Enabled interactive customization checkboxes only during "Custom Scan" mode, while locking selections for Quick/Standard/Advanced scan types.
    *   Wrote dynamic validation logic validating target URL formats, selection configurations, and auth fields directly in React wizard steps.
    *   Saved full payload details including `modules` key and custom advanced configuration models upon confirmation, persisting target assets and scans to PostgreSQL.
*   **Verification**:
    *   Rebuilt the React application successfully with zero TypeScript compilation warnings.
    *   Expanded [`test_api.py`](file:///home/eisen/projects/random-proj/CipherLens/backend/tests/test_api.py) with registered scanner queries and validation failure cases. All 5 test suites pass successfully.

---

## 6. Phase 3.2A — Scan Execution Pipeline, Queue System & Worker Infrastructure (2026-07-06)

*   **Database Schema Extension**:
    *   Altered `Scan` model to track `startedAt`, `completedAt`, `jobId`, `currentModule`, and `progress` fields.
    *   Altered `ScanModule` model to track `status` (waiting, queued, running, completed, failed, skipped, cancelled), `duration`, `errors`, and `logs` of individual module executions.
    *   Implemented `run_migrations()` utility running automatically on startup to modify SQLite/PostgreSQL schema attributes in case tables already exist.
*   **Redis Queue System (`ScanQueue`)**:
    *   Created `backend/services/queue.py` utilizing `redis-py` list queues (`rpush` / `blpop`).
    *   Added health connection status checkers with fallback warning log logs when local Redis instance is unavailable, preventing crashes during scan creation.
*   **Graceful Standalone Worker Process (`worker.py`)**:
    *   Created `backend/worker.py` script listening to Redis queue items.
    *   Hooked up signal handling parameters (SIGINT, SIGTERM) to exit clean and graceful.
*   **Scan Execution Orchestrator (`ScanExecutionService`)**:
    *   Created `backend/services/execution.py` loading configurations, mapping choices to metadata fields, progressively updating progress metrics, and saving start/end logs.
    *   Configured module runs to execute independently, ensuring failure of one engine doesn't affect others.
*   **API & Frontend Connections**:
    *   Exposed `/api/scans/{id}/status` and `/api/scans/{id}/modules` fetching database run progress details.
    *   Created React `ProgressPage.tsx` page to display active execution statuses, progress meters, individual module states, and auto-scrolling log streams.
    *   Connected wizard submit flows to navigate users directly to `/scan/{id}/progress`.
*   **Verification**:
    *   Created [`test_worker.py`](file:///home/eisen/projects/random-proj/CipherLens/backend/tests/test_worker.py) testing enqueuing, offline resilience, and state updates. All 9 test suites pass successfully.

---

## 7. Phase 3.2B — Scan Execution, Findings Pipeline & Tool Verification (2026-07-06)

*   **Underlying Tool Executions**:
    *   Connected the worker daemon pipeline to run the actual security binary commands (httpx, nuclei, katana, testssl.sh, dnsx, naabu, subfinder, trufflehog, gitleaks, semgrep).
    *   Isolated execution failures using try-catch blocks and parsing tool exits, durations, error descriptions, and raw standard output to logs.
*   **Normalized Findings Persistence**:
    *   Added `module`, `tool`, `category`, `references`, and `rawData` metadata fields to `ScanResult` table, with startup migrator checks.
    *   Constructed a unified normalization mapping saving scanner findings as structured `ScanResult` rows during background execution loops.
*   **Dynamic API Enhancements**:
    *   Extended `GET /api/scans/{id}/status` to output `currentTool`, `completedModules`, `failedModules`, and `queuedModules` lists.
    *   Updated `GET /api/scans/{id}/modules` returning resolving tool names.
*   **Progress Dashboard Banners**:
    *   Added success and failure banner notifications at the top of the Progress dashboard dynamically once scans finish.
*   **Developer Verification Script**:
    *   Created `scripts/verify_pipeline.py` allowing developers to execute live security audits against safe targets.
*   **Verification**:
    *   Verified end-to-end execution of `scripts/verify_pipeline.py` executing `httpx` commands against example.com, generating normalized info findings, and writing them successfully to database.
    *   Confirmed clean compilation and complete pass across all unit test suites.



