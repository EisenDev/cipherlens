# CipherLens

CipherLens is an enterprise-grade, AI-powered defensive security intelligence platform designed to perform automated security assessments against websites and source code repositories.

---

## Project Vision & Alignment
CipherLens is a **defensive security auditing** tool. Its primary goal is to empower development teams, security engineers, and compliance officers to scan websites and repositories, generate comprehensive vulnerability reports, and obtain AI-assisted remediation guidelines. It is designed to be non-intrusive and defensive-oriented.

---

## Repository Structure

The project is organized as a monorepo containing the following components:

* **[frontend/](file:///home/eisen/projects/random-proj/CipherLens/frontend/)**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand client.
* **[backend/](file:///home/eisen/projects/random-proj/CipherLens/backend/)**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, and BullMQ worker coordinator.
* **[scanner/](file:///home/eisen/projects/random-proj/CipherLens/scanner/)**: Python-based scanning engine returning structured JSON audit records.
* **[docs/](file:///home/eisen/projects/random-proj/CipherLens/docs/)**: Complete product, development, and architectural documentation.
* **[infrastructure/](file:///home/eisen/projects/random-proj/CipherLens/infrastructure/)**: Docker, Docker Compose, and environment setups.
* **[scripts/](file:///home/eisen/projects/random-proj/CipherLens/scripts/)**: Operations and local developer bootstrap scripts.

---

## AI Knowledge System
For developers using AI assistance, we have established a centralized guidelines directory at the root:
* **[AGENTS.md](file:///home/eisen/projects/random-proj/CipherLens/AGENTS.md)**: Master AI and developer guidelines.
* **[GEMINI.md](file:///home/eisen/projects/random-proj/CipherLens/GEMINI.md)**: Instructions specific to Google Gemini.
* **[CLAUDE.md](file:///home/eisen/projects/random-proj/CipherLens/CLAUDE.md)**: Instructions specific to Anthropic Claude.

---

## Getting Started

### Prerequisites
* Docker & Docker Compose
* Node.js (v18+)
* Python (v3.11+)

### Local Development Setup
1. Clone the repository.
2. Initialize environment files in `infrastructure/`.
3. Start the local database, Redis, and task queues:
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d
   ```
4. Run backend development server:
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```
5. Run frontend development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Project Documentation
Explore our extensive documentation for deeper insights:
* **[Roadmap](file:///home/eisen/projects/random-proj/CipherLens/docs/roadmap/roadmap.md)**
* **[Architecture Decision Records](file:///home/eisen/projects/random-proj/CipherLens/docs/decisions/)**
* **[Development Guidelines](file:///home/eisen/projects/random-proj/CipherLens/docs/development/standards.md)**
* **[Security Principles](file:///home/eisen/projects/random-proj/CipherLens/docs/security/security_principles.md)**
* **[Task Backlog & Active Board](file:///home/eisen/projects/random-proj/CipherLens/docs/tasks/)**
* **[Database Specification (DATABASE.md)](file:///home/eisen/projects/random-proj/CipherLens/DATABASE.md)**
* **[Authentication Specification (AUTH.md)](file:///home/eisen/projects/random-proj/CipherLens/AUTH.md)**
* **[API Reference Guide (API.md)](file:///home/eisen/projects/random-proj/CipherLens/API.md)**
* **[Auth Backend Implementation Log (IMPLEMENTATION_LOG.md)](file:///home/eisen/projects/random-proj/CipherLens/IMPLEMENTATION_LOG.md)**
