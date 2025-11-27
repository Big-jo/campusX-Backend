"""
Detect emerging topics from user interests.
Clusters interest patterns to identify new content areas.
"""

import logging
from typing import List, Dict
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class TopicDetector:
    """
    Analyzes user interests to detect emerging topics.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.interests_collection = self.db[COLLECTIONS.get("user_interests", "userinterests")]
        self.categories_collection = self.db[COLLECTIONS.get("interest_categories", "interestcategories")]

    def detect_emerging_topics(
        self,
        min_users: int = 5,
        min_drift_score: float = 0.3,
        lookback_days: int = 7
    ) -> List[Dict]:
        """
        Detect emerging topics from user interest transitions.

        Args:
            min_users: Minimum users showing interest
            min_drift_score: Minimum drift score to consider
            lookback_days: Days to look back for transitions

        Returns:
            List of emerging topics with metadata
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)

            # Get all users with recent transitions
            users = list(self.interests_collection.find({
                "updatedAt": {"$gte": cutoff_date},
                "transitions": {"$exists": True, "$ne": []}
            }))

            if len(users) < min_users:
                logger.info(f"Not enough active users ({len(users)} < {min_users})")
                return []

            # Count category transitions
            category_counts = Counter()
            drift_scores = defaultdict(list)

            for user in users:
                transitions = user.get("transitions", [])
                if not transitions:
                    continue

                # Get recent transitions
                recent = [t for t in transitions if t.get("timestamp", datetime.min) >= cutoff_date]

                for trans in recent:
                    to_category = trans.get("to", "")
                    if to_category:
                        category_counts[to_category] += 1

                # Calculate drift for this user
                unique_categories = len(set(t.get("to", "") for t in recent))
                if len(recent) > 0:
                    drift = min(unique_categories / 10.0, 1.0)
                    for trans in recent:
                        drift_scores[trans.get("to", "")].append(drift)

            # Find emerging topics
            emerging = []
            existing_categories = {cat["name"] for cat in self.categories_collection.find({}, {"name": 1})}

            for category, count in category_counts.most_common():
                if count < min_users:
                    continue

                # Calculate average drift score
                avg_drift = sum(drift_scores[category]) / len(drift_scores[category]) if drift_scores[category] else 0

                if avg_drift < min_drift_score:
                    continue

                # Check if already exists as main category
                is_new = category not in existing_categories

                emerging.append({
                    "topic": category,
                    "user_count": count,
                    "avg_drift_score": avg_drift,
                    "is_new_category": is_new,
                    "detected_at": datetime.utcnow()
                })

            logger.info(f"Detected {len(emerging)} emerging topics")
            return emerging

        except Exception as e:
            logger.error(f"Topic detection failed: {e}", exc_info=True)
            return []

    def analyze_content_gaps(self, limit: int = 10) -> List[Dict]:
        """
        Identify interest areas with insufficient content.

        Args:
            limit: Max gaps to return

        Returns:
            List of gaps with metrics
        """
        try:
            # Get all user interests
            users = list(self.interests_collection.find({
                "interest_vector": {"$exists": True, "$ne": {}}
            }))

            if not users:
                return []

            # Aggregate interest weights
            total_interest = defaultdict(float)
            for user in users:
                for category, weight in user.get("interest_vector", {}).items():
                    total_interest[category] += weight

            # Get content counts per category
            content_collection = self.db[COLLECTIONS.get("scraped_content", "scrapedcontents")]
            content_counts = {}

            for category in total_interest.keys():
                count = content_collection.count_documents({
                    "interestCategory": category,
                    "status": {"$in": ["enriched", "pending"]},
                    "qualityScore": {"$gte": 0.5}
                })
                content_counts[category] = count

            # Calculate gap score (high interest / low content = high gap)
            gaps = []
            for category, interest_weight in total_interest.items():
                content_count = content_counts.get(category, 0)

                # Avoid division by zero
                gap_score = interest_weight / max(content_count, 1)

                gaps.append({
                    "category": category,
                    "interest_weight": interest_weight,
                    "content_count": content_count,
                    "gap_score": gap_score,
                    "priority": "high" if gap_score > 1.0 else "medium" if gap_score > 0.5 else "low"
                })

            # Sort by gap score
            gaps.sort(key=lambda x: x["gap_score"], reverse=True)

            logger.info(f"Identified {len(gaps)} content gaps")
            return gaps[:limit]

        except Exception as e:
            logger.error(f"Content gap analysis failed: {e}", exc_info=True)
            return []


# Singleton
_detector = None


def get_topic_detector() -> TopicDetector:
    """Get or create topic detector singleton"""
    global _detector
    if _detector is None:
        _detector = TopicDetector()
    return _detector
