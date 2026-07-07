# ADR-002: Backend Architecture & Orchestration

## Status
Approved

## Context
The backend API handles critical Orchestration, Authentication, Data Persistence, Task Scheduling, and AI reporting. It must be highly structured, maintainable, testable, and support dependency injection.

## Options Evaluated
* **Option A: Express.js with custom structure**
* **Option B: NestJS (TypeScript Framework)** - **SELECTED**
* **Option C: FastAPI (Python)**

## Decision
We select **Option B (NestJS with TypeScript)**.

### Rationale
* NestJS provides a standardized architectural layout (Modules, Controllers, Providers) preventing "spaghetti code".
* Native dependency injection facilitates modular testing.
* Built-in support for OpenAPI (Swagger) allows auto-generation of front-end API clients.
* Seamless integration with BullMQ and Prisma ORM.

## Consequences
* **Pros:**
  * Strict separation of concerns (Controllers for routing, Services for business logic).
  * Highly cohesive modules for Auth, Projects, Scans, Reports, etc.
  * Strong typing matching the frontend interfaces.
* **Cons:**
  * Slight learning curve for developers unfamiliar with Angular-like structures.
  * Runtime overhead compared to a raw Express app, which is negligible for our scale.
