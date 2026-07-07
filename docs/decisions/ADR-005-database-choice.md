# ADR-005: Primary Database Choice

## Status
Approved

## Context
CipherLens needs to store persistent entities such as Users, Projects, Target Configurations, Scan History, Scan Result metadata, and AI audit reports. We need a reliable relational database that supports transactions, JSON structures, and scales well.

## Options Evaluated
* **Option A: MongoDB (Document DB)**
* **Option B: PostgreSQL with Prisma ORM** - **SELECTED**

## Decision
We select **Option B (PostgreSQL with Prisma ORM)**.

### Rationale
* **Data Integrity:** Relationships between users, projects, scans, and reports are strictly relational. PostgreSQL handles these relations with absolute integrity (foreign keys, cascade rules).
* **JSON support:** PostgreSQL supports native JSONB columns. This allows us to store the structured JSON scan payloads inside a single query-friendly column while maintaining rigid relational schema for the rest of the app.
* **Prisma ORM:** Provides auto-generated, type-safe TypeScript clients. Schema updates are managed via standard migrations.

## Consequences
* **Pros:**
  * Strict schema enforcement for core entities.
  * Native capability to store and query unstructured scanner payloads via JSONB.
  * Excellent integration with NestJS.
* **Cons:**
  * Requires schema migrations when adding relational columns.
