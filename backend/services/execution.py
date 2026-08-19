import json
import logging
import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Ensure the scanner framework path is importable
import sys
import os
SCANNER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scanner"))
if SCANNER_PATH not in sys.path:
    sys.path.insert(0, SCANNER_PATH)

try:
    from database.models import Scan, ScanModule, ScanLog, Asset, ScanResult
except ImportError:
    # Handle direct import fallback if path differs
    from backend.database.models import Scan, ScanModule, ScanLog, Asset, ScanResult

from manager import ScannerManager
from result import ScannerStatus

logger = logging.getLogger("cipherlens.execution")


class ScanExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.manager = ScannerManager()
        self.manager.initialize()

    def run_scan(self, scan_id: str) -> None:
        """
        Execute the complete scan lifecycle for the given scan ID.
        """
        logger.info("Executing scan job %s", scan_id)
        
        # 1. Fetch the scan and target details
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            logger.error("Scan %s not found in database.", scan_id)
            return

        # Record start timestamp
        scan.startedAt = datetime.now(timezone.utc)
        scan.status = "PREPARING"
        scan.progress = 5
        self._add_log(scan_id, "INFO", "Initializing target security analysis...")
        self.db.commit()

        try:
            # 2. Load configurations and selected modules from ScanModule records
            modules_records = self.db.query(ScanModule).filter(ScanModule.scanId == scan_id).all()
            
            # Map configuration properties
            configs = {}
            selected_modules_list = []
            for record in modules_records:
                if record.name == "selected_modules":
                    try:
                        selected_modules_list = json.loads(record.config)
                    except Exception:
                        selected_modules_list = []
                else:
                    try:
                        configs[record.name] = json.loads(record.config)
                    except Exception:
                        configs[record.name] = {}

            # Construct scan options
            options = {
                "crawling": configs.get("crawling", {}),
                "auth": configs.get("auth", {}),
                "proxy": configs.get("proxy", {}),
                "performance": configs.get("performance", {}),
                "exclusions": configs.get("exclusions", {}),
                "headers": configs.get("headers", []),
            }

            # 3. Resolve modules to run
            target_type = scan.asset.type.upper()
            target_url = scan.asset.url
            
            resolved_modules = self.manager._resolve_scanners(selected_modules_list, target_type)
            if not resolved_modules:
                self._add_log(scan_id, "WARNING", f"No applicable scanner modules found for {target_type} target.")
                scan.status = "COMPLETED"
                scan.progress = 100
                scan.completedAt = datetime.now(timezone.utc)
                self.db.commit()
                return

            logger.info("Resolved %d scanner modules for target %s", len(resolved_modules), target_url)

            # Ensure all resolved modules have a database record
            db_module_records = {r.name: r for r in modules_records if r.name != "selected_modules"}
            for mod_name in resolved_modules:
                if mod_name not in db_module_records:
                    record = ScanModule(
                        scanId=scan_id,
                        name=mod_name,
                        config=json.dumps({}),
                        status="WAITING"
                    )
                    self.db.add(record)
                    db_module_records[mod_name] = record
            self.db.commit()

            # 4. Execute scanners
            scan.status = "RUNNING"
            scan.progress = 10
            self._add_log(scan_id, "INFO", f"Starting security assessment pipeline against {target_url}")
            self.db.commit()

            total_modules = len(resolved_modules)
            completed_modules = 0
            any_success = False
            all_failed = True

            for idx, mod_name in enumerate(resolved_modules):
                # Check for cancellation state
                self.db.refresh(scan)
                if scan.status == "CANCELLED":
                    self._add_log(scan_id, "WARNING", "Scan cancelled by user request.")
                    # Cancel remaining modules
                    for remaining in resolved_modules[idx:]:
                        record = db_module_records.get(remaining)
                        if record and record.status in ["WAITING", "RUNNING"]:
                            record.status = "CANCELLED"
                    break

                record = db_module_records.get(mod_name)
                if not record:
                    continue

                # Start module execution
                scan.currentModule = mod_name
                record.status = "RUNNING"
                self._add_log(scan_id, "INFO", f"Executing security module: {mod_name}")
                self.db.commit()

                start_time = time.monotonic()
                try:
                    # Run single scanner logic
                    result = self.manager._run_single_scanner(target_url, mod_name, options)
                    duration = int(time.monotonic() - start_time)

                    record.duration = duration
                    record.logs = f"Exit code: {getattr(result, 'exit_code', 0) or getattr(result, 'tool_exit_code', 0)}\n" + (result.error_message or "") + "\n" + (result.tool_raw_output or "")
                    
                    scan_rec = self.db.query(Scan).filter(Scan.id == scan_id).first()
                    asset_id = scan_rec.assetId if scan_rec else None

                    if result.status == ScannerStatus.SUCCESS:
                        record.status = "COMPLETED"
                        any_success = True
                        all_failed = False
                        self._add_log(
                            scan_id, 
                            "INFO", 
                            f"Module '{mod_name}' completed successfully in {duration}s. (Findings: {len(result.findings)})"
                        )
                        # Save findings
                        for f in result.findings:
                            status = "Open"
                            assignedTo = None
                            notes = None
                            resolvedAt = None
                            if asset_id:
                                prev_finding = self.db.query(ScanResult)\
                                    .join(Scan, ScanResult.scanId == Scan.id)\
                                    .filter(Scan.assetId == asset_id, ScanResult.findingCode == f.id)\
                                    .first()
                                if prev_finding:
                                    status = prev_finding.status
                                    assignedTo = prev_finding.assignedTo
                                    notes = prev_finding.notes
                                    resolvedAt = prev_finding.resolvedAt

                            finding = ScanResult(
                                scanId=scan_id,
                                findingCode=f.id,
                                title=f.title,
                                severity=f.severity.value if hasattr(f.severity, 'value') else str(f.severity),
                                description=f.description,
                                evidence=f.evidence,
                                filePath=f.file_path,
                                lineNumber=f.line_number,
                                remediation=f.remediation,
                                module=f.scanner,
                                tool=result.metadata.get("tool") or getattr(result, 'tool_command', mod_name) or mod_name,
                                category=f.category,
                                references=json.dumps(f.references) if f.references else None,
                                rawData=json.dumps(f.raw_data) if f.raw_data else None,
                                status=status,
                                assignedTo=assignedTo,
                                notes=notes,
                                resolvedAt=resolvedAt
                            )
                            self.db.add(finding)
                    else:
                        record.status = "FAILED"
                        record.errors = result.error_message or "Module returned failure status."
                        self._add_log(
                            scan_id, 
                            "ERROR", 
                            f"Module '{mod_name}' failed: {record.errors}"
                        )
                        # Save findings if any were generated despite the failure
                        if result.findings:
                            for f in result.findings:
                                status = "Open"
                                assignedTo = None
                                notes = None
                                resolvedAt = None
                                if asset_id:
                                    prev_finding = self.db.query(ScanResult)\
                                        .join(Scan, ScanResult.scanId == Scan.id)\
                                        .filter(Scan.assetId == asset_id, ScanResult.findingCode == f.id)\
                                        .first()
                                    if prev_finding:
                                        status = prev_finding.status
                                        assignedTo = prev_finding.assignedTo
                                        notes = prev_finding.notes
                                        resolvedAt = prev_finding.resolvedAt

                                finding = ScanResult(
                                    scanId=scan_id,
                                    findingCode=f.id,
                                    title=f.title,
                                    severity=f.severity.value if hasattr(f.severity, 'value') else str(f.severity),
                                    description=f.description,
                                    evidence=f.evidence,
                                    filePath=f.file_path,
                                    lineNumber=f.line_number,
                                    remediation=f.remediation,
                                    module=f.scanner,
                                    tool=result.metadata.get("tool") or getattr(result, 'tool_command', mod_name) or mod_name,
                                    category=f.category,
                                    references=json.dumps(f.references) if f.references else None,
                                    rawData=json.dumps(f.raw_data) if f.raw_data else None,
                                    status=status,
                                    assignedTo=assignedTo,
                                    notes=notes,
                                    resolvedAt=resolvedAt
                                )
                                self.db.add(finding)
                except Exception as e:
                    duration = int(time.monotonic() - start_time)
                    record.status = "FAILED"
                    record.duration = duration
                    record.errors = str(e)
                    self._add_log(
                        scan_id, 
                        "ERROR", 
                        f"Exception during module '{mod_name}' execution: {e}"
                    )

                completed_modules += 1
                scan.progress = int(10 + (completed_modules / total_modules) * 90)
                self.db.commit()

            # 5. Finalize scan status
            self.db.refresh(scan)
            if scan.status != "CANCELLED":
                scan.completedAt = datetime.now(timezone.utc)
                duration_total = int((scan.completedAt - scan.startedAt).total_seconds())
                scan.duration = duration_total
                scan.progress = 100
                scan.currentModule = None
                
                if all_failed and total_modules > 0:
                    scan.status = "FAILED"
                    self._add_log(scan_id, "ERROR", f"Security scan failed. All {total_modules} modules failed.")
                else:
                    scan.status = "COMPLETED"
                    self._add_log(scan_id, "INFO", f"Security scan completed successfully in {duration_total}s.")
                    try:
                        self._run_post_processing(scan_id)
                    except Exception as post_err:
                        logger.error(f"Failed scan post-processing for scan {scan_id}: {post_err}")
            else:
                # Cancelled finalize
                scan.completedAt = datetime.now(timezone.utc)
                scan.duration = int((scan.completedAt - scan.startedAt).total_seconds())
                scan.currentModule = None
                
            self.db.commit()

        except Exception as e:
            logger.exception("Scan job exception occurred")
            self._add_log(scan_id, "ERROR", f"Internal scanner executor error: {e}")
            scan.status = "FAILED"
            scan.completedAt = datetime.now(timezone.utc)
            scan.currentModule = None
            self.db.commit()

    def _add_log(self, scan_id: str, level: str, message: str) -> None:
        """Helper to append a message to the ScanLog table."""
        log = ScanLog(
            scanId=scan_id,
            logLevel=level,
            message=message
        )
        self.db.add(log)

    def _run_post_processing(self, scan_id: str) -> None:
        """
        Executes the dynamic Scan Post Processing Pipeline:
        1. Normalize Findings
        2. Deduplicate Findings
        3. Validate False Positives
        4. Calculate Coverage
        5. Calculate Confidence
        6. Calculate Security Posture
        7. Generate AI Summary
        8. Persist Metrics
        """
        from scoring_engine.scoring import score_from_db
        
        # Run backend scoring engine to normalize, deduplicate, validate,
        # calculate coverage/confidence/posture/AI summary.
        result = score_from_db(self.db, scan_id)
        
        # Persist metrics to database Scan record
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.score = result.overall_score
            scan.coverage = result.coverage_score
            scan.confidence = result.confidence_score
            scan.security_posture = result.posture
            scan.recommendation = result.recommendation
            scan.summary = result.ai_summary
            scan.generated_at = datetime.now(timezone.utc)
            scan.processing_version = "v3.0.0"
            self.db.add(scan)
            self.db.commit()
            self._add_log(scan_id, "INFO", f"Post-processing pipeline completed successfully: Posture={scan.security_posture}, Score={scan.score}, Confidence={scan.confidence}%, Coverage={scan.coverage}%.")
