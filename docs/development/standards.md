# Coding Standards & Guidelines

This document outlines the coding standards for front-end, back-end, and scanner development in the CipherLens project.

---

## TypeScript (Frontend & Backend)

### Linter & Formatter
* Use **ESLint** with standard TypeScript configurations.
* Use **Prettier** for formatting.
* Strict null checking must be active.

### Code Style
* **Naming Conventions:**
  * File names: `kebab-case` for components and modules (e.g. `user-profile.tsx`, `auth.service.ts`).
  * Class names: `PascalCase` (e.g. `UserService`).
  * Methods and functions: `camelCase` (e.g. `getUserById`).
  * Interfaces: Prefixing with `I` is prohibited. Use direct names (e.g. `UserConfig` instead of `IUserConfig`).
* **Imports:**
  * Clean up unused imports.
  * Use path aliases (e.g., `@/components/button` or `@backend/modules/auth`) instead of complex relative imports (`../../../../components`).

---

## Python (Scanner Engine)

### Linter & Formatter
* Follow PEP 8 guidelines.
* Use **Black** for auto-formatting.
* Use **Mypy** for static type verification.

### Code Style
* **Type Hints:**
  * All function signatures must declare types:
    ```python
    def parse_headers(url: str) -> dict[str, str]:
        # ...
    ```
* **Error Handling:**
  * Catch specific exceptions (e.g., `requests.exceptions.Timeout`) rather than generic `except Exception:`.
  * Return structured error results in JSON format rather than crashing.

---

## Git Conventions

### Branch Naming
* `feature/feature-name`
* `bugfix/issue-description`
* `release/vX.Y.Z`

### Commit Messages
Follow conventional commits syntax:
* `feat: add website scanning header parsing`
* `fix: prevent timeout in git checkout service`
* `docs: update adr-001 with queue details`
* `test: add integration test cases for auth controller`
