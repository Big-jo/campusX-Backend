"""
RSS aggregator that dynamically loads feeds from MongoDB.
Feeds are discovered via Serper and stored with quality tracking.
"""

import logging
import feedparser
from typing import List, Dict
from datetime import datetime, timedelta
from src.search.content_source import ContentSource
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.feed_manager.feed_tracker import get_feed_tracker
import google.generativeai as genai
from src.config import settings

logger = logging.getLogger(__name__)

# Initialize Gemini for content filtering
genai.configure(api_key=settings.GEMINI_API_KEY)


class RSSAggregator(ContentSource):
    """
    Aggregate content from RSS feeds dynamically loaded from MongoDB.
    Supports quality tracking and Gemini-powered filtering.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.feed_tracker = get_feed_tracker()
        self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get recent articles from RSS feeds matching interest category.

        Args:
            interest_category: Interest category name (matches bot's botType)
            keywords: Keywords to filter articles (optional)
            limit: Maximum URLs to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        logger.info(f"RSS search: category='{interest_category}', keywords={keywords}")

        # Get feed URLs from MongoDB for this category
        feed_urls = self._get_feeds_for_category(interest_category)

        if not feed_urls:
            logger.warning(f"No feeds found for category: {interest_category}")
            return []

        logger.info(f"Found {len(feed_urls)} active feeds for {interest_category}")

        # Collect articles from all feeds
        all_articles = []
        for feed_url in feed_urls:
            articles = self._fetch_feed(feed_url, keywords)
            all_articles.extend(articles)

        if not all_articles:
            logger.warning(f"No articles found from any feed for {interest_category}")
            return []

        # Use Gemini to rank/filter articles by relevance (if keywords provided)
        if keywords:
            all_articles = self._rank_articles_by_relevance(
                all_articles, interest_category, keywords
            )

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

        logger.info(f"Returning {len(results)} unique articles")

        return results

    def _get_feeds_for_category(self, category_name: str, min_quality: float = 0.3) -> List[str]:
        """
        Get active, quality feeds for a category from MongoDB.

        Args:
            category_name: Category name (e.g., "Technology")
            min_quality: Minimum quality score

        Returns:
            List of feed URLs
        """
        try:
            # Get feeds that match category name (either as main category or topic)
            feeds = self.feed_tracker.get_active_feeds(
                category=category_name,
                min_quality=min_quality
            )

            # Extract URLs
            feed_urls = [feed["url"] for feed in feeds]

            logger.info(
                f"Loaded {len(feed_urls)} feeds for '{category_name}' "
                f"(min_quality={min_quality})"
            )

            return feed_urls

        except Exception as e:
            logger.error(f"Failed to load feeds for {category_name}: {e}")
            return []

    def _fetch_feed(self, feed_url: str, keywords: List[str]) -> List[Dict[str, str]]:
        """
        Fetch and parse single RSS feed with quality tracking.

        Args:
            feed_url: RSS feed URL
            keywords: Keywords to filter (optional)

        Returns:
            List of articles
        """
        try:
            logger.info(f"Fetching feed: {feed_url}")

            # Parse RSS feed
            feed = feedparser.parse(feed_url)

            if feed.bozo and not feed.entries:
                logger.warning(f"Failed to parse feed: {feed_url}")
                # Track failure
                self.feed_tracker.track_fetch_failure(
                    feed_url, f"Parse error: {feed.bozo_exception}"
                )
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

            # Track success
            self.feed_tracker.track_fetch_success(feed_url, len(articles))

            logger.info(f"Fetched {len(articles)} articles from {feed_url}")
            return articles

        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {feed_url}: {e}")
            # Track failure
            self.feed_tracker.track_fetch_failure(feed_url, str(e))
            return []

    def _rank_articles_by_relevance(
        self, articles: List[Dict[str, str]], interest_category: str, keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Use Gemini to score article relevance and filter low-quality content.

        Args:
            articles: List of articles with url, title
            interest_category: Interest category
            keywords: Keywords

        Returns:
            Filtered and scored articles
        """
        if not articles or len(articles) <= 3:
            return articles

        try:
            # Prepare article summaries for Gemini
            article_summaries = []
            for i, article in enumerate(articles[:20]):  # Limit to 20 for token efficiency
                article_summaries.append(f"{i}. {article['title']}")

            keywords_str = ", ".join(keywords[:5]) if keywords else "general"
            articles_text = "\n".join(article_summaries)

            prompt = f"""Score these articles for relevance to "{interest_category}" with keywords [{keywords_str}].

Articles:
{articles_text}

Return only the article numbers (0-indexed) that are HIGHLY RELEVANT, comma-separated.
Example: 0,2,5,8
Exclude clickbait, spam, or off-topic articles."""

            response = self.gemini_model.generate_content(prompt)

            # Parse relevant article indices
            try:
                relevant_indices = [int(i.strip()) for i in response.text.strip().split(",")]
                # Filter articles
                filtered = [articles[i] for i in relevant_indices if i < len(articles)]

                logger.info(f"Gemini filtered {len(articles)} -> {len(filtered)} articles")
                return filtered if filtered else articles[:10]

            except ValueError:
                logger.warning("Failed to parse Gemini ranking response")
                return articles

        except Exception as e:
            logger.error(f"Gemini article ranking failed: {e}")
            return articles


# Global instance
_aggregator = None


def get_rss_aggregator() -> RSSAggregator:
    """Get or create RSSAggregator singleton"""
    global _aggregator
    if _aggregator is None:
        _aggregator = RSSAggregator()
    return _aggregator
