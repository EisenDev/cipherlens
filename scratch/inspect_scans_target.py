import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database.session import SessionLocal
from backend.database.models import Scan, Asset

db = SessionLocal()
assets = db.query(Asset).filter(Asset.url == "https://atelier-staging.zeraynce.com/").all()
print(f"Matching assets: {len(assets)}")
for asset in assets:
    print(f"Asset ID: {asset.id}, Name: {asset.name}, User ID: {asset.userId}")
    scans = db.query(Scan).filter(Scan.assetId == asset.id).order_by(Scan.createdAt.desc()).all()
    print(f"Total scans for this asset: {len(scans)}")
    for scan in scans:
        print(f"  Scan ID: {scan.id}")
        print(f"  Status: {scan.status}")
        print(f"  Scan Type: {scan.scanType}")
        print(f"  Scan Name: {scan.scanName}")
        print(f"  Created At: {scan.createdAt}")
        print(f"  Started At: {scan.startedAt}")
        print(f"  Job ID: {scan.jobId}")
        print("-" * 20)
db.close()
