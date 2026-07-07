# Infrastructure & Deployment

This folder houses the infrastructure blueprints, including container definitions, system compositions, and environment configuration presets.

## Local Services (Docker Compose)
We bundle a multi-container database and caching backend structure for local development.

### Spinning Up Services
Ensure Docker is active, then execute:
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

This starts:
1. **PostgreSQL** on port `5432` (credentials configured in `docker-compose.yml`).
2. **Redis** on port `6379`.

### Stopping Services
```bash
docker compose -f infrastructure/docker-compose.yml down
```
Use the `-v` flag to clear data volumes.
