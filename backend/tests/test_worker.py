import json
import time
import pytest
from unittest.mock import patch, MagicMock

from database.session import SessionLocal, Base, engine
from database.models import User, Asset, Scan, ScanModule, ScanLog, ScanJob, ScanResult
from services.queue import ScanQueue
from services.execution import ScanExecutionService
from result import ScannerStatus, ScannerResult, Finding, Severity

@pytest.fixture(scope="module")
def db_session():
    # Make sure all tables are created
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Setup a dummy user and asset for test runs
    user = db.query(User).filter(User.email == "worker-test@example.com").first()
    if not user:
        user = User(
            fullName="Worker Test User",
            email="worker-test@example.com",
            passwordHash="hashedpassword",
            companyName="Test Inc"
        )
        db.add(user)
        db.flush()

    asset = db.query(Asset).filter(Asset.url == "https://worker-target.com").first()
    if not asset:
        asset = Asset(
            name="worker-target.com",
            url="https://worker-target.com",
            type="WEBSITE",
            userId=user.id
        )
        db.add(asset)
        db.flush()
        
    db.commit()
    yield db
    db.close()

def test_redis_connection_graceful():
    """Verify that ScanQueue handles connection status checks cleanly."""
    queue = ScanQueue()
    # It should not throw even if connection status is false
    connected = queue.is_connected()
    assert isinstance(connected, bool)

def test_scan_queue_operations():
    """Verify enqueuing and dequeuing tasks through the Redis list."""
    queue = ScanQueue()
    if not queue.is_connected():
        pytest.skip("Local Redis service is not available or offline.")

    scan_id = "test-scan-uuid-123"
    # Push to queue
    enqueued = queue.enqueue(scan_id)
    assert enqueued is True

    # Pull from queue in a loop to clear any previous test run garbage
    dequeued = None
    for _ in range(10):
        val = queue.dequeue(timeout=1)
        if val == scan_id:
            dequeued = val
            break
        if val is None:
            break
            
    assert dequeued == scan_id

def test_redis_offline_graceful_fallback(db_session):
    """Verify enqueuing fallback logic if Redis is mock-disconnected."""
    with patch("services.queue.redis.from_url") as mock_redis_url:
        # Mock ping raising connection error
        mock_client = MagicMock()
        mock_client.ping.side_effect = Exception("Connection refused")
        mock_redis_url.return_value = mock_client
        
        queue = ScanQueue()
        assert queue.is_connected() is False
        
        # Enqueuing should log a warning and return False, not raise
        enqueued = queue.enqueue("scan-xyz")
        assert enqueued is False

def test_scan_execution_updates_states(db_session):
    """Verify the ScanExecutionService lifecycle state transitions, module logs and progress metrics."""
    # 1. Create a dummy Scan record
    asset = db_session.query(Asset).filter(Asset.url == "https://worker-target.com").first()
    scan = Scan(
        status="QUEUED",
        scanType="QUICK",
        scanName="Worker Execution Test",
        assetId=asset.id
    )
    db_session.add(scan)
    db_session.flush()

    # Save selected_modules configuration list
    modules_config = ScanModule(
        scanId=scan.id,
        name="selected_modules",
        config=json.dumps(["headers", "ssl"])
    )
    db_session.add(modules_config)
    db_session.commit()

    # 2. Run ScanExecutionService with mocked scanner runs
    execution_service = ScanExecutionService(db_session)
    
    # Mock individual scanner execution in the manager
    mock_finding = Finding(
        title="Missing X-Frame-Options Header",
        severity=Severity.MEDIUM,
        scanner="headers",
        category="Headers",
        description="The X-Frame-Options HTTP response header was not returned.",
        evidence="HTTP/1.1 200 OK\nServer: nginx",
        remediation="Configure the server to return X-Frame-Options: DENY or SAMEORIGIN.",
        references=["https://owasp.org/www-project-secure-headers/"]
    )
    mock_headers_res = ScannerResult(
        scanner_name="headers",
        target="https://worker-target.com",
        status=ScannerStatus.SUCCESS,
        findings=[mock_finding]
    )
    mock_ssl_res = ScannerResult(
        scanner_name="ssl",
        target="https://worker-target.com",
        status=ScannerStatus.FAILED,
        error_message="SSL audit failure"
    )

    def mock_run_single(target, name, options):
        if name == "headers":
            return mock_headers_res
        return mock_ssl_res

    with patch.object(execution_service.manager, "_run_single_scanner", side_effect=mock_run_single):
        execution_service.run_scan(scan.id)

    # 3. Assert scan state transitions in DB
    db_session.refresh(scan)
    assert scan.status == "COMPLETED" # Completed because at least one module completed successfully (headers)
    assert scan.progress == 100
    assert scan.startedAt is not None
    assert scan.completedAt is not None
    assert scan.duration >= 0

    # 4. Check modules state changes
    mod_records = db_session.query(ScanModule).filter(ScanModule.scanId == scan.id).all()
    mod_status_map = {m.name: m.status for m in mod_records}
    assert mod_status_map["headers"] == "COMPLETED"
    assert mod_status_map["ssl"] == "FAILED"
    
    # Check that finding was persisted
    findings_db = db_session.query(ScanResult).filter(ScanResult.scanId == scan.id).all()
    assert len(findings_db) == 1
    assert findings_db[0].title == "Missing X-Frame-Options Header"
    assert findings_db[0].severity == "MEDIUM"
    assert findings_db[0].module == "headers"
    assert findings_db[0].category == "Headers"
    
    # 5. Check logs persisted correctly
    logs = db_session.query(ScanLog).filter(ScanLog.scanId == scan.id).all()
    log_messages = [l.message for l in logs]
    assert any("Initializing target" in m for m in log_messages)
    assert any("Module 'headers' completed successfully" in m for m in log_messages)
    assert any("Module 'ssl' failed" in m for m in log_messages)
