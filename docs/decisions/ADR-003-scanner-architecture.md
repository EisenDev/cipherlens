# ADR-003: Python Scanner Engine Design

## Status
Approved

## Context
The scanner engine is responsible for executing automated, CPU/IO-bound security assessments (secret auditing, dependency checking, web headers auditing). It must run isolated from the web server to prevent resource exhaustion, and return predictable, typed structures.

## Options Evaluated
* **Option A: Scanners built directly as NestJS modules**
* **Option B: Independent Python-based Scanning Engine** - **SELECTED**

## Decision
We select **Option B (Independent Python Engine)**.

### Rationale
* **Tooling ecosystem:** Security research and tool wrapper development is far more mature in Python (e.g., bandit, safety, requests, gitpython).
* **Decoupled execution:** Scanners run in separate containers, isolated from the API server, ensuring security and stability (API doesn't crash if a scanner runs out of memory).
* **Return contract:** The Python engine executes the scan and produces a strictly typed JSON structure (defined by Pydantic schemas) returned back to the API.

## Consequences
* **Pros:**
  * Zero scanning logic on the backend.
  * Simple JSON contract between backend orchestrator and scanner.
  * High horizontal scalability.
* **Cons:**
  * Requires setting up and maintaining a Python container build pipeline.
  * Payloads must be carefully serialized and validated.
