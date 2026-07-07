import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database.models import Asset, Scan, ScanJob, ScanModule

def seed_user_data(db: Session, user_id: str):
    # 1. Create a few default assets for the user
    assets = [
        Asset(name="example.com", url="https://example.com", type="WEBSITE", userId=user_id),
        Asset(name="api.acme.com", url="https://api.acme.com/v1", type="WEBSITE", userId=user_id),
        Asset(name="github.com/acme/app", url="https://github.com/acme/app", type="REPOSITORY", userId=user_id)
    ]
    
    for asset in assets:
        db.add(asset)
    db.commit()
    
    # 2. Setup distribution counts: 94 completed, 8 running, 5 queued, 21 failed (total 128)
    statuses = (
        ["COMPLETED"] * 94 +
        ["RUNNING"] * 8 +
        ["QUEUED"] * 5 +
        ["FAILED"] * 21
    )
    
    # Shuffle statuses to distribute them randomly across time
    random.seed(42)  # Fixed seed for repeatable statistics
    random.shuffle(statuses)
    
    scan_types = ["QUICK", "SSL", "OWASP", "DEEP", "REPOSITORY", "API_SECURITY"]
    
    now = datetime.now(timezone.utc)
    
    for i, status in enumerate(statuses):
        # Determine scan type based on asset type
        asset = random.choice(assets)
        if asset.type == "REPOSITORY":
            scan_type = "REPOSITORY"
        else:
            scan_type = random.choice([t for t in scan_types if t != "REPOSITORY"])
            
        # Realistic timestamp subtraction
        time_offset = timedelta(days=random.randint(0, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        created_at = now - time_offset
        
        # Determine score
        score = None
        if status == "COMPLETED":
            score = random.randint(65, 98)
        elif status == "FAILED":
            # Failed scans can optionally have low scores or none
            if random.random() > 0.5:
                score = random.randint(30, 48)
                
        # Determine duration
        duration = None
        if status in ["COMPLETED", "FAILED"]:
            duration = random.randint(60, 1800) # 1 min to 30 mins
        elif status == "RUNNING":
            duration = random.randint(10, 200) # running time so far
            
        # Target friendly name
        scan_name = f"{asset.name} - {scan_type.replace('_', ' ').title()}"
        
        scan = Scan(
            status=status,
            scanType=scan_type,
            score=score,
            duration=duration,
            scanName=scan_name,
            scanTags="production,web" if i % 4 == 0 else "staging",
            assetId=asset.id,
            createdAt=created_at,
            updatedAt=created_at + timedelta(seconds=duration) if duration else created_at
        )
        db.add(scan)
        db.flush() # Populate scan.id
        
        # For queued or running scans, add a Scan Job
        if status in ["QUEUED", "RUNNING"]:
            job_status = "PROCESSING" if status == "RUNNING" else "PENDING"
            job = ScanJob(
                scanId=scan.id,
                status=job_status,
                createdAt=created_at
            )
            db.add(job)
            
        # Seed default modules
        modules_list = ["crawling", "auth", "proxy", "performance", "exclusions", "headers"]
        for mod_name in modules_list:
            module = ScanModule(
                scanId=scan.id,
                name=mod_name,
                config="{}"
            )
            db.add(module)
            
    db.commit()
