import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

# Get the .env file path relative to this config file
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    # MongoDB - set via env (Railway) or .env (local)
    MONGO_URI: str = os.getenv("MONGO_URI", "")

    # Redis - set via env (Railway) or .env (local)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/1")

    # Gemini API - required, must be set via env
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Google Cloud Storage - set via env (Railway) or .env (local)
    GCS_PROJECT_ID: str = os.getenv("GCS_PROJECT_ID", "")
    GCS_BUCKET: str = os.getenv("GCS_BUCKET", "")
    GCS_SERVICE_ACCOUNT_KEY: Optional[str] = None
    GCS_PUBLIC_URL: Optional[str] = None

    # Scraper settings - optional with defaults
    SCRAPER_USER_AGENT: str = "CampusX-Bot/1.0 (+https://campusx.com/bot)"
    SCRAPER_RATE_LIMIT_DELAY: float = 5.0
    SCRAPER_MAX_RETRIES: int = 3
    SCRAPER_TIMEOUT: int = 30

    # Content quality thresholds
    MIN_WORD_COUNT: int = 100
    MIN_QUALITY_SCORE: float = 0.5

    # Gemini Search
    GEMINI_SEARCH_MAX_RESULTS: int = 10

    class Config:
        env_file = str(ENV_FILE)
        case_sensitive = True


settings = Settings()
