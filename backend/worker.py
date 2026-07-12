import logging
import signal
import sys
import time

from database.session import SessionLocal
from services.execution import ScanExecutionService
from services.queue import ScanQueue

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("cipherlens.worker")


class Worker:
    def __init__(self):
        self.queue = ScanQueue()
        self.running = True

    def start(self):
        import threading as _threading
        logger.info("Starting background worker, listening to 'cipherlens:scan_queue'...")

        # Signal handlers can only be registered from the main thread.
        # When running as an embedded daemon thread inside uvicorn, skip them.
        if _threading.current_thread() is _threading.main_thread():
            signal.signal(signal.SIGINT, self.stop)
            signal.signal(signal.SIGTERM, self.stop)

        while self.running:
            if not self.queue.is_connected():
                logger.warning("Redis is disconnected. Retrying connection in 5 seconds...")
                time.sleep(5)
                continue

            try:
                # Check and execute schedules
                self._poll_schedules()

                # Dequeue next job ID (blocks for up to 5 seconds)
                scan_id = self.queue.dequeue(timeout=5)
                if scan_id:
                    logger.info("Worker received scan job ID: %s", scan_id)
                    self._process_scan(scan_id)
            except Exception as e:
                logger.error("Error in worker loop: %s", e)
                time.sleep(2)

        logger.info("Worker stopped successfully.")

    def _poll_schedules(self):
        db = SessionLocal()
        try:
            from database.models import ScanSchedule, Asset, Scan, ScanJob, ScanModule
            import datetime
            import json
            import uuid
            
            now_utc = datetime.datetime.utcnow()
            schedules = db.query(ScanSchedule).filter(ScanSchedule.isActive == True).all()
            for sched in schedules:
                if self._is_schedule_due(sched, now_utc):
                    logger.info("Schedule '%s' (ID: %s) is due. Triggering scheduled scan...", sched.name, sched.id)
                    
                    # 1. Get or create asset
                    asset = db.query(Asset).filter(
                        Asset.url == sched.targetUrl,
                        Asset.userId == sched.userId
                    ).first()
                    if not asset:
                        asset_name = sched.targetUrl.replace("https://", "").replace("http://", "").split("/")[0]
                        asset = Asset(
                            name=asset_name or sched.targetUrl,
                            url=sched.targetUrl,
                            type=sched.targetType,
                            userId=sched.userId
                        )
                        db.add(asset)
                        db.flush()
                        
                    # 2. Create Scan record
                    job_id = str(uuid.uuid4())
                    scan_name = f"{sched.name} - Scheduled Scan"
                    scan = Scan(
                        status="QUEUED",
                        scanType=sched.scanType.upper(),
                        scanName=scan_name,
                        assetId=asset.id,
                        jobId=job_id
                    )
                    db.add(scan)
                    db.flush()
                    
                    # 3. Create Scan Job
                    job = ScanJob(
                        id=job_id,
                        scanId=scan.id,
                        status="PENDING"
                    )
                    db.add(job)
                    
                    # 4. Create Scan Modules
                    selected_mods = []
                    if sched.selectedModules:
                        try:
                            selected_mods = json.loads(sched.selectedModules)
                        except Exception:
                            pass
                            
                    adv_config = {}
                    if sched.advancedConfig:
                        try:
                            adv_config = json.loads(sched.advancedConfig)
                        except Exception:
                            pass
                            
                    modules_to_create = {
                        "crawling": adv_config.get("crawling") or {},
                        "auth": adv_config.get("auth") or {},
                        "proxy": adv_config.get("proxy") or {},
                        "performance": adv_config.get("performance") or {},
                        "exclusions": adv_config.get("exclusions") or {},
                        "headers": adv_config.get("headers") or [],
                        "selected_modules": selected_mods
                    }
                    
                    for mod_name, mod_config in modules_to_create.items():
                        module = ScanModule(
                            scanId=scan.id,
                            name=mod_name,
                            config=json.dumps(mod_config)
                        )
                        db.add(module)
                        
                    # 5. Enqueue scan job
                    self.queue.enqueue(scan.id)
                    
                    # 6. Update schedule run tracking
                    sched.lastRunAt = now_utc
                    if sched.frequency == "ONCE":
                        sched.isActive = False
                        
                    db.commit()
                    logger.info("Successfully enqueued scheduled scan %s for schedule '%s'", scan.id, sched.name)
        except Exception as e:
            logger.error("Error polling schedules: %s", e)
            db.rollback()
        finally:
            db.close()

    def _is_schedule_due(self, sched, now_utc) -> bool:
        import datetime
        try:
            dt_str = f"{sched.startDate} {sched.startTime}"
            sched_dt_local = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
        except Exception:
            return False

        # Map timezone name to UTC offset hours
        tz_map = {
            "UTC": 0,
            "GMT": 0,
            "PHT": 8,
            "EST": -5,
            "PST": -8,
            "CST": -6,
            "MST": -7,
        }
        offset_hours = tz_map.get(sched.timezone, 0)

        # Convert scheduled date+time from user's local timezone to UTC
        sched_dt_utc = sched_dt_local - datetime.timedelta(hours=offset_hours)

        # The scheduled time-of-day in UTC (just hours and minutes)
        sched_time_utc = sched_dt_utc.time().replace(second=0, microsecond=0)
        now_time_utc   = now_utc.time().replace(second=0, microsecond=0)

        # Never fire before the start date
        if now_utc.date() < sched_dt_utc.date():
            return False

        last_run = sched.lastRunAt

        # --- ONCE: fire exactly once on the start date at/after the scheduled time ---
        if sched.frequency == "ONCE":
            if last_run is not None:
                return False
            return now_time_utc >= sched_time_utc

        # --- DAILY: fire once per day at/after the scheduled time-of-day ---
        elif sched.frequency == "DAILY":
            if last_run is None:
                # First ever run — fire if we're at or past the scheduled time today
                return now_time_utc >= sched_time_utc
            # Already ran: allow again only if it's been ≥ 23 hours since last run
            # AND we're at or past the scheduled time-of-day today
            delta = now_utc - last_run
            already_ran_today = (
                last_run.date() == now_utc.date()
                and last_run.time() >= sched_time_utc
            )
            if already_ran_today:
                return False
            return delta.total_seconds() >= 82800 and now_time_utc >= sched_time_utc

        # --- WEEKLY: fire on the correct weekday at/after the scheduled time ---
        elif sched.frequency == "WEEKLY":
            if now_utc.weekday() != sched_dt_utc.weekday():
                return False
            if last_run is not None:
                delta = now_utc - last_run
                if delta.days < 6:
                    return False
            return now_time_utc >= sched_time_utc

        # --- MONTHLY: fire on the correct day-of-month at/after the scheduled time ---
        elif sched.frequency == "MONTHLY":
            if now_utc.day != sched_dt_utc.day:
                return False
            if last_run is not None:
                delta = now_utc - last_run
                if delta.days < 27:
                    return False
            return now_time_utc >= sched_time_utc

        return False

    def _process_scan(self, scan_id: str):
        db = SessionLocal()
        try:
            execution_service = ScanExecutionService(db)
            execution_service.run_scan(scan_id)
        except Exception as e:
            logger.error("Failed to process scan %s: %s", scan_id, e)
        finally:
            db.close()

    def stop(self, signum=None, frame=None):
        logger.info("Termination signal received. Shutting down background worker...")
        self.running = False


if __name__ == "__main__":
    worker = Worker()
    worker.start()
