"""Pipeline configuration and stage definitions"""

from enum import Enum
from typing import Dict, Any
from dataclasses import dataclass


class PipelineStage(str, Enum):
    """Pipeline processing stages"""
    DISCOVERY = "discovery"
    SCRAPE = "scrape"
    ENRICH = "enrich"
    STORE = "store"
    PUBLISH = "publish"


class PipelineStatus(str, Enum):
    """Content status in pipeline"""
    PENDING = "pending"
    PROCESSING = "processing"
    ENRICHED = "enriched"
    PUBLISHED = "published"
    FAILED = "failed"
    REJECTED = "rejected"


@dataclass
class PipelineConfig:
    """Pipeline configuration"""

    # Retry policies
    max_retries: int = 3
    retry_delay: float = 5.0  # seconds
    exponential_backoff: bool = True

    # Quality gates
    min_quality_score: float = 0.5
    min_word_count: int = 100
    max_word_count: int = 5000

    # Processing limits
    batch_size: int = 10
    max_concurrent_scrapes: int = 5
    enrichment_batch_size: int = 5

    # Timeouts
    scrape_timeout: int = 30
    enrichment_timeout: int = 60

    # Feature flags
    enable_gcs_upload: bool = False
    enable_enrichment: bool = True
    enable_deduplication: bool = True

    # Content filtering
    blocked_domains: list = None
    required_categories: list = None

    def __post_init__(self):
        if self.blocked_domains is None:
            self.blocked_domains = [
                "facebook.com",
                "twitter.com",
                "instagram.com",
                "tiktok.com",
                "youtube.com"
            ]
        if self.required_categories is None:
            self.required_categories = []


# Default configuration
DEFAULT_CONFIG = PipelineConfig()
