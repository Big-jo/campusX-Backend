import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

# Get the .env file path relative to this config file
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    # MongoDB - required, must be set via env
    MONGO_URI: str

    # Redis - required, must be set via env
    REDIS_URL: str

    # Gemini API - required, must be set via env
    GEMINI_API_KEY: str

    # Google Cloud Storage - required, must be set via env
    GCS_PROJECT_ID: str
    GCS_BUCKET: str
    GCS_SERVICE_ACCOUNT_KEY: Optional[str] = None  # Path to key file, or None if using default credentials
    GCS_PUBLIC_URL: Optional[str] = None

    # Scraper settings - optional with defaults
    SCRAPER_USER_AGENT: str
    SCRAPER_RATE_LIMIT_DELAY: float = 5.0  # Seconds between requests to same domain
    SCRAPER_MAX_RETRIES: int = 3
    SCRAPER_TIMEOUT: int = 30  # Seconds

    # Content quality thresholds
    MIN_WORD_COUNT: int = 100
    MIN_QUALITY_SCORE: float = 0.5

    # Gemini Search
    GEMINI_SEARCH_MAX_RESULTS: int = 10

    class Config:
        env_file = str(ENV_FILE)
        case_sensitive = True


settings = Settings()
