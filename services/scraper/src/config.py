import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017/campusx"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/1"

    # Gemini API
    GEMINI_API_KEY: str

    # Google Cloud Storage
    GCS_PROJECT_ID: str
    GCS_BUCKET: str
    GCS_SERVICE_ACCOUNT_KEY: str | None = None  # Path to key file, or None if using default credentials
    GCS_PUBLIC_URL: str | None = None

    # Scraper settings
    SCRAPER_USER_AGENT: str = "CampusX-Bot/1.0 (+https://campusx.com/bot)"
    SCRAPER_RATE_LIMIT_DELAY: float = 5.0  # Seconds between requests to same domain
    SCRAPER_MAX_RETRIES: int = 3
    SCRAPER_TIMEOUT: int = 30  # Seconds

    # Content quality thresholds
    MIN_WORD_COUNT: int = 100
    MIN_QUALITY_SCORE: float = 0.5

    # Gemini Search
    GEMINI_SEARCH_MAX_RESULTS: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
