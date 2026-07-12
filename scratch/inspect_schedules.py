import sys
import os
import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database.session import SessionLocal
from backend.database.models import ScanSchedule

db = SessionLocal()
schedules = db.query(ScanSchedule).all()
print(f"Total schedules: {len(schedules)}")
for s in schedules:
    print(f"ID: {s.id}")
    print(f"Name: {s.name}")
    print(f"Target: {s.targetUrl}")
    print(f"Frequency: {s.frequency}")
    print(f"Start Date: {s.startDate}")
    print(f"Start Time: {s.startTime}")
    print(f"Timezone: {s.timezone}")
    print(f"Is Active: {s.isActive}")
    print(f"Last Run: {s.lastRunAt}")
    print(f"Created At: {s.createdAt}")
    
    # Evaluate due
    try:
        dt_str = f"{s.startDate} {s.startTime}"
        sched_dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    except Exception as e:
        print(f"Error parsing date/time: {e}")
        continue
        
    tz_map = {
        "UTC": 0,
        "GMT": 0,
        "PHT": 8,
        "EST": -5,
        "PST": -8
    }
    offset_hours = tz_map.get(s.timezone, 0)
    sched_dt_utc = sched_dt - datetime.timedelta(hours=offset_hours)
    now_utc = datetime.datetime.utcnow()
    
    print(f"sched_dt: {sched_dt}")
    print(f"sched_dt_utc: {sched_dt_utc}")
    print(f"now_utc: {now_utc}")
    print(f"now_utc < sched_dt_utc: {now_utc < sched_dt_utc}")
    
    # Check time of day
    time_of_day_check = now_utc.time() < sched_dt_utc.time() and now_utc.date() == sched_dt_utc.date()
    print(f"time_of_day_check (should be False to be due): {time_of_day_check}")
    
    # Check frequency
    last_run = s.lastRunAt
    due = False
    if last_run is None:
        due = True
    elif s.frequency == "ONCE":
        due = last_run is None
    elif s.frequency == "DAILY":
        delta = now_utc - last_run
        due = delta.total_seconds() >= 82800
        print(f"Daily delta: {delta.total_seconds()} seconds")
        
    print(f"Is due evaluation: {due and now_utc >= sched_dt_utc and not time_of_day_check}")
    print("-" * 40)
db.close()
