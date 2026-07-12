import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database.session import SessionLocal
from backend.database.models import User

db = SessionLocal()
users = db.query(User).all()
print(f"Total users in DB: {len(users)}")
for u in users:
    print(f"ID: {u.id}, Name: {u.fullName}, Email: {u.email}, Company: {u.companyName}")
db.close()
