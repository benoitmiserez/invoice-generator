from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite database file
DATABASE_URL = "sqlite:///./invoice_generator.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    # Migration: add payment_term to parties if missing (existing DBs)
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(parties)"))
        columns = [row[1] for row in result]
        if "payment_term" not in columns:
            conn.execute(text(
                "ALTER TABLE parties ADD COLUMN payment_term VARCHAR DEFAULT '30 days'"
            ))
            conn.commit()

