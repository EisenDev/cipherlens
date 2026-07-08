# Project Backlog (backlog.md)

This list contains features and technical tasks scheduled for future sprints.

## Tech Debt & Infrastructure
- [ ] Configure GitHub Actions workflows for backend linting and testing.
- [ ] Setup Docker Compose configurations for local dev, integration tests, and production simulation.
- [ ] Implement database migration pipelines in CI/CD.

## Backend (NestJS API)
- [x] Initialize JWT/OAuth Authentication module.
- [x] Set up CRUD API endpoints for target configuration (websites, repos).
- [ ] Implement BullMQ event listeners to track real-time job execution state.
- [ ] Create AI Report Service wrapping LangChain/SDK for prompt generation.

## Frontend (React UI)
- [x] Build login and organization onboarding screens.
- [x] Create main dashboard containing cards with security scores, scan queues, and recent alerts.
- [ ] Design scan result detail page featuring interactive vulnerability list.
- [ ] Implement Framer Motion transitions between views.
- [ ] [ENHANCEMENT-001] Remove SSL/TLS Summary Cards from Technical Findings Right Drawer (ClickUp: #86d3mpxxp)

## Scanner Engine (Python)
- [ ] Write TLS certificate expiration and cipher suite validation parser.
- [ ] Incorporate open-source secrets analyzer into repository scan suite.
- [ ] Define standardized Pydantic models for scanner output to validate schema integrity.
