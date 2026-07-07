# Development Workflow

This document defines the process for developing and introducing new features or fixes into the CipherLens monorepo.

---

## 1. Plan & Document First
* No code changes should occur without corresponding task planning.
* Design API contracts or schemas and review them before implementation.
* Add or update an Architecture Decision Record (ADR) in `docs/decisions/` if a database model, queue setup, or scanner module structure is added or changed.

## 2. Local Environment Setup
* Spin up supporting infrastructure services using Docker Compose:
  ```bash
  docker compose -f infrastructure/docker-compose.yml up -d
  ```
* Launch local development environment (frontend, backend venv setup, database creation, server startup) using the unified root run script:
  ```bash
  ./run.sh
  ```

## 3. Implement & Test
* Develop components in isolation or write backend modules using NestJS CLI helpers (`nest g service name`).
* Ensure code adheres to standards defined in [standards.md](file:///home/eisen/projects/random-proj/CipherLens/docs/development/standards.md).
* Write unit and integration tests.

## 4. Documentation & PR Updates
* Update `docs/tasks/active_tasks.md` and `docs/tasks/completed_tasks.md`.
* Document updates in `docs/changelog/changelog.md`.
* Ensure that the code passes linting, formatting, and typing checks.
