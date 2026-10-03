from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator, Optional
from app.config import settings

# Create engine. check_same_thread is needed only for SQLite.
db_url = settings.sqlalchemy_database_url
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session per request and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_supabase_client():
    """Optional Supabase Python client if credentials are configured."""
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except ImportError:
            return None
    return None


def init_db():
    """Initializes tables and ensures a default demo shop exists."""
    from app.models.shop import Shop
    # Create all tables defined in models
    Base.metadata.create_all(bind=engine)
    
    # Ensure default demo shop (id=1) exists
    db = SessionLocal()
    try:
        shop = db.query(Shop).filter(Shop.id == 1).first()
        if not shop:
            shop = Shop(id=1, name="Kadai Main Shop")
            db.add(shop)
            db.commit()
    finally:
        db.close()
