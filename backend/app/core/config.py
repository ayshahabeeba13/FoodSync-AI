import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "FoodSync AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    # Database: Primary is PostgreSQL 15+
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/foodsync_db"
    SQLITE_FALLBACK_URL: str = "sqlite:///./data/foodsync_test.db"

    # Security
    JWT_SECRET: str = "super-secure-foodsync-ai-secret-key-min-32-chars-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    # Demo Mode
    DEMO_MODE: bool = True

    # FSSAI Food Safety Standards
    REGULATORY_STANDARD: str = "FSSAI_SURPLUS_2019"
    FSSAI_CHILLED_TEMP_MAX: float = 5.0
    FSSAI_HOT_HOLDING_TEMP_MIN: float = 65.0

settings = Settings()
