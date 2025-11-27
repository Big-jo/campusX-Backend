"""
System metrics and monitoring.
Tracks pipeline performance, API usage, and system health.
"""

import logging
from typing import Dict
from datetime import datetime, timedelta
from collections import defaultdict
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collects and reports system metrics.
    """

    def __init__(self):
        self.db = get_sync_db()

    def get_pipeline_metrics(self, days: int = 7) -> Dict:
        """
        Get pipeline performance metrics.

        Args:
            days: Days to look back

        Returns:
            Pipeline metrics
        """
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)

            content_collection = self.db[COLLECTIONS.get("scraped_content", "scrapedcontents")]

            # Count by status
            total = content_collection.count_documents({"scrapedAt": {"$gte": cutoff}})
            enriched = content_collection.count_documents({
                "scrapedAt": {"$gte": cutoff},
                "status": "enriched"
            })

            # Average quality score
            pipeline = [
                {"$match": {"scrapedAt": {"$gte": cutoff}, "qualityScore": {"$exists": True}}},
                {"$group": {
                    "_id": None,
                    "avg_quality": {"$avg": "$qualityScore"},
                    "min_quality": {"$min": "$qualityScore"},
                    "max_quality": {"$max": "$qualityScore"}
                }}
            ]
            quality_stats = list(content_collection.aggregate(pipeline))

            # Content by category
            category_pipeline = [
                {"$match": {"scrapedAt": {"$gte": cutoff}}},
                {"$group": {"_id": "$interestCategory", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            by_category = list(content_collection.aggregate(category_pipeline))

            return {
                "total_processed": total,
                "enriched": enriched,
                "enrichment_rate": enriched / total if total > 0 else 0,
                "quality_stats": quality_stats[0] if quality_stats else {},
                "by_category": by_category,
                "period_days": days
            }

        except Exception as e:
            logger.error(f"Failed to get pipeline metrics: {e}")
            return {}

    def get_rss_health(self) -> Dict:
        """
        Get RSS feed health metrics.

        Returns:
            RSS health stats
        """
        try:
            rss_collection = self.db[COLLECTIONS.get("rss_sources", "rsssources")]

            total_feeds = rss_collection.count_documents({})
            active_feeds = rss_collection.count_documents({"active": True})

            # Quality distribution
            high_quality = rss_collection.count_documents({
                "active": True,
                "quality_score": {"$gte": 0.7}
            })
            medium_quality = rss_collection.count_documents({
                "active": True,
                "quality_score": {"$gte": 0.4, "$lt": 0.7}
            })
            low_quality = rss_collection.count_documents({
                "active": True,
                "quality_score": {"$lt": 0.4}
            })

            # Feeds by category
            category_pipeline = [
                {"$match": {"active": True}},
                {"$group": {"_id": "$category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            by_category = list(rss_collection.aggregate(category_pipeline))

            return {
                "total_feeds": total_feeds,
                "active_feeds": active_feeds,
                "inactive_feeds": total_feeds - active_feeds,
                "quality_distribution": {
                    "high": high_quality,
                    "medium": medium_quality,
                    "low": low_quality
                },
                "by_category": by_category
            }

        except Exception as e:
            logger.error(f"Failed to get RSS health: {e}")
            return {}

    def get_user_engagement(self, days: int = 7) -> Dict:
        """
        Get user engagement metrics.

        Args:
            days: Days to look back

        Returns:
            Engagement metrics
        """
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)

            interests_collection = self.db[COLLECTIONS.get("user_interests", "userinterests")]

            # Active users (updated recently)
            active_users = interests_collection.count_documents({
                "updatedAt": {"$gte": cutoff}
            })

            # Total users with interests
            total_users = interests_collection.count_documents({})

            # Interest diversity
            diversity_pipeline = [
                {"$match": {"updatedAt": {"$gte": cutoff}}},
                {"$project": {
                    "category_count": {"$size": {"$objectToArray": "$interest_vector"}}
                }},
                {"$group": {
                    "_id": None,
                    "avg_categories": {"$avg": "$category_count"}
                }}
            ]
            diversity = list(interests_collection.aggregate(diversity_pipeline))

            # Top interests across all users
            # This is complex - simplified version
            top_interests_pipeline = [
                {"$match": {"updatedAt": {"$gte": cutoff}}},
                {"$project": {"interest_vector": {"$objectToArray": "$interest_vector"}}},
                {"$unwind": "$interest_vector"},
                {"$group": {
                    "_id": "$interest_vector.k",
                    "total_weight": {"$sum": "$interest_vector.v"},
                    "user_count": {"$sum": 1}
                }},
                {"$sort": {"total_weight": -1}},
                {"$limit": 10}
            ]
            top_interests = list(interests_collection.aggregate(top_interests_pipeline))

            return {
                "active_users": active_users,
                "total_users": total_users,
                "avg_categories_per_user": diversity[0]["avg_categories"] if diversity else 0,
                "top_interests": top_interests,
                "period_days": days
            }

        except Exception as e:
            logger.error(f"Failed to get user engagement: {e}")
            return {}

    def get_system_health(self) -> Dict:
        """
        Get overall system health status.

        Returns:
            Health status
        """
        try:
            pipeline_metrics = self.get_pipeline_metrics(days=1)
            rss_health = self.get_rss_health()
            engagement = self.get_user_engagement(days=1)

            # Determine health status
            health_score = 0.0

            # Check enrichment rate (30%)
            enrichment_rate = pipeline_metrics.get("enrichment_rate", 0)
            if enrichment_rate > 0.7:
                health_score += 0.3
            elif enrichment_rate > 0.5:
                health_score += 0.2
            elif enrichment_rate > 0.3:
                health_score += 0.1

            # Check RSS feeds (30%)
            active_feeds = rss_health.get("active_feeds", 0)
            if active_feeds > 50:
                health_score += 0.3
            elif active_feeds > 20:
                health_score += 0.2
            elif active_feeds > 10:
                health_score += 0.1

            # Check quality distribution (20%)
            quality_dist = rss_health.get("quality_distribution", {})
            high_quality = quality_dist.get("high", 0)
            if high_quality > active_feeds * 0.5:
                health_score += 0.2
            elif high_quality > active_feeds * 0.3:
                health_score += 0.1

            # Check user engagement (20%)
            active_users = engagement.get("active_users", 0)
            if active_users > 100:
                health_score += 0.2
            elif active_users > 50:
                health_score += 0.15
            elif active_users > 10:
                health_score += 0.1

            status = "healthy" if health_score >= 0.7 else "degraded" if health_score >= 0.5 else "unhealthy"

            return {
                "status": status,
                "health_score": health_score,
                "metrics": {
                    "pipeline": pipeline_metrics,
                    "rss": rss_health,
                    "engagement": engagement
                },
                "timestamp": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {"status": "error", "message": str(e)}


# Singleton
_collector = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create metrics collector singleton"""
    global _collector
    if _collector is None:
        _collector = MetricsCollector()
    return _collector
