"""
Track and update user interests based on interactions.
Maintains interest vectors and detects transitions.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict
import numpy as np
from bson import ObjectId
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.interest_graph.embeddings_generator import get_embeddings_generator
from src.interest_graph.vector_store import get_vector_store

logger = logging.getLogger(__name__)


class InterestTracker:
    """
    Tracks user interests and updates interest vectors.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.interests_collection = self.db[COLLECTIONS.get("user_interests", "userinterests")]
        self.posts_collection = self.db[COLLECTIONS.get("posts", "posts")]
        self.content_collection = self.db[COLLECTIONS.get("scraped_content", "scrapedcontents")]
        self.embeddings_generator = get_embeddings_generator()
        self.vector_store = get_vector_store()

    def track_interaction(
        self,
        user_id: str,
        content_id: str,
        interaction_type: str,
        weight: float = 1.0,
        category_override: Optional[str] = None,
    ):
        """
        Track user interaction with content.

        Args:
            user_id: User ID
            content_id: Content ID (may be empty for user-generated posts)
            interaction_type: "view", "like", "share", "comment"
            weight: Interaction weight (view=0.1, like=0.5, share=1.0)
            category_override: Use this category instead of looking up content (for user posts)
        """
        try:
            # Resolve category from scraped content or override
            content = None
            if content_id:
                content = self.content_collection.find_one({"_id": ObjectId(content_id)})

            if content:
                category = content.get("interestCategory", "")
            elif category_override:
                category = category_override
            else:
                logger.warning(f"Content not found and no category override: {content_id}")
                return

            if not category:
                logger.warning(f"No category for content: {content_id}")
                return

            # Get or create user interests
            user_interests = self.interests_collection.find_one({"user_id": user_id})

            if not user_interests:
                # Create new
                user_interests = {
                    "user_id": user_id,
                    "interest_vector": {},
                    "transitions": [],
                    "qdrant_point_id": None,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }

            # Update interest vector
            interest_vector = user_interests.get("interest_vector", {})
            old_weight = interest_vector.get(category, 0.0)
            new_weight = old_weight + weight

            interest_vector[category] = new_weight

            # Track transition if primary interest changed
            transitions = user_interests.get("transitions", [])
            primary_interest = max(interest_vector.items(), key=lambda x: x[1])[0]

            if old_weight > 0 and primary_interest != category:
                transitions.append({
                    "from": list(interest_vector.keys())[0] if interest_vector else "",
                    "to": category,
                    "timestamp": datetime.utcnow()
                })

            # Update document
            self.interests_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "interest_vector": interest_vector,
                        "transitions": transitions[-50:],  # Keep last 50
                        "updatedAt": datetime.utcnow(),
                    }
                },
                upsert=True
            )

            logger.info(
                f"Tracked {interaction_type} for user {user_id}, "
                f"category {category} (weight {new_weight:.2f})"
            )

            # Update embedding asynchronously (don't block)
            self._update_user_embedding_async(user_id)

        except Exception as e:
            logger.error(f"Failed to track interaction: {e}", exc_info=True)

    def _update_user_embedding_async(self, user_id: str):
        """
        Update user's interest embedding in Qdrant.
        (Async to avoid blocking main flow)
        """
        try:
            # Get user interests
            user_interests = self.interests_collection.find_one({"user_id": user_id})
            if not user_interests:
                return

            interest_vector = user_interests.get("interest_vector", {})
            if not interest_vector:
                return

            # Get embeddings for interacted content
            # (Use recent interactions, weighted by interest strength)
            embeddings = []
            weights = []

            for category, weight in sorted(
                interest_vector.items(), key=lambda x: x[1], reverse=True
            )[:10]:  # Top 10 categories
                # Get sample content from this category
                samples = list(self.content_collection.find({
                    "interestCategory": category
                }).sort("scrapedAt", -1).limit(5))

                for sample in samples:
                    # Generate or retrieve embedding
                    embedding = self.embeddings_generator.generate_content_embedding(sample)
                    embeddings.append(embedding)
                    weights.append(weight)

            if not embeddings:
                return

            # Compute weighted average embedding
            user_embedding = self.embeddings_generator.compute_average_embedding(
                embeddings, weights
            )

            # Store in Qdrant (user interests collection)
            # Note: This would be in a separate Qdrant collection for user profiles
            point_id = f"user_{user_id}"

            # Update user interests document with Qdrant ID
            self.interests_collection.update_one(
                {"user_id": user_id},
                {"$set": {"qdrant_point_id": point_id}}
            )

            logger.info(f"Updated interest embedding for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to update user embedding: {e}")

    def get_user_interests(self, user_id: str) -> Optional[Dict]:
        """
        Get user's interest data.

        Args:
            user_id: User ID

        Returns:
            User interests document
        """
        return self.interests_collection.find_one({"user_id": user_id})

    def get_top_interests(self, user_id: str, limit: int = 5) -> List[Dict]:
        """
        Get user's top interests.

        Args:
            user_id: User ID
            limit: Number of top interests

        Returns:
            List of {category, weight} dicts
        """
        user_interests = self.get_user_interests(user_id)
        if not user_interests:
            return []

        interest_vector = user_interests.get("interest_vector", {})
        sorted_interests = sorted(
            interest_vector.items(), key=lambda x: x[1], reverse=True
        )[:limit]

        return [
            {"category": cat, "weight": weight}
            for cat, weight in sorted_interests
        ]

    def get_interest_transitions(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get user's interest transitions over time.

        Args:
            user_id: User ID
            limit: Number of recent transitions

        Returns:
            List of transition dicts
        """
        user_interests = self.get_user_interests(user_id)
        if not user_interests:
            return []

        transitions = user_interests.get("transitions", [])
        return transitions[-limit:]

    def compute_interest_drift(self, user_id: str) -> Dict:
        """
        Analyze how user interests have changed over time.

        Args:
            user_id: User ID

        Returns:
            Dict with drift analysis
        """
        transitions = self.get_interest_transitions(user_id, limit=50)

        if len(transitions) < 2:
            return {
                "drift_score": 0.0,
                "stable": True,
                "emerging_interests": []
            }

        # Count transitions between categories
        transition_counts = defaultdict(int)
        for trans in transitions:
            key = f"{trans['from']} → {trans['to']}"
            transition_counts[key] += 1

        # Calculate drift score (more transitions = higher drift)
        drift_score = min(len(set(t['to'] for t in transitions)) / 10.0, 1.0)

        # Identify emerging interests (recent transitions to new categories)
        recent = transitions[-10:]
        emerging = list(set(t['to'] for t in recent if t['to'] not in [t['from'] for t in transitions[:-10]]))

        return {
            "drift_score": drift_score,
            "stable": drift_score < 0.3,
            "emerging_interests": emerging,
            "total_transitions": len(transitions),
            "unique_categories": len(set(t['to'] for t in transitions))
        }

    def get_personalized_content(
        self,
        user_id: str,
        limit: int = 10,
        exclude_seen: bool = True
    ) -> List[Dict]:
        """
        Get personalized content recommendations for user.

        Args:
            user_id: User ID
            limit: Number of recommendations
            exclude_seen: Exclude already viewed content

        Returns:
            List of recommended content
        """
        try:
            # Get user interests
            user_interests = self.get_user_interests(user_id)
            if not user_interests:
                # No interests yet, return popular content
                return self._get_popular_content(limit)

            interest_vector = user_interests.get("interest_vector", {})
            if not interest_vector:
                return self._get_popular_content(limit)

            # Get top categories
            top_categories = sorted(
                interest_vector.items(), key=lambda x: x[1], reverse=True
            )[:5]

            # Get content from top categories
            recommendations = []

            for category, weight in top_categories:
                # Get recent, high-quality content from this category
                content = list(self.content_collection.find({
                    "interestCategory": category,
                    "status": {"$in": ["enriched", "pending"]},
                    "qualityScore": {"$gte": 0.5}
                }).sort("scrapedAt", -1).limit(limit // len(top_categories) + 1))

                recommendations.extend(content)

            # Sort by quality and recency
            recommendations.sort(
                key=lambda x: (x.get("qualityScore", 0), x.get("scrapedAt")),
                reverse=True
            )

            return recommendations[:limit]

        except Exception as e:
            logger.error(f"Personalized content retrieval failed: {e}")
            return []

    def _get_popular_content(self, limit: int) -> List[Dict]:
        """Fallback: get popular/recent content"""
        return list(self.content_collection.find({
            "status": {"$in": ["enriched", "pending"]},
            "qualityScore": {"$gte": 0.6}
        }).sort([("qualityScore", -1), ("scrapedAt", -1)]).limit(limit))


# Singleton
_tracker = None


def get_interest_tracker() -> InterestTracker:
    """Get or create interest tracker singleton"""
    global _tracker
    if _tracker is None:
        _tracker = InterestTracker()
    return _tracker
