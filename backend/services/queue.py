import redis
import logging
from core.config import settings

logger = logging.getLogger("cipherlens.queue")

class ScanQueue:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.redis_client = None
        self._connect()

    def _connect(self):
        try:
            self.redis_client = redis.from_url(self.redis_url, socket_connect_timeout=3, decode_responses=True)
            self.redis_client.ping()
            logger.info("Connected to Redis at %s", self.redis_url)
        except Exception as e:
            self.redis_client = None
            logger.warning("Failed to connect to Redis at %s: %s", self.redis_url, e)

    def is_connected(self) -> bool:
        if not self.redis_client:
            self._connect()
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except Exception:
            return False

    def enqueue(self, scan_id: str) -> bool:
        """
        Enqueue scan_id for processing. Returns True if successful, False otherwise.
        """
        if not self.is_connected():
            logger.error("Cannot enqueue job %s: Redis is not connected.", scan_id)
            return False
        try:
            self.redis_client.rpush("cipherlens:scan_queue", scan_id)
            logger.info("Enqueued scan job %s to Redis queue 'cipherlens:scan_queue'", scan_id)
            return True
        except Exception as e:
            logger.error("Failed to enqueue job %s: %s", scan_id, e)
            return False

    def dequeue(self, timeout: int = 5) -> str | None:
        """
        Block and dequeue next scan_id.
        """
        if not self.is_connected():
            return None
        try:
            res = self.redis_client.blpop("cipherlens:scan_queue", timeout=timeout)
            if res:
                return res[1]
        except Exception as e:
            # Silence expected timeouts when queue is empty
            if "Timeout reading from socket" in str(e) or isinstance(e, TimeoutError):
                return None
            logger.error("Error dequeuing job from Redis: %s", e)
        return None
