import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.session import engine, Base
from core.config import settings
from api.routes import auth, scans, assets, statistics, modules, jobs, findings

# Automatically create PostgreSQL tables at start if they do not exist
Base.metadata.create_all(bind=engine)

from sqlalchemy import inspect, text
def run_migrations():
    inspector = inspect(engine)
    
    # Check scans table columns
    scan_columns = [col["name"] for col in inspector.get_columns("scans")]
    with engine.begin() as conn:
        if "startedAt" not in scan_columns:
            conn.execute(text('ALTER TABLE scans ADD COLUMN "startedAt" TIMESTAMP WITH TIME ZONE NULL'))
        if "completedAt" not in scan_columns:
            conn.execute(text('ALTER TABLE scans ADD COLUMN "completedAt" TIMESTAMP WITH TIME ZONE NULL'))
        if "jobId" not in scan_columns:
            conn.execute(text('ALTER TABLE scans ADD COLUMN "jobId" VARCHAR NULL'))
        if "currentModule" not in scan_columns:
            conn.execute(text('ALTER TABLE scans ADD COLUMN "currentModule" VARCHAR NULL'))
        if "progress" not in scan_columns:
            conn.execute(text('ALTER TABLE scans ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0'))
            
    # Check scan_modules table columns
    mod_columns = [col["name"] for col in inspector.get_columns("scan_modules")]
    with engine.begin() as conn:
        if "status" not in mod_columns:
            conn.execute(text('ALTER TABLE scan_modules ADD COLUMN "status" VARCHAR NOT NULL DEFAULT \'WAITING\''))
        if "duration" not in mod_columns:
            conn.execute(text('ALTER TABLE scan_modules ADD COLUMN "duration" INTEGER NULL'))
        if "errors" not in mod_columns:
            conn.execute(text('ALTER TABLE scan_modules ADD COLUMN "errors" TEXT NULL'))
        if "logs" not in mod_columns:
            conn.execute(text('ALTER TABLE scan_modules ADD COLUMN "logs" TEXT NULL'))

    # Check scan_results table columns
    res_columns = [col["name"] for col in inspector.get_columns("scan_results")]
    with engine.begin() as conn:
        if "module" not in res_columns:
            conn.execute(text('ALTER TABLE scan_results ADD COLUMN "module" VARCHAR NULL'))
        if "tool" not in res_columns:
            conn.execute(text('ALTER TABLE scan_results ADD COLUMN "tool" VARCHAR NULL'))
        if "category" not in res_columns:
            conn.execute(text('ALTER TABLE scan_results ADD COLUMN "category" VARCHAR NULL'))
        if "references" not in res_columns:
            conn.execute(text('ALTER TABLE scan_results ADD COLUMN "references" TEXT NULL'))
        if "rawData" not in res_columns:
            conn.execute(text('ALTER TABLE scan_results ADD COLUMN "rawData" TEXT NULL'))


try:
    run_migrations()
except Exception as e:
    print(f"Migration warning: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:3005"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route
@app.get("/")
def read_root():
    return {"status": "online", "service": "CipherLens API (FastAPI)"}

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(scans.router, prefix=settings.API_V1_STR)
app.include_router(assets.router, prefix=settings.API_V1_STR)
app.include_router(statistics.router, prefix=settings.API_V1_STR)
app.include_router(modules.router, prefix=settings.API_V1_STR)
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(findings.router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
