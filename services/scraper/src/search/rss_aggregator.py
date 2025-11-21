import logging
import feedparser
from typing import List, Dict
from datetime import datetime, timedelta
from urllib.parse import urlparse
from src.search.content_source import ContentSource

logger = logging.getLogger(__name__)

# Curated Nigerian and African tech/news RSS feeds
NIGERIAN_RSS_FEEDS = {
    "technology": [
        "https://techcabal.com/feed/",
        "https://techpoint.africa/feed/",
        "https://technext.ng/feed/",
        "https://techeconomy.ng/feed/",
        "https://disrupt-africa.com/feed/",
    ],
    "business": [
        "https://nairametrics.com/feed/",
        "https://businessday.ng/feed/",
        "https://www.ventures-africa.com/feed/",
    ],
    "news": [
        "https://www.thecable.ng/feed",
        "https://www.premiumtimesng.com/feed",
        "https://punchng.com/feed/",
        "https://www.vanguardngr.com/feed/",
    ],
    "startup": [
        "https://techcabal.com/category/startup/feed/",
        "https://techpoint.africa/category/startups/feed/",
    ],
    "finance": [
        "https://nairametrics.com/category/economy/feed/",
        "https://businessday.ng/category/markets/feed/",
    ],
}


class RSSAggregator(ContentSource):
    """
    Aggregate content from Nigerian RSS feeds
    """

    def __init__(self):
        self.feeds = NIGERIAN_RSS_FEEDS

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get recent articles from RSS feeds matching interest category

        Args:
            interest_category: Interest category name
            keywords: Keywords to filter articles (optional)
            limit: Maximum URLs to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        # Map interest category to feed categories
        category = self._map_category(interest_category)

        # Get feeds for this category
        feed_urls = self.feeds.get(category, [])

        # Fallback to all tech feeds if category not found
        if not feed_urls and category != "technology":
            feed_urls = self.feeds.get("technology", [])

        logger.info(f"Fetching {len(feed_urls)} RSS feeds for {interest_category}")

        # Collect articles from all feeds
        all_articles = []
        for feed_url in feed_urls:
            articles = self._fetch_feed(feed_url, keywords)
            all_articles.extend(articles)

        # Sort by published date (newest first)
        all_articles.sort(key=lambda x: x.get("published", 0), reverse=True)

        # Remove duplicates by URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article["url"] not in seen_urls:
                seen_urls.add(article["url"])
                unique_articles.append(article)

        # Return top N
        results = unique_articles[:limit]

        logger.info(f"Found {len(results)} unique articles from RSS feeds")

        return results

    def _fetch_feed(self, feed_url: str, keywords: List[str]) -> List[Dict[str, str]]:
        """
        Fetch and parse single RSS feed

        Args:
            feed_url: RSS feed URL
            keywords: Keywords to filter (optional)

        Returns:
            List of articles
        """
        try:
            # Parse RSS feed
            feed = feedparser.parse(feed_url)

            if feed.bozo and not feed.entries:
                logger.warning(f"Failed to parse feed: {feed_url}")
                return []

            articles = []

            # Filter recent articles (last 30 days)
            cutoff_date = datetime.now() - timedelta(days=30)

            for entry in feed.entries[:20]:  # Limit per feed
                try:
                    # Get URL
                    url = entry.get("link")
                    if not url:
                        continue

                    # Get title
                    title = entry.get("title", "")

                    # Get published date
                    published = entry.get("published_parsed") or entry.get("updated_parsed")
                    published_dt = datetime(*published[:6]) if published else datetime.now()

                    # Skip old articles
                    if published_dt < cutoff_date:
                        continue

                    # Filter by keywords (if provided)
                    if keywords:
                        text = (title + " " + entry.get("summary", "")).lower()
                        if not any(keyword.lower() in text for keyword in keywords):
                            continue

                    articles.append({
                        "url": url,
                        "title": title,
                        "published": published_dt.timestamp(),
                    })

                except Exception as e:
                    logger.warning(f"Failed to parse entry from {feed_url}: {e}")
                    continue

            logger.info(f"Fetched {len(articles)} articles from {feed_url}")
            return articles

        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {feed_url}: {e}")
            return []

    def _map_category(self, interest_category: str) -> str:
        """
        Map interest category to RSS feed category

        Args:
            interest_category: User's interest category

        Returns:
            RSS feed category key
        """
        category_lower = interest_category.lower()

        # Direct matches
        if category_lower in self.feeds:
            return category_lower

        # Fuzzy matches
        if any(word in category_lower for word in ["tech", "software", "ai", "crypto"]):
            return "technology"
        elif any(word in category_lower for word in ["business", "economy"]):
            return "business"
        elif any(word in category_lower for word in ["startup", "entrepreneur"]):
            return "startup"
        elif any(word in category_lower for word in ["finance", "investment", "stock"]):
            return "finance"
        elif any(word in category_lower for word in ["news", "politics", "current"]):
            return "news"

        # Default to technology
        return "technology"

    def add_feed(self, category: str, feed_url: str):
        """Add a new RSS feed to a category"""
        if category not in self.feeds:
            self.feeds[category] = []

        if feed_url not in self.feeds[category]:
            self.feeds[category].append(feed_url)
            logger.info(f"Added feed {feed_url} to {category}")


# Global instance
_aggregator = None


def get_rss_aggregator() -> RSSAggregator:
    """Get or create RSSAggregator singleton"""
    global _aggregator
    if _aggregator is None:
        _aggregator = RSSAggregator()
    return _aggregator
