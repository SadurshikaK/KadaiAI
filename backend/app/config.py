import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "KadaiAI Backend API"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database connection string
    # Supabase provides PostgreSQL. If not set, defaults to local SQLite for instant development/testing.
    DATABASE_URL: str = "sqlite:///./kadai.db"
    
    # Supabase API (optional / future)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # CORS Origins (comma-separated or * for development)
    CORS_ORIGINS: str = "*"
    
    # Timezone (Sri Lanka is UTC+5:30)
    TIMEZONE: str = "Asia/Colombo"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    @property
    def sqlalchemy_database_url(self) -> str:
        """Fixes postgres:// URI prefix to postgresql:// for SQLAlchemy compatibility."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
