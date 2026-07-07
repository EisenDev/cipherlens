from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from core.config import settings

# Adjust DATABASE_URL if it has a schema query parameter that SQLAlchemy doesn't support
database_url = settings.DATABASE_URL
if "?schema=" in database_url:
    database_url = database_url.split("?schema=")[0]

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
