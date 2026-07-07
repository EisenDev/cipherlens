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
        logger.info("Starting background worker, listening to 'cipherlens:scan_queue'...")

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

        while self.running:
            if not self.queue.is_connected():
                logger.warning("Redis is disconnected. Retrying connection in 5 seconds...")
                time.sleep(5)
                continue

            try:
                # Dequeue next job ID (blocks for up to 5 seconds)
                scan_id = self.queue.dequeue(timeout=5)
                if scan_id:
                    logger.info("Worker received scan job ID: %s", scan_id)
                    self._process_scan(scan_id)
            except Exception as e:
                logger.error("Error in worker loop: %s", e)
                time.sleep(2)

        logger.info("Worker stopped successfully.")

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
