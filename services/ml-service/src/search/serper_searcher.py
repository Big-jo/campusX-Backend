"""
Serper API integration for web search and RSS discovery.
Uses Google Search API via Serper.dev
"""

import logging
import requests
from typing import List, Dict, Optional
from src.config import settings
from src.search.content_source import ContentSource

logger = logging.getLogger(__name__)


class SerperSearcher(ContentSource):
    """
    Serper API searcher for discovering RSS feeds and content URLs.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.SERPER_API_KEY
        self.base_url = "https://google.serper.dev/search"
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        })

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Search for content URLs using Serper API.

        Args:
            interest_category: Interest category name
            keywords: Additional keywords
            limit: Max results

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        try:
            # Generate search query
            query = self._generate_query(interest_category, keywords)
            logger.info(f"Serper search: {query}")

            # Search
            results = self._search_web(query, limit)

            # Filter and format
            urls = self._extract_urls(results)

            logger.info(f"Serper found {len(urls)} results for '{query}'")
            return urls[:limit]

        except Exception as e:
            logger.error(f"Serper search failed: {e}", exc_info=True)
            return []

    def discover_rss_feeds(
        self, interest_category: str, limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Discover RSS feeds for a given interest category.

        Args:
            interest_category: Interest category name
            limit: Max feeds to discover

        Returns:
            List of dicts with 'url' (RSS feed URL) and 'title' keys
        """
        try:
            # Generate RSS-specific query targeting actual feed content
            query = f'"{interest_category}" (inurl:feed OR inurl:rss OR inurl:atom) filetype:xml'
            logger.info(f"RSS discovery query: {query}")

            # Search
            results = self._search_web(query, limit)

            # Extract RSS URLs
            rss_feeds = self._extract_rss_urls(results)

            logger.info(
                f"Discovered {len(rss_feeds)} RSS feeds for '{interest_category}'"
            )
            return rss_feeds

        except Exception as e:
            logger.error(f"RSS discovery failed: {e}", exc_info=True)
            return []

    def _generate_query(self, interest_category: str, keywords: List[str]) -> str:
        """
        Generate optimized search query.

        Args:
            interest_category: Interest category
            keywords: Additional keywords

        Returns:
            Search query string
        """
        # Base query with category
        query_parts = [interest_category]

        # Add keywords
        if keywords:
            query_parts.extend(keywords[:3])  # Limit to 3 keywords

        # Add filters for quality content
        # query_parts.append("article OR news")

        return " ".join(query_parts)

    def _search_web(self, query: str, num_results: int = 10) -> Dict:
        """
        Execute web search via Serper API.

        Args:
            query: Search query
            num_results: Number of results

        Returns:
            API response dict
        """
        try:
            payload = {
                "q": query,
                "num": num_results,
                "gl": "ng",  # Nigeria geo-location
                "hl": "en"   # English language
            }

            response = self.session.post(
                self.base_url,
                json=payload,
                timeout=10
            )
            response.raise_for_status()

            return response.json()

        except requests.RequestException as e:
            logger.error(f"Serper API request failed: {e}")
            raise

    def _extract_urls(self, results: Dict) -> List[Dict[str, str]]:
        """
        Extract URLs from Serper results.

        Args:
            results: Serper API response

        Returns:
            List of dicts with 'url' and 'title'
        """
        urls = []

        # Organic results
        for item in results.get("organic", []):
            url = item.get("link")
            title = item.get("title", "")

            if url and self._is_valid_url(url):
                urls.append({
                    "url": url,
                    "title": title,
                    "snippet": item.get("snippet", "")
                })

        return urls

    def _extract_rss_urls(self, results: Dict) -> List[Dict[str, str]]:
        """
        Extract RSS feed URLs from Serper results.

        Args:
            results: Serper API response

        Returns:
            List of dicts with RSS 'url' and 'title'
        """
        rss_feeds = []

        for item in results.get("organic", []):
            url = item.get("link")
            title = item.get("title", "")

            # Check if URL looks like RSS feed
            if url and self._is_rss_url(url):
                rss_feeds.append({
                    "url": url,
                    "title": title,
                    "source": item.get("displayedLink", "")
                })

        return rss_feeds

    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid and not blocked"""
        blocked_domains = [
            "facebook.com",
            "twitter.com",
            "instagram.com",
            "youtube.com",
            "tiktok.com",
        ]

        # Check blocked domains
        for domain in blocked_domains:
            if domain in url.lower():
                return False

        return url.startswith("http")

    def _is_rss_url(self, url: str) -> bool:
        """Check if URL looks like an RSS feed"""
        rss_indicators = [".rss", ".xml", "/rss", "/feed", "/atom"]
        url_lower = url.lower()

        return any(indicator in url_lower for indicator in rss_indicators)


# Singleton
_searcher = None


def get_serper_searcher(api_key: str = None) -> SerperSearcher:
    """Get or create Serper searcher singleton"""
    global _searcher
    if _searcher is None:
        _searcher = SerperSearcher(api_key)
    return _searcher
