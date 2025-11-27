"""Qdrant vector database client."""

import logging
import os
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient as QC
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    Range
)

logger = logging.getLogger(__name__)

# Namespace for generating UUIDs from MongoDB ObjectIds
OBJECTID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')


def objectid_to_uuid(object_id: str) -> str:
    """Convert MongoDB ObjectId to deterministic UUID using UUID5.

    Args:
        object_id: MongoDB ObjectId as hex string

    Returns:
        UUID string suitable for Qdrant point ID
    """
    return str(uuid.uuid5(OBJECTID_NAMESPACE, object_id))


class QdrantClient:
    """Wrapper for Qdrant vector database operations."""

    def __init__(self, url: str = os.getenv("QDRANT_URL", "http://localhost:6333")):
        """Initialize Qdrant client."""
        self.client = QC(url=url)
        self.posts_collection = "posts"
        self.user_profiles_collection = "user_profiles"
        logger.info(f"Initialized Qdrant client at {url}")

    def create_collections(self):
        """Create required collections if they don't exist."""
        try:
            # Posts collection
            if not self.client.collection_exists(self.posts_collection):
                self.client.create_collection(
                    collection_name=self.posts_collection,
                    vectors_config=VectorParams(
                        size=384,  # all-MiniLM-L6-v2 embedding size
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {self.posts_collection}")
            else:
                logger.info(f"Collection exists: {self.posts_collection}")

            # User profiles collection
            if not self.client.collection_exists(self.user_profiles_collection):
                self.client.create_collection(
                    collection_name=self.user_profiles_collection,
                    vectors_config=VectorParams(
                        size=384,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {self.user_profiles_collection}")
            else:
                logger.info(f"Collection exists: {self.user_profiles_collection}")

        except Exception as e:
            logger.error(f"Failed to create collections: {e}")
            raise

    def upsert_post(
        self,
        post_id: str,
        vector: List[float],
        campus: str,
        author_id: str,
        created_at: int,
        hashtags: List[str] = None,
        engagement_score: float = 0.0,
        sentiment: float = 0.0
    ):
        """Insert or update a post embedding."""
        try:
            # Convert ObjectId to UUID for Qdrant
            qdrant_id = objectid_to_uuid(post_id)

            point = PointStruct(
                id=qdrant_id,
                vector=vector,
                payload={
                    "post_id": post_id,  # Store original ObjectId in payload
                    "campus": campus,
                    "author_id": author_id,
                    "created_at": created_at,
                    "hashtags": hashtags or [],
                    "engagement_score": engagement_score,
                    "sentiment": sentiment
                }
            )

            self.client.upsert(
                collection_name=self.posts_collection,
                points=[point]
            )

            logger.info(f"Upserted post {post_id} as {qdrant_id}")

        except Exception as e:
            logger.error(f"Failed to upsert post {post_id}: {e}")
            raise

    def search_posts(
        self,
        query_vector: List[float],
        campus: str,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Search for similar posts."""
        try:
            # Build filter conditions
            must_conditions = [
                FieldCondition(
                    key="campus",
                    match=MatchValue(value=campus)
                )
            ]

            # Add optional filters
            if filters:
                # Time window filter
                if "time_window" in filters and filters["time_window"]:
                    cutoff = filters["time_window"]
                    must_conditions.append(
                        FieldCondition(
                            key="created_at",
                            range=Range(gte=cutoff)
                        )
                    )

                # Interests filter (via hashtags)
                if "interests" in filters and filters["interests"]:
                    # Note: This is simplified - in production, map interests to hashtags
                    pass

            query_filter = Filter(must=must_conditions) if must_conditions else None

            # Perform search
            results = self.client.search(
                collection_name=self.posts_collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                score_threshold=score_threshold
            )

            return [
                {
                    "post_id": hit.payload.get("post_id"),  # Return original ObjectId from payload
                    "score": hit.score,
                    "payload": hit.payload
                }
                for hit in results
            ]

        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise

    def upsert_user_profile(
        self,
        user_id: str,
        vector: List[float],
        campus: str,
        interests: List[str] = None
    ):
        """Insert or update a user taste profile."""
        try:
            # Convert ObjectId to UUID for Qdrant
            qdrant_id = objectid_to_uuid(user_id)

            point = PointStruct(
                id=qdrant_id,
                vector=vector,
                payload={
                    "user_id": user_id,  # Store original ObjectId in payload
                    "campus": campus,
                    "interests": interests or [],
                    "last_updated": int(time.time())
                }
            )

            self.client.upsert(
                collection_name=self.user_profiles_collection,
                points=[point]
            )

            logger.debug(f"Upserted user profile {user_id} as {qdrant_id}")

        except Exception as e:
            logger.error(f"Failed to upsert user profile {user_id}: {e}")
            raise

    def search_similar_users(
        self,
        user_id: str,
        campus: str,
        limit: int = 30,
        score_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Find users with similar taste profiles."""
        try:
            # Convert ObjectId to UUID for Qdrant lookup
            qdrant_id = objectid_to_uuid(user_id)

            # Get user's profile vector
            user_point = self.client.retrieve(
                collection_name=self.user_profiles_collection,
                ids=[qdrant_id]
            )

            if not user_point:
                logger.warning(f"User profile not found: {user_id}")
                return []

            query_vector = user_point[0].vector

            # Search for similar users
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="campus",
                        match=MatchValue(value=campus)
                    )
                ]
            )

            results = self.client.search(
                collection_name=self.user_profiles_collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit + 1,  # +1 to exclude self
                score_threshold=score_threshold
            )

            # Exclude self and return original ObjectIds
            return [
                {
                    "user_id": hit.payload.get("user_id"),
                    "score": hit.score,
                    "payload": hit.payload
                }
                for hit in results
                if hit.payload.get("user_id") != user_id
            ][:limit]

        except Exception as e:
            logger.error(f"User similarity search failed: {e}")
            raise

    def get_posts_by_ids(self, post_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieve posts by IDs (accepts MongoDB ObjectIds)."""
        try:
            # Convert ObjectIds to UUIDs for Qdrant lookup
            qdrant_ids = [objectid_to_uuid(pid) for pid in post_ids]

            points = self.client.retrieve(
                collection_name=self.posts_collection,
                ids=qdrant_ids
            )

            return [
                {
                    "post_id": point.payload.get("post_id"),  # Return original ObjectId
                    "payload": point.payload
                }
                for point in points
            ]

        except Exception as e:
            logger.error(f"Failed to retrieve posts: {e}")
            raise

    def update_engagement_scores(self, scores: Dict[str, float]):
        """Batch update engagement scores for posts (accepts MongoDB ObjectIds)."""
        try:
            points = []
            for post_id, score in scores.items():
                # Convert ObjectId to UUID for Qdrant lookup
                qdrant_id = objectid_to_uuid(post_id)

                # Retrieve existing point
                existing = self.client.retrieve(
                    collection_name=self.posts_collection,
                    ids=[qdrant_id]
                )

                if existing:
                    payload = existing[0].payload
                    payload["engagement_score"] = score

                    points.append(
                        PointStruct(
                            id=qdrant_id,
                            vector=existing[0].vector,
                            payload=payload
                        )
                    )

            if points:
                self.client.upsert(
                    collection_name=self.posts_collection,
                    points=points
                )
                logger.info(f"Updated {len(points)} engagement scores")

        except Exception as e:
            logger.error(f"Failed to update engagement scores: {e}")
            raise


# Global instance
qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client(url: str = None) -> QdrantClient:
    """Get or create Qdrant client singleton."""
    global qdrant_client

    if qdrant_client is None:
        import os
        url = url or os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_client = QdrantClient(url)

    return qdrant_client


# Add missing import
import time
