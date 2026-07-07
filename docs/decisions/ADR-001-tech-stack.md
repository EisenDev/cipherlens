# ADR-001: Technology Stack Selection

## Status
Approved

## Context
CipherLens needs to support a modern, highly responsive user interface, a scalable backend api capable of queuing scans, and a robust scanning engine. We require technologies that have wide adoption, excellent TypeScript/Python support, enterprise-grade tooling, and a vibrant community.

## Options Evaluated
* **Option A: Next.js Monolithic Stack** (React frontend + Next.js Serverless Backend + Python microservice)
* **Option B: Decoupled Multi-tier Stack** (React/Vite Frontend + NestJS Backend API + Python Scanning Engine) - **SELECTED**

## Decision
We select **Option B (Decoupled Multi-tier Stack)**.

### Rationale
* **Vite + React:** Offers extremely fast builds, lean developer experience, and clear boundaries.
* **NestJS (TypeScript):** Provides an enterprise-ready architecture out of the box (DI, modules, controllers) which scales well for multiple backend developers.
* **Python (Scanner):** Python is the industry standard for security automation, writing custom parsers, and wrapping open-source security tools (such as secret checkers or dependency analyzers).
* **Docker/Compose:** Decoupled architecture fits well into standard container setups, ready to scale to Kubernetes in the future.

## Consequences
* **Pros:**
  * Clean architectural boundaries: Frontend, backend, and scanner are fully isolated.
  * Specialized technologies for specialized tasks (TypeScript for Web, Python for Scanners).
  * High testability and independent deployments.
* **Cons:**
  * Requires managing multiple package/dependency ecosystems (npm + pip).
  * Requires clear contracts (REST APIs and Queue payloads) between systems.
