"""
Unified interface for content discovery sources.
Allows easy swapping between Gemini, RSS, Google Search, etc.
"""

import logging
from typing import List, Dict
from enum import Enum

logger = logging.getLogger(__name__)


class SourceType(str, Enum):
    """Available content source types"""
    RSS = "rss"
    GEMINI = "gemini"
    SERPER = "serper"
    GOOGLE = "google"  # Future (deprecated in favor of SERPER)


class ContentSource:
    """
    Abstract interface for content discovery sources.
    All sources must implement the search() method.
    """

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Search for content URLs

        Args:
            interest_category: Interest category name
            keywords: Keywords to filter/search
            limit: Max results to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        raise NotImplementedError


def get_content_source(source_type: SourceType = SourceType.RSS) -> ContentSource:
    """
    Factory function to get content source by type

    Args:
        source_type: Type of source to use

    Returns:
        ContentSource instance
    """
    if source_type == SourceType.RSS:
        from src.search.rss_aggregator import get_rss_aggregator
        return get_rss_aggregator()

    elif source_type == SourceType.GEMINI:
        from src.search.gemini_searcher import get_searcher
        return get_searcher()

    elif source_type == SourceType.SERPER:
        from src.search.serper_searcher import get_serper_searcher
        return get_serper_searcher()

    else:
        raise ValueError(f"Unknown source type: {source_type}")


# Default source (can be changed via config later)
DEFAULT_SOURCE = SourceType.RSS
