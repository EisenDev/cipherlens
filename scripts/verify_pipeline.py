#!/usr/bin/env python3
import sys
import os
import argparse
import logging
import json

# Ensure root paths are in sys.path
ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_PATH = os.path.join(ROOT_PATH, "backend")
SCANNER_PATH = os.path.join(ROOT_PATH, "scanner")

if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)
if SCANNER_PATH not in sys.path:
    sys.path.insert(0, SCANNER_PATH)

from database.session import SessionLocal, Base, engine
from database.models import User, Asset, Scan, ScanModule, ScanResult, ScanLog
from services.execution import ScanExecutionService

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("cipherlens.verify")


def run_verification(target: str, target_type: str, modules: list[str]) -> bool:
    logger.info("Initializing CipherLens Pipeline Verification Mode...")
    logger.info("Target: %s (%s)", target, target_type)
    logger.info("Selected modules: %s", modules)

    # Initialize tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Create or fetch a test developer account
        user = db.query(User).filter(User.email == "developer-verify@cipherlens.local").first()
        if not user:
            user = User(
                fullName="Verification Developer",
                email="developer-verify@cipherlens.local",
                passwordHash="verification-hash-placeholder",
                companyName="CipherLens Dev Team"
            )
            db.add(user)
            db.flush()

        # 2. Create Asset
        asset = Asset(
            name="Verification Test Target",
            url=target,
            type=target_type,
            userId=user.id
        )
        db.add(asset)
        db.flush()

        # 3. Create Scan record
        scan = Scan(
            status="QUEUED",
            scanType="CUSTOM",
            scanName=f"Dev Pipeline Verification - {target}",
            assetId=asset.id
        )
        db.add(scan)
        db.flush()

        # 4. Save selected modules configuration
        modules_config = ScanModule(
            scanId=scan.id,
            name="selected_modules",
            config=json.dumps(modules)
        )
        db.add(modules_config)
        db.commit()

        logger.info("Created local Scan ID: %s", scan.id)
        logger.info("Starting execution pipeline synchronously...")

        # 5. Execute scan using ScanExecutionService
        service = ScanExecutionService(db)
        service.run_scan(scan.id)

        # 6. Verify results
        db.refresh(scan)
        logger.info("Scan execution finished with status: %s", scan.status)
        logger.info("Progress: %d%%", scan.progress)
        logger.info("Total duration: %s seconds", scan.duration)

        findings = db.query(ScanResult).filter(ScanResult.scanId == scan.id).all()
        logger.info("Total findings recorded in database: %d", len(findings))

        for f in findings:
            logger.info("  [-] Finding: [%s] %s (Severity: %s, Module: %s, Tool: %s)", 
                        f.findingCode, f.title, f.severity, f.module, f.tool)

        logs = db.query(ScanLog).filter(ScanLog.scanId == scan.id).all()
        logger.info("Total log records: %d", len(logs))

        # Check overall status
        if scan.status in ["COMPLETED", "FAILED"]:
            logger.info("Verification process finished successfully.")
            return True
        else:
            logger.error("Verification failed: Scan ended in unexpected state: %s", scan.status)
            return False

    except Exception as e:
        logger.exception("Error during verification:")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CipherLens Pipeline Verification Mode CLI")
    parser.add_argument("--target", default="https://example.com", help="Target URL or repository (default: https://example.com)")
    parser.add_argument("--type", default="WEBSITE", choices=["WEBSITE", "REPOSITORY"], help="Target type")
    parser.add_argument("--modules", default="headers,technology", help="Comma-separated modules list")

    args = parser.parse_args()
    module_list = [m.strip() for m in args.modules.split(",") if m.strip()]

    success = run_verification(args.target, args.type.upper(), module_list)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
