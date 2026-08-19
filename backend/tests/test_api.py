import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ─── Isolated test database (SQLite in-memory) ────────────────────────────────
# IMPORTANT: Tests must NEVER write to the production PostgreSQL database.
# All test data lives in an ephemeral SQLite DB that is discarded after the run.
TEST_DATABASE_URL = "sqlite://"  # pure in-memory, no file

from database.session import Base, get_db
import main  # import after override setup

_test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

def _override_get_db():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the DI override before TestClient is created
main.app.dependency_overrides[get_db] = _override_get_db

client = TestClient(main.app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables in the isolated test SQLite DB, then drop them after."""
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)

def test_read_root():
    # Verify api health
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_auth_flows():
    # Generate unique email for this run
    unique_email = f"testadmin-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Test Admin User",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": "Test Corp"
    }
    # 1. Sign up new user
    response = client.post("/api/auth/signup", json=signup_data)
    assert response.status_code == 200
    res_json = response.json()
    assert "accessToken" in res_json
    assert "refreshToken" in res_json
    assert res_json["user"]["fullName"] == "Test Admin User"

    token = res_json["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test get statistics (should have 0 scans immediately!)
    stats_response = client.get("/api/dashboard/scan-summary", headers=headers)
    assert stats_response.status_code == 200
    stats_json = stats_response.json()
    assert stats_json["total"] == 0
    assert stats_json["completed"] == 0
    assert stats_json["running"] == 0
    assert stats_json["queued"] == 0
    assert stats_json["failed"] == 0

    # 3. Test login
    login_data = {
        "email": unique_email,
        "password": "securepassword123"
    }
    login_response = client.post("/api/auth/login", json=login_data)
    assert login_response.status_code == 200
    assert "accessToken" in login_response.json()

def test_new_scan_flow():
    # Generate unique user
    unique_email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Test Standard User",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": "User Corp"
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Post new scan configuration
    scan_data = {
        "targetUrl": "https://newtarget.com",
        "targetType": "WEBSITE",
        "scanType": "QUICK",
        "scanName": "New Target Quick Scan",
        "scanTags": "custom-tag",
        "crawling": {
            "depth": "Medium (2 levels)",
            "limit": 500,
            "respectRobots": True
        }
    }
    
    # 1. Post Scan
    response = client.post("/api/scans", json=scan_data, headers=headers)
    assert response.status_code == 201
    scan_json = response.json()
    assert scan_json["status"] == "QUEUED"
    assert scan_json["target"]["url"] == "https://newtarget.com"
    
    # 2. Verify it is returned in scans listing
    list_response = client.get("/api/scans", headers=headers)
    assert list_response.status_code == 200
    list_json = list_response.json()
    # 0 seeded + 1 newly added = 1 scan total
    assert list_json["total"] == 1
    
    # New scan should be the first item (newest) due to createdAt sorting
    scan_id = list_json["data"][0]["id"]
    assert list_json["data"][0]["target"]["url"] == "https://newtarget.com"
    assert list_json["data"][0]["status"] in ["QUEUED", "PREPARING", "RUNNING", "COMPLETED"]

    # 3. Test progress endpoint
    prog_res = client.get(f"/api/scans/{scan_id}/progress", headers=headers)
    assert prog_res.status_code == 200
    assert prog_res.json()["scanId"] == scan_id
    assert prog_res.json()["status"] in ["QUEUED", "PREPARING", "RUNNING", "COMPLETED"]
    assert len(prog_res.json()["modules"]) == 7

    # 4. Test logs endpoint
    log_res = client.get(f"/api/scans/{scan_id}/logs", headers=headers)
    assert log_res.status_code == 200
    assert log_res.json()["scanId"] == scan_id
    assert len(log_res.json()["logs"]) >= 1

    # 4.5. Test results endpoint
    results_res = client.get(f"/api/scans/{scan_id}/results", headers=headers)
    assert results_res.status_code == 200
    assert results_res.json()["scanId"] == scan_id
    assert isinstance(results_res.json()["results"], list)

    # 5. Test cancel endpoint
    cancel_res = client.post(f"/api/scans/{scan_id}/cancel", headers=headers)
    if cancel_res.status_code == 400:
        assert "cannot cancel" in cancel_res.json()["detail"].lower()
    else:
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "CANCELLED"

    # 6. Test retry endpoint
    retry_res = client.post(f"/api/scans/{scan_id}/retry", headers=headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] == "QUEUED"
    
    # 7. Delete original scan
    del_res = client.delete(f"/api/scans/{scan_id}", headers=headers)
    assert del_res.status_code == 200

def test_extension_endpoints():
    # Setup user
    unique_email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Test Ext User",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": "Ext Corp"
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test get registered scanners
    response = client.get("/api/scans/scanners/registered", headers=headers)
    assert response.status_code == 200
    res_json = response.json()
    assert isinstance(res_json, list)
    # Check that at least some core scanners are registered
    scanner_names = [s["name"] for s in res_json]
    assert "headers" in scanner_names
    assert "secrets" in scanner_names

    # 2. Test get scan profiles list
    response = client.get("/api/scans/scan-profiles/list", headers=headers)
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 4
    profile_ids = [p["id"] for p in res_json]
    assert "QUICK" in profile_ids
    assert "STANDARD" in profile_ids
    assert "ADVANCED" in profile_ids
    assert "CUSTOM" in profile_ids

def test_scans_validations():
    # Setup user
    unique_email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Test Validate User",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": "Validate Corp"
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Post invalid Website URL (should fail with HTTP 400)
    bad_website_data = {
        "targetUrl": "invalid-url-format",
        "targetType": "WEBSITE",
        "scanType": "QUICK"
    }
    response = client.post("/api/scans", json=bad_website_data, headers=headers)
    assert response.status_code == 400
    assert "Invalid website target URL" in response.json()["detail"]

    # 2. Post invalid Repository URL (should fail with HTTP 400)
    bad_repo_data = {
        "targetUrl": "https://github.com/badowner",
        "targetType": "REPOSITORY",
        "scanType": "QUICK"
    }
    response = client.post("/api/scans", json=bad_repo_data, headers=headers)
    assert response.status_code == 400
    assert "Invalid GitHub repository URL" in response.json()["detail"]

    # 3. Post bad numeric values (should fail with HTTP 400)
    bad_performance_data = {
        "targetUrl": "https://validtarget.com",
        "targetType": "WEBSITE",
        "scanType": "QUICK",
        "performance": {
            "timeout": 301 # > 300 limit
        }
    }
    response = client.post("/api/scans", json=bad_performance_data, headers=headers)
    assert response.status_code == 400
    assert "Performance request timeout" in response.json()["detail"]


def test_scan_schedules_crud():
    # Generate unique user
    unique_email = f"scheduleuser-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Test Schedule User",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": "Schedule Corp"
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a schedule
    schedule_data = {
        "name": "Weekly Production Scan",
        "targetUrl": "https://example.com",
        "targetType": "WEBSITE",
        "scanType": "QUICK",
        "frequency": "WEEKLY",
        "startDate": "2026-07-15",
        "startTime": "12:00",
        "timezone": "UTC",
        "isActive": True
    }
    response = client.post("/api/schedules", json=schedule_data, headers=headers)
    assert response.status_code == 201
    sched_json = response.json()
    assert sched_json["name"] == "Weekly Production Scan"
    assert sched_json["frequency"] == "WEEKLY"
    sched_id = sched_json["id"]

    # 2. Get schedules list
    list_response = client.get("/api/schedules", headers=headers)
    assert list_response.status_code == 200
    list_json = list_response.json()
    assert len(list_json) == 1
    assert list_json[0]["id"] == sched_id

    # 3. Patch the schedule status
    patch_response = client.patch(f"/api/schedules/{sched_id}", json={"isActive": False}, headers=headers)
    assert patch_response.status_code == 200
    assert patch_response.json()["isActive"] is False

    # 4. Delete the schedule
    delete_response = client.delete(f"/api/schedules/{sched_id}", headers=headers)
    assert delete_response.status_code == 204

    # 5. Verify list is empty
    empty_list_response = client.get("/api/schedules", headers=headers)
    assert empty_list_response.status_code == 200
    assert len(empty_list_response.json()) == 0


def test_teams_api_crud():
    # 1. Sign up an admin user
    unique_email = f"teamadmin-{uuid.uuid4().hex[:8]}@example.com"
    unique_company = f"Initech-{uuid.uuid4().hex[:8]}"
    signup_data = {
        "fullName": "Team Admin",
        "email": unique_email,
        "password": "securepassword123",
        "companyName": unique_company
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get initial team members (should have only 1: the admin)
    response = client.get("/api/teams", headers=headers)
    assert response.status_code == 200
    members = response.json()
    assert len(members) == 1
    assert members[0]["fullName"] == "Team Admin"

    # 3. Invite a developer team member
    invite_data = {
        "fullName": "Peter Gibbons",
        "email": f"peter-{uuid.uuid4().hex[:8]}@initech.com",
        "role": "Developer"
    }
    invite_res = client.post("/api/teams/invite", json=invite_data, headers=headers)
    assert invite_res.status_code == 201
    peter_json = invite_res.json()
    assert peter_json["fullName"] == "Peter Gibbons"
    assert peter_json["role"] == "Developer"
    peter_id = peter_json["id"]

    # 4. Get team list (should now have 2 members)
    response2 = client.get("/api/teams", headers=headers)
    assert len(response2.json()) == 2

    # 5. Patch role of Peter
    patch_res = client.patch(f"/api/teams/{peter_id}", json={"role": "Lead Developer"}, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["role"] == "Lead Developer"

    # 6. Delete Peter from the team
    delete_res = client.delete(f"/api/teams/{peter_id}", headers=headers)
    assert delete_res.status_code == 204

    # 7. Get team list (should be back to 1 member)
    response3 = client.get("/api/teams", headers=headers)
    assert len(response3.json()) == 1


def test_profile_and_password_update():
    # 1. Sign up an admin user
    unique_email = f"settings-{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "fullName": "Original Name",
        "email": unique_email,
        "password": "oldpassword123",
        "companyName": "Original Corp"
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    assert signup_res.status_code == 200
    token = signup_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update profile details
    profile_data = {
        "fullName": "Updated Name",
        "companyName": "Updated Corp",
        "role": "Security Director"
    }
    profile_res = client.put("/api/auth/profile", json=profile_data, headers=headers)
    assert profile_res.status_code == 200
    profile_json = profile_res.json()
    assert profile_json["fullName"] == "Updated Name"
    assert profile_json["companyName"] == "Updated Corp"
    assert profile_json["role"] == "Security Director"

    # 3. Try password update with incorrect current password
    pwd_data_fail = {
        "currentPassword": "wrongoldpassword",
        "newPassword": "newpassword123"
    }
    pwd_res_fail = client.put("/api/auth/password", json=pwd_data_fail, headers=headers)
    assert pwd_res_fail.status_code == 400

    # 4. Password update successfully
    pwd_data_success = {
        "currentPassword": "oldpassword123",
        "newPassword": "newpassword123"
    }
    pwd_res_success = client.put("/api/auth/password", json=pwd_data_success, headers=headers)
    assert pwd_res_success.status_code == 200

    # 5. Login with new password to verify
    login_data = {
        "email": unique_email,
        "password": "newpassword123"
    }
    login_res = client.post("/api/auth/login", json=login_data)
    assert login_res.status_code == 200
    assert "accessToken" in login_res.json()

