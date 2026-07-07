# System Overview & Architecture Design

This document details the system design, core modules, data flows, and clean boundaries of the **CipherLens** platform.

---

## 1. Clean Architecture Boundaries

CipherLens operates as a decoupled, multi-tier system. It separates API routing, task queue orchestration, scanner executions, and AI analytics.

```
       ┌─────────────────────────┐
       │     React Frontend      │
       └────────────┬────────────┘
                    │ HTTPS / WebSockets
                    ▼
        ┌─────────────────────────┐
        │     FastAPI API Host    │
        └──────┬─────────────┬────┘
               │             │ SQLAlchemy ORM
               │ Task Queue  ▼
               │ Enqueue ┌───────────────┐
               │ Jobs    │  PostgreSQL   │
               ▼         └───────────────┘
        ┌──────────────┐
        │  Redis Cache │
        └──────┬───────┘
               │ Poll Job
               ▼
        ┌─────────────────────────┐
        │ Python Scanning Engine  │
        └─────────────────────────┘
```

---

## 2. Component Directory Overview

### Frontend Module (`frontend/`)
* Built using React 18, Vite, TypeScript, and Tailwind CSS.
* State management uses Zustand for client-side state and TanStack Query for cache invalidation and server integration.
* All visual component bases leverage shadcn/ui primitives.

### Backend Module (`backend/`)
* Orchestrates authorization, assets/targets management, scan configurations, database connections, and LLM integrations.
* Interacts with PostgreSQL using SQLAlchemy ORM.
* Strictly delegates scan executions to asynchronous Python scanner workers.

### Scanner Engine (`scanner/`)
* Decoupled Python service executing non-intrusive checking scripts.
* Utilizes Pydantic schemas to validate output format.
* Returns standard JSON objects outlining vulnerabilities, evidence, and affected assets.

---

## 3. Scanning Engine Pipeline

To maintain defensive alignment and absolute evidence preservation, the scanner executes a highly-orchestrated multi-stage security pipeline:

```
      [ Target Ingestion ]
    ( Website URL & Git Repo )
               │
               ▼
     🕷️  [ Crawler Engine ] (Katana / Subdomain discovery)
               │
               ▼
   🔍  [ Security Engine Layer ] (12+ coordinated scan tools)
   ├── Nuclei (CVE / misconfigurations)
   ├── Semgrep (SAST / code patterns)
   ├── Gitleaks (Secret & token auditing)
   ├── Trivy (SCA / dependency trees)
   ├── HTTPX / SSLyze (Protocol / TLS security)
   └── OWASP ZAP (Dynamic application testing)
               │
               ▼
     📑  [ Evidence Collector ] (Preserves immutable raw proofs)
               │
               ▼
     ⚖️  [ Risk Correlation Engine ] (Normalizes scores & context)
               │
               ▼
     🤖  [ AI Intelligence Layer ] (Gemini narration & remediation)
               │
               ▼
   📊  [ Executive Report & Dashboard ] (Target scoring & PDFs)
```

1. **Target Ingestion**: Accepts public domain URLs or authorized git repositories.
2. **Crawler Engine**: Utilizes crawler services to build an attack surface map, discovering pages, inputs, and code repositories.
3. **Security Engine Layer**: Runs parallel non-destructive scanners (Nuclei, Semgrep, Trivy, Gitleaks, etc.) depending on target type.
4. **Evidence Collector**: Extracts raw HTTP headers, code fragments, or certificates that triggered findings, ensuring proof is stored.
5. **Risk Correlation Engine**: Merges duplicated vulnerabilities, normalizes risk ratings, and maps issues to OWASP, CWE, and PCI standards.
6. **AI Intelligence Layer**: Triggers the LLM service to generate plain-text descriptions, business impacts, and code remediation recommendations.
7. **Executive Report & Dashboard**: Renders finalized immutable reports for visual reviews or PDF exports.
