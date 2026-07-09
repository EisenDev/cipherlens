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
    from database.models import Scan, ScanModule, ScanLog, Asset
except ImportError:
    # Handle direct import fallback if path differs
    from backend.database.models import Scan, ScanModule, ScanLog, Asset

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
                        from database.models import ScanResult
                        for f in result.findings:
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
                                rawData=json.dumps(f.raw_data) if f.raw_data else None
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
                            from database.models import ScanResult
                            for f in result.findings:
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
                                    rawData=json.dumps(f.raw_data) if f.raw_data else None
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
                        scan.score = self._calculate_scan_score(scan_id)
                        self._add_log(scan_id, "INFO", f"Security Score calculated: {scan.score}/100")
                    except Exception as score_err:
                        logger.error(f"Failed to calculate security score for scan {scan_id}: {score_err}")
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
        self.db.commit()

    def _calculate_scan_score(self, scan_id: str) -> int:
        """
        Calculates a professional security score from 0 to 100 based on scan findings.
        Implements deduplication, severity weighting, CVSS inputs, exploitability,
        and profile completeness normalization.
        """
        from database.models import ScanResult, ScanModule
        import math

        # 1. Fetch completed modules
        modules = self.db.query(ScanModule).filter(
            ScanModule.scanId == scan_id,
            ScanModule.status == "COMPLETED"
        ).all()
        n_completed = len(modules)
        if n_completed == 0:
            n_completed = 1

        # 2. Calculate completeness normalization factor
        m_std = 10.0
        c_profile = n_completed / m_std
        c_profile = max(0.3, min(1.5, c_profile))

        # 3. Fetch findings
        findings = self.db.query(ScanResult).filter(ScanResult.scanId == scan_id).all()
        
        # Group and deduplicate findings by (module, findingCode/title)
        unique_findings = {}
        for f in findings:
            severity = (f.severity or "INFO").upper()
            if severity == "INFO":
                continue
                
            group_key = (f.module or "unknown", f.findingCode or f.title or "unknown")
            
            # Parse rawData for CVSS and exploitability
            cvss = None
            is_exploitable = False
            if f.rawData:
                try:
                    raw = json.loads(f.rawData)
                    if isinstance(raw, dict):
                        cvss_val = raw.get("cvss") or raw.get("cvss_score") or raw.get("cvss-score")
                        if cvss_val is not None:
                            cvss = float(cvss_val)
                        if raw.get("exploitable") or raw.get("epss") or raw.get("kev"):
                            is_exploitable = True
                except Exception:
                    pass
                    
            title_lower = (f.title or "").lower()
            desc_lower = (f.description or "").lower()
            if any(kw in title_lower or kw in desc_lower for kw in ["exploit", "cve-", "unauthenticated", "remote code execution", "rce"]):
                is_exploitable = True

            if group_key not in unique_findings:
                unique_findings[group_key] = {
                    "severity": severity,
                    "cvss": cvss,
                    "is_exploitable": is_exploitable
                }
            else:
                curr = unique_findings[group_key]
                if cvss is not None:
                    curr["cvss"] = max(curr["cvss"] or 0.0, cvss)
                if is_exploitable:
                    curr["is_exploitable"] = True
                sev_hierarchy = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
                if sev_hierarchy.get(severity, 0) > sev_hierarchy.get(curr["severity"], 0):
                    curr["severity"] = severity

        # 4. Calculate Threat Penalty Sum
        severity_weights = {
            "CRITICAL": 10.0,
            "HIGH": 7.0,
            "MEDIUM": 4.0,
            "LOW": 1.5
        }
        
        total_penalty = 0.0
        for v in unique_findings.values():
            sev = v["severity"]
            base_weight = v["cvss"] if v["cvss"] is not None else severity_weights.get(sev, 0.0)
            
            multiplier = 1.25 if v["is_exploitable"] else 1.0
            threat_weight = min(10.0, base_weight * multiplier)
            total_penalty += threat_weight

        # 5. Compute Security Score using Exponential Risk Decay
        lambda_constant = 0.035
        exponent = -lambda_constant * (total_penalty / c_profile)
        score = int(round(100.0 * math.exp(exponent)))
        
        return max(0, min(100, score))
