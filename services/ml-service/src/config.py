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

    # DeepSeek API - required, must be set via env
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Serper API - for web search and RSS discovery
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")

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

    # LLM Search
    GEMINI_SEARCH_MAX_RESULTS: int = 10  # kept for result limit usage

    # Query Generation
    DEFAULT_CONTENT_SOURCE: str = "search"
    MIN_QUERY_QUALITY_SCORE: float = 0.3

    # NATS Configuration
    NATS_URL: str = os.getenv("NATS_URL", "nats://localhost:4222")

    # Qdrant Configuration
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")

    # ML Model Configuration
    ML_MODEL: str = os.getenv("ML_MODEL", "all-MiniLM-L6-v2")
    ML_BATCH_SIZE: int = int(os.getenv("ML_BATCH_SIZE", "32"))

    # Cache TTLs (seconds)
    ML_CACHE_TTL_SEARCH: int = int(os.getenv("ML_CACHE_TTL_SEARCH", "300"))
    ML_CACHE_TTL_TRENDING: int = int(os.getenv("ML_CACHE_TTL_TRENDING", "900"))
    ML_CACHE_TTL_SUGGESTIONS: int = int(os.getenv("ML_CACHE_TTL_SUGGESTIONS", "3600"))

    # Redis for ML caching
    REDIS_ML_DB: int = int(os.getenv("REDIS_ML_DB", "2"))

    class Config:
        env_file = str(ENV_FILE)
        case_sensitive = True
        extra = "ignore"  # tolerate deprecated env vars (e.g. GEMINI_API_KEY)


settings = Settings()
config = settings  # Alias for backwards compatibility
