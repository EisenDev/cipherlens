# ADR-004: Asynchronous Task Queue Selection

## Status
Approved

## Context
Auditing a website or repository is a long-running background process (taking anywhere from seconds to minutes). We must queue these tasks, manage retry logic, track status updates, and support concurrent runs without blocking the API gateway.

## Options Evaluated
* **Option A: RabbitMQ or Apache Kafka**
* **Option B: Redis + BullMQ** - **SELECTED**

## Decision
We select **Option B (Redis + BullMQ)**.

### Rationale
* **BullMQ:** Built specifically for Node.js/TypeScript environments. It integrates seamlessly with NestJS via `@nestjs/bullmq`.
* **Reliability:** Supports parent-child task jobs, retries with backoff, priority queues, and concurrency limits.
* **Simplicity:** Redis is already required for caching and session management; using it for BullMQ avoids adding complex message broker infrastructure (like Kafka or RabbitMQ) for the MVP.

## Consequences
* **Pros:**
  * Low administrative overhead (shared Redis instance).
  * Direct integration with TypeScript classes for jobs.
  * Real-time job status tracking (failed, active, completed, delayed).
* **Cons:**
  * Redis holds job state in memory; large queues could consume significant RAM if not pruned/completed records aren't archived to PostgreSQL.
