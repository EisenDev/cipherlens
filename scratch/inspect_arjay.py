import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database.session import SessionLocal
from backend.database.models import User, Asset, ScanSchedule, Scan

db = SessionLocal()
arjay = db.query(User).filter(User.email == "arjay@gmail.com").first()
if arjay:
    print(f"Arjay User ID: {arjay.id}")
    assets = db.query(Asset).filter(Asset.userId == arjay.id).all()
    print(f"Arjay's Assets: {len(assets)}")
    for a in assets:
        print(f"  Asset: {a.url} (ID: {a.id})")
    schedules = db.query(ScanSchedule).filter(ScanSchedule.userId == arjay.id).all()
    print(f"Arjay's Schedules: {len(schedules)}")
    for s in schedules:
        print(f"  Schedule: {s.name} (ID: {s.id})")
        print(f"    Target: {s.targetUrl}")
        print(f"    Frequency: {s.frequency}")
        print(f"    Start Date/Time: {s.startDate} {s.startTime}")
        print(f"    Timezone: {s.timezone}")
        print(f"    Is Active: {s.isActive}")
        print(f"    Last Run: {s.lastRunAt}")
else:
    print("User arjay@gmail.com not found!")
db.close()
