"""
Search query performance tracking.
Adapted from feed_tracker.py - tracks query success/failure, auto-disables poor performers.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class QueryTracker:
    """
    Tracks search query quality and performance.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.collection = self.db[COLLECTIONS.get("search_queries", "searchqueries")]

    def track_search_success(self, query_text: str, result_count: int):
        """
        Record successful search execution.

        Args:
            query_text: The search query
            result_count: Number of results returned
        """
        try:
            query = self.collection.find_one({"query_text": query_text})
            if not query:
                logger.warning(f"Query not found for tracking: {query_text}")
                return

            # Update stats
            metadata = query.get("metadata", {})
            stats = metadata.get("stats", {
                "total_searches": 0,
                "successful_searches": 0,
                "failed_searches": 0,
                "total_results": 0,
                "avg_results_per_search": 0.0,
            })

            stats["total_searches"] += 1
            stats["successful_searches"] += 1
            stats["total_results"] += result_count

            # Update average
            if stats["successful_searches"] > 0:
                stats["avg_results_per_search"] = (
                    stats["total_results"] / stats["successful_searches"]
                )

            # Calculate success rate
            success_rate = stats["successful_searches"] / stats["total_searches"]

            # Update quality score
            quality_score = self._calculate_quality_score(
                success_rate, stats["avg_results_per_search"]
            )

            # Update document
            self.collection.update_one(
                {"query_text": query_text},
                {
                    "$set": {
                        "last_used": datetime.utcnow(),
                        "quality_score": quality_score,
                        "metadata.stats": stats,
                        "metadata.success_rate": success_rate,
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )

            logger.info(
                f"Query tracked: {query_text[:50]}... - "
                f"{result_count} results, quality={quality_score:.2f}"
            )

        except Exception as e:
            logger.error(f"Failed to track search success {query_text}: {e}")

    def track_search_failure(self, query_text: str, error: str):
        """
        Record failed search execution.

        Args:
            query_text: The search query
            error: Error message
        """
        try:
            query = self.collection.find_one({"query_text": query_text})
            if not query:
                logger.warning(f"Query not found for tracking: {query_text}")
                return

            # Update stats
            metadata = query.get("metadata", {})
            stats = metadata.get("stats", {
                "total_searches": 0,
                "successful_searches": 0,
                "failed_searches": 0,
                "total_results": 0,
                "avg_results_per_search": 0.0,
            })

            stats["total_searches"] += 1
            stats["failed_searches"] += 1

            # Calculate success rate
            success_rate = stats["successful_searches"] / stats["total_searches"]

            # Auto-disable if success rate too low
            active = True
            if stats["total_searches"] >= 5 and success_rate < 0.3:
                active = False
                logger.warning(
                    f"Auto-disabling query {query_text[:50]}... due to low success rate: {success_rate:.2%}"
                )

            # Update quality score
            quality_score = self._calculate_quality_score(
                success_rate, stats.get("avg_results_per_search", 0)
            )

            # Update document
            self.collection.update_one(
                {"query_text": query_text},
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

            logger.warning(f"Search failed: {query_text[:50]}... - {error}")

        except Exception as e:
            logger.error(f"Failed to track search failure {query_text}: {e}")

    def get_active_queries(
        self, category: Optional[str] = None, min_quality: float = 0.3
    ) -> List[Dict]:
        """
        Get active, high-quality queries.

        Args:
            category: Filter by category (optional)
            min_quality: Minimum quality score

        Returns:
            List of query documents
        """
        query_filter = {"active": True, "quality_score": {"$gte": min_quality}}

        if category:
            query_filter["category"] = category

        queries = list(self.collection.find(query_filter).sort("quality_score", -1))

        logger.info(
            f"Retrieved {len(queries)} active queries "
            f"(category={category}, min_quality={min_quality})"
        )

        return queries

    def health_check_all(self, max_age_days: int = 7) -> Dict:
        """
        Run health check on all active queries.
        Disables queries that haven't been used recently.

        Args:
            max_age_days: Max days since last use

        Returns:
            Dict with disabled_count
        """
        logger.info("Running health check on all queries")

        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)

        # Find stale queries
        stale_queries = self.collection.find({
            "active": True,
            "$or": [
                {"last_used": {"$lt": cutoff_date}},
                {"last_used": None},
            ],
        })

        disabled_count = 0
        for query in stale_queries:
            # Disable stale query
            self.collection.update_one(
                {"_id": query["_id"]},
                {
                    "$set": {
                        "active": False,
                        "metadata.health_check_failed": True,
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )
            disabled_count += 1
            logger.warning(
                f"Disabled stale query: {query['query_text'][:50]}..."
            )

        logger.info(f"Health check complete: {disabled_count} queries disabled")

        return {"disabled_count": disabled_count}

    def _calculate_quality_score(
        self, success_rate: float, avg_results: float
    ) -> float:
        """
        Calculate query quality score (0-1).

        Args:
            success_rate: Search success rate (0-1)
            avg_results: Average results per search

        Returns:
            Quality score (0-1)
        """
        # Success rate weight: 70%
        score = success_rate * 0.7

        # Result count weight: 30%
        # Prefer queries with 5-20 results per search
        if avg_results >= 5:
            result_score = min(avg_results / 20, 1.0)
            score += result_score * 0.3

        return min(score, 1.0)


# Singleton
_tracker = None


def get_query_tracker() -> QueryTracker:
    """Get or create query tracker singleton"""
    global _tracker
    if _tracker is None:
        _tracker = QueryTracker()
    return _tracker
