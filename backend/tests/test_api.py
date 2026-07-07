import pytest
import uuid
from fastapi.testclient import TestClient
from main import app
from database.session import SessionLocal, Base, engine
from database.models import User, Asset, Scan

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Make sure all tables are created
    Base.metadata.create_all(bind=engine)
    yield

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

    # 2. Test get statistics (should have 128 seeded scans immediately!)
    stats_response = client.get("/api/dashboard/scan-summary", headers=headers)
    assert stats_response.status_code == 200
    stats_json = stats_response.json()
    assert stats_json["total"] == 128
    assert stats_json["completed"] == 94
    assert stats_json["running"] == 8
    assert stats_json["queued"] == 5
    assert stats_json["failed"] == 21

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
    # 128 seeded + 1 newly added = 129 scans total
    assert list_json["total"] == 129
    
    # New scan should be the first item (newest) due to createdAt sorting
    scan_id = list_json["data"][0]["id"]
    assert list_json["data"][0]["target"]["url"] == "https://newtarget.com"
    assert list_json["data"][0]["status"] == "QUEUED"

    # 3. Test progress endpoint
    prog_res = client.get(f"/api/scans/{scan_id}/progress", headers=headers)
    assert prog_res.status_code == 200
    assert prog_res.json()["scanId"] == scan_id
    assert prog_res.json()["status"] == "QUEUED"
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

