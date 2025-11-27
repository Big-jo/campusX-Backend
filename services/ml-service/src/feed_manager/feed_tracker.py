"""
RSS feed quality tracking and management.
Tracks feed health, success rates, and auto-disables low-quality feeds.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import feedparser
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class FeedTracker:
    """
    Tracks RSS feed quality and health.
    Manages feed lifecycle: discovery → validation → monitoring → deactivation
    """

    def __init__(self):
        self.db = get_sync_db()
        self.collection = self.db[COLLECTIONS.get("rss_sources", "rsssources")]

    def track_fetch_success(self, feed_url: str, article_count: int):
        """
        Record successful feed fetch.

        Args:
            feed_url: RSS feed URL
            article_count: Number of articles fetched
        """
        try:
            feed = self.collection.find_one({"url": feed_url})
            if not feed:
                logger.warning(f"Feed not found for tracking: {feed_url}")
                return

            # Update stats
            metadata = feed.get("metadata", {})
            stats = metadata.get("stats", {
                "total_fetches": 0,
                "successful_fetches": 0,
                "failed_fetches": 0,
                "total_articles": 0,
                "avg_articles_per_fetch": 0.0,
            })

            stats["total_fetches"] += 1
            stats["successful_fetches"] += 1
            stats["total_articles"] += article_count

            # Update average
            if stats["successful_fetches"] > 0:
                stats["avg_articles_per_fetch"] = (
                    stats["total_articles"] / stats["successful_fetches"]
                )

            # Calculate success rate
            success_rate = stats["successful_fetches"] / stats["total_fetches"]

            # Update quality score based on success rate and article count
            quality_score = self._calculate_quality_score(
                success_rate, stats["avg_articles_per_fetch"]
            )

            # Update document
            self.collection.update_one(
                {"url": feed_url},
                {
                    "$set": {
                        "last_fetched": datetime.utcnow(),
                        "quality_score": quality_score,
                        "metadata.stats": stats,
                        "metadata.success_rate": success_rate,
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )

            logger.info(
                f"Feed tracked: {feed_url} - "
                f"{article_count} articles, quality={quality_score:.2f}"
            )

        except Exception as e:
            logger.error(f"Failed to track feed success {feed_url}: {e}")

    def track_fetch_failure(self, feed_url: str, error: str):
        """
        Record failed feed fetch.

        Args:
            feed_url: RSS feed URL
            error: Error message
        """
        try:
            feed = self.collection.find_one({"url": feed_url})
            if not feed:
                logger.warning(f"Feed not found for tracking: {feed_url}")
                return

            # Update stats
            metadata = feed.get("metadata", {})
            stats = metadata.get("stats", {
                "total_fetches": 0,
                "successful_fetches": 0,
                "failed_fetches": 0,
                "total_articles": 0,
                "avg_articles_per_fetch": 0.0,
            })

            stats["total_fetches"] += 1
            stats["failed_fetches"] += 1

            # Calculate success rate
            success_rate = stats["successful_fetches"] / stats["total_fetches"]

            # Auto-disable if success rate too low
            active = True
            if stats["total_fetches"] >= 5 and success_rate < 0.3:
                active = False
                logger.warning(
                    f"Auto-disabling feed {feed_url} due to low success rate: {success_rate:.2%}"
                )

            # Update quality score
            quality_score = self._calculate_quality_score(
                success_rate, stats.get("avg_articles_per_fetch", 0)
            )

            # Update document
            self.collection.update_one(
                {"url": feed_url},
                {
                    "$set": {
                        "quality_score": quality_score,
                        "active": active,
                        "metadata.stats": stats,
                        "metadata.success_rate": success_rate,
                        "metadata.last_error": error,
                        "metadata.last_error_at": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )

            logger.warning(f"Feed fetch failed: {feed_url} - {error}")

        except Exception as e:
            logger.error(f"Failed to track feed failure {feed_url}: {e}")

    def get_active_feeds(
        self, category: Optional[str] = None, min_quality: float = 0.3
    ) -> List[Dict]:
        """
        Get active, high-quality feeds.

        Args:
            category: Filter by category (optional)
            min_quality: Minimum quality score

        Returns:
            List of feed documents
        """
        query = {"active": True, "quality_score": {"$gte": min_quality}}

        if category:
            query["category"] = category

        feeds = list(self.collection.find(query).sort("quality_score", -1))

        logger.info(
            f"Retrieved {len(feeds)} active feeds "
            f"(category={category}, min_quality={min_quality})"
        )

        return feeds

    def validate_feed(self, feed_url: str) -> Dict:
        """
        Validate feed by fetching and checking content.

        Args:
            feed_url: RSS feed URL

        Returns:
            Dict with validation results
        """
        try:
            logger.info(f"Validating feed: {feed_url}")

            # Fetch feed
            feed = feedparser.parse(feed_url)

            # Check for errors
            if feed.bozo and feed.bozo_exception:
                return {
                    "valid": False,
                    "error": str(feed.bozo_exception),
                    "article_count": 0,
                }

            # Check for entries
            entries = feed.entries
            if not entries:
                return {
                    "valid": False,
                    "error": "No articles found",
                    "article_count": 0,
                }

            # Validate entry structure
            sample = entries[0]
            has_title = hasattr(sample, "title") and sample.title
            has_link = hasattr(sample, "link") and sample.link

            if not (has_title and has_link):
                return {
                    "valid": False,
                    "error": "Invalid article structure",
                    "article_count": len(entries),
                }

            # Success
            return {
                "valid": True,
                "error": None,
                "article_count": len(entries),
                "feed_title": feed.feed.get("title", ""),
                "feed_description": feed.feed.get("description", ""),
            }

        except Exception as e:
            return {"valid": False, "error": str(e), "article_count": 0}

    def health_check_all(self, max_age_days: int = 7):
        """
        Run health check on all active feeds.
        Disables feeds that haven't been fetched recently.

        Args:
            max_age_days: Max days since last fetch
        """
        logger.info("Running health check on all feeds")

        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)

        # Find stale feeds
        stale_feeds = self.collection.find({
            "active": True,
            "$or": [
                {"last_fetched": {"$lt": cutoff_date}},
                {"last_fetched": None},
            ],
        })

        stale_count = 0
        for feed in stale_feeds:
            # Validate feed
            validation = self.validate_feed(feed["url"])

            if not validation["valid"]:
                # Disable stale/invalid feed
                self.collection.update_one(
                    {"_id": feed["_id"]},
                    {
                        "$set": {
                            "active": False,
                            "metadata.health_check_failed": True,
                            "metadata.health_check_error": validation["error"],
                            "updatedAt": datetime.utcnow(),
                        }
                    },
                )
                stale_count += 1
                logger.warning(
                    f"Disabled stale/invalid feed: {feed['url']} - {validation['error']}"
                )

        logger.info(f"Health check complete: {stale_count} feeds disabled")

        return {"disabled_count": stale_count}

    def _calculate_quality_score(
        self, success_rate: float, avg_articles: float
    ) -> float:
        """
        Calculate feed quality score (0-1).

        Args:
            success_rate: Fetch success rate (0-1)
            avg_articles: Average articles per fetch

        Returns:
            Quality score (0-1)
        """
        # Success rate weight: 70%
        score = success_rate * 0.7

        # Article count weight: 30%
        # Prefer feeds with 5-20 articles per fetch
        if avg_articles >= 5:
            article_score = min(avg_articles / 20, 1.0)
            score += article_score * 0.3

        return min(score, 1.0)


# Singleton
_tracker = None


def get_feed_tracker() -> FeedTracker:
    """Get or create feed tracker singleton"""
    global _tracker
    if _tracker is None:
        _tracker = FeedTracker()
    return _tracker
