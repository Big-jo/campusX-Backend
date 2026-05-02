"""
Search-based content source.
Uses Gemini-generated queries + Serper for content discovery.
"""

import logging
from typing import List, Dict
from src.search.content_source import ContentSource
from src.search.query_manager import get_query_manager
from src.search.query_tracker import get_query_tracker
from src.search.query_generator import get_query_generator
from src.search.serper_searcher import get_serper_searcher

logger = logging.getLogger(__name__)


class SearchSource(ContentSource):
    """
    Content source that uses Gemini-generated search queries + Serper.
    """

    def __init__(self):
        self.query_manager = get_query_manager()
        self.query_tracker = get_query_tracker()
        self.query_generator = get_query_generator()
        self.serper_searcher = get_serper_searcher()

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Search for content URLs using query-based approach.

        Args:
            interest_category: Interest category name
            keywords: Additional keywords (optional)
            limit: Max results to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        try:
            # Step 1: Get existing query for category
            query_text = self.query_manager.get_query_for_category(interest_category)

            # Step 2: Generate new query if none exists
            if not query_text:
                logger.info(f"No query found for {interest_category}, generating...")
                query_text = self.query_generator.generate_query_for_category(
                    interest_category, keywords
                )
                # Store generated query
                self.query_manager.store_query(
                    query_text=query_text,
                    category=interest_category,
                    generated_via="deepseek"
                )

            logger.info(f"Using query for '{interest_category}': {query_text}")

            # Step 3: Execute query via Serper
            results = self.serper_searcher.execute_query(query_text, limit)

            # Step 4: Track performance
            if results:
                self.query_tracker.track_search_success(query_text, len(results))
                logger.info(f"Search successful: {len(results)} results")
            else:
                self.query_tracker.track_search_failure(query_text, "No results")
                logger.warning(f"Search returned no results for: {query_text}")

            return results

        except Exception as e:
            logger.error(f"Search failed for {interest_category}: {e}", exc_info=True)
            return []


# Singleton
_search_source = None


def get_search_source() -> SearchSource:
    """Get or create search source singleton"""
    global _search_source
    if _search_source is None:
        _search_source = SearchSource()
    return _search_source
