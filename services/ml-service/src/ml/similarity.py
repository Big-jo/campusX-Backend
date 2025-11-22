"""User similarity service for enhanced recommendations."""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class SimilarityService:
    """Service for calculating user similarity."""

    def __init__(self, qdrant_client, embeddings_service):
        """
        Initialize similarity service.

        Args:
            qdrant_client: Qdrant client for user profiles
            embeddings_service: Embeddings service
        """
        self.qdrant = qdrant_client
        self.embeddings = embeddings_service
        logger.info("Similarity service initialized")

    def calculate_interest_similarity(
        self,
        interests_a: List[str],
        interests_b: List[str]
    ) -> float:
        """
        Calculate Jaccard similarity between two interest lists.

        Formula: |A ∩ B| / |A ∪ B|

        Args:
            interests_a: User A's interests
            interests_b: User B's interests

        Returns:
            Similarity score (0.0 to 1.0)
        """
        if not interests_a or not interests_b:
            return 0.0

        set_a = set(interests_a)
        set_b = set(interests_b)

        intersection = len(set_a & set_b)
        union = len(set_a | set_b)

        if union == 0:
            return 0.0

        return intersection / union

    async def build_user_profile(
        self,
        user_id: str,
        engaged_post_ids: List[str],
        campus: str,
        interests: List[str]
    ):
        """
        Build user taste profile from engagement history.

        Args:
            user_id: User ID
            engaged_post_ids: List of post IDs user engaged with
            campus: User's campus
            interests: User's declared interests
        """
        try:
            if not engaged_post_ids:
                logger.warning(f"No engagement history for user {user_id}")
                return

            # Get post embeddings from Qdrant
            posts = self.qdrant.get_posts_by_ids(engaged_post_ids)

            if not posts:
                logger.warning(f"No posts found for user {user_id}")
                return

            # Extract vectors (need to retrieve from Qdrant)
            # This is simplified - in production, we'd need to fetch full points with vectors
            post_vectors = []  # TODO: Get vectors from Qdrant

            if not post_vectors:
                logger.warning(f"No vectors found for user {user_id}")
                return

            # Build profile (average of embeddings)
            profile_vector = self.embeddings.build_user_profile(post_vectors)

            # Store in Qdrant
            self.qdrant.upsert_user_profile(
                user_id=user_id,
                vector=profile_vector,
                campus=campus,
                interests=interests
            )

            logger.info(f"Built profile for user {user_id} from {len(post_vectors)} posts")

        except Exception as e:
            logger.error(f"Failed to build profile for user {user_id}: {e}")
            raise

    async def get_similar_users(
        self,
        user_id: str,
        campus: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get similar users based on engagement patterns and interests.

        This is a stub that needs MongoDB integration for user data.

        Args:
            user_id: User ID
            campus: Campus filter
            limit: Max results

        Returns:
            List of similar users with scores
        """
        try:
            # Search for similar users in Qdrant
            similar_users = self.qdrant.search_similar_users(
                user_id=user_id,
                campus=campus,
                limit=limit,
                score_threshold=0.3
            )

            # TODO: Fetch user interests from MongoDB
            # TODO: Calculate combined score (engagement + interests)

            # For now, return stub data
            results = [
                {
                    "user_id": user["user_id"],
                    "ml_score": user["score"],
                    "reason": "engagement" if user["score"] > 0.5 else "interests"
                }
                for user in similar_users
            ]

            return results[:limit]

        except Exception as e:
            logger.error(f"Failed to get similar users for {user_id}: {e}")
            # Return empty list instead of raising (graceful degradation)
            return []


# Factory function
def create_similarity_service(qdrant_client, embeddings_service):
    """Create and return SimilarityService instance."""
    return SimilarityService(qdrant_client, embeddings_service)
