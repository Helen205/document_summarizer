from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from loguru import logger

from app.core.config import settings

# Veritabanı URL'sini al
DATABASE_URL = settings.DATABASE_URL

# Engine oluştur
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    #pool_size=10,
   # max_overflow=20
)

# SessionLocal sınıfı oluştur
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base sınıfı oluştur
Base = declarative_base()

def get_db():
    """Veritabanı oturumu sağla"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    """Veritabanını başlat"""
    try:
        # Tüm tabloları oluştur
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise 