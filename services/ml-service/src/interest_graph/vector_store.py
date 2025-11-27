"""
Qdrant vector store integration.
Stores content embeddings and enables semantic search.
"""

import logging
import uuid
from typing import List, Dict, Optional
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from src.config import settings
from src.interest_graph.embeddings_generator import get_embeddings_generator

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Manages content embeddings in Qdrant vector database.
    """

    def __init__(self):
        self.client = QdrantClient(url=settings.QDRANT_URL)
        self.collection_name = "content_embeddings"
        self.embeddings_generator = get_embeddings_generator()
        self.embedding_dim = self.embeddings_generator.embedding_dim

        # Ensure collection exists
        self._ensure_collection()

    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)

            if not exists:
                logger.info(f"Creating Qdrant collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_dim,
                        distance=Distance.COSINE
                    )
                )
                logger.info("Collection created successfully")
            else:
                logger.info(f"Collection {self.collection_name} already exists")

        except Exception as e:
            logger.error(f"Failed to ensure collection: {e}")
            raise

    def store_content_embedding(
        self,
        content_id: str,
        content: Dict,
        embedding: np.ndarray = None
    ) -> str:
        """
        Store content embedding in Qdrant.

        Args:
            content_id: MongoDB content ID
            content: Content dict
            embedding: Pre-computed embedding (optional)

        Returns:
            Qdrant point ID
        """
        try:
            # Generate embedding if not provided
            if embedding is None:
                embedding = self.embeddings_generator.generate_content_embedding(content)

            # Prepare metadata
            metadata = {
                "content_id": content_id,
                "title": content.get("title", "")[:500],  # Limit length
                "category": content.get("interestCategory", ""),
                "source_domain": content.get("sourceDomain", ""),
                "quality_score": content.get("qualityScore", 0.0),
                "word_count": content.get("metadata", {}).get("wordCount", 0),
            }

            # Store in Qdrant
            # Convert content_id to UUID (Qdrant requires UUID or int)
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, content_id))
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=embedding.tolist(),
                        payload=metadata
                    )
                ]
            )

            logger.info(f"Stored embedding for content: {content_id}")
            return point_id

        except Exception as e:
            logger.error(f"Failed to store embedding for {content_id}: {e}")
            raise

    def store_batch_embeddings(
        self,
        content_list: List[Dict],
        embeddings: List[np.ndarray] = None
    ) -> List[str]:
        """
        Store multiple content embeddings (batch).

        Args:
            content_list: List of content dicts (must have _id field)
            embeddings: Pre-computed embeddings (optional)

        Returns:
            List of Qdrant point IDs
        """
        try:
            # Generate embeddings if not provided
            if embeddings is None:
                embeddings = self.embeddings_generator.generate_batch_embeddings(content_list)

            # Prepare points
            points = []
            point_ids = []

            for content, embedding in zip(content_list, embeddings):
                content_id = str(content.get("_id") or content.get("id"))
                # Convert to UUID for Qdrant
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, content_id))
                point_ids.append(point_id)

                metadata = {
                    "content_id": content_id,
                    "title": content.get("title", "")[:500],
                    "category": content.get("interestCategory", ""),
                    "source_domain": content.get("sourceDomain", ""),
                    "quality_score": content.get("qualityScore", 0.0),
                    "word_count": content.get("metadata", {}).get("wordCount", 0),
                }

                points.append(
                    PointStruct(
                        id=point_id,
                        vector=embedding.tolist(),
                        payload=metadata
                    )
                )

            # Batch upsert
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )

            logger.info(f"Stored {len(points)} embeddings in batch")
            return point_ids

        except Exception as e:
            logger.error(f"Batch embedding storage failed: {e}")
            raise

    def search_similar_content(
        self,
        query_embedding: np.ndarray,
        limit: int = 10,
        category: str = None,
        min_quality: float = 0.0
    ) -> List[Dict]:
        """
        Search for similar content using embedding.

        Args:
            query_embedding: Query embedding vector
            limit: Max results
            category: Filter by category (optional)
            min_quality: Minimum quality score (optional)

        Returns:
            List of similar content with scores
        """
        try:
            # Build filter
            filter_conditions = []

            if category:
                filter_conditions.append(
                    FieldCondition(
                        key="category",
                        match=MatchValue(value=category)
                    )
                )

            if min_quality > 0:
                filter_conditions.append(
                    FieldCondition(
                        key="quality_score",
                        range={"gte": min_quality}
                    )
                )

            query_filter = Filter(must=filter_conditions) if filter_conditions else None

            # Search
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding.tolist(),
                limit=limit,
                query_filter=query_filter
            )

            # Format results
            similar = []
            for result in results:
                similar.append({
                    "content_id": result.id,
                    "score": result.score,
                    "metadata": result.payload
                })

            logger.info(f"Found {len(similar)} similar content items")
            return similar

        except Exception as e:
            logger.error(f"Similar content search failed: {e}")
            return []

    def search_by_user_interests(
        self,
        interest_embedding: np.ndarray,
        limit: int = 10,
        exclude_ids: List[str] = None
    ) -> List[Dict]:
        """
        Search content based on user interest embedding.

        Args:
            interest_embedding: User's interest vector
            limit: Max results
            exclude_ids: Content IDs to exclude (already seen)

        Returns:
            List of personalized content recommendations
        """
        try:
            # Build filter to exclude seen content
            query_filter = None
            if exclude_ids:
                query_filter = Filter(
                    must_not=[
                        FieldCondition(
                            key="content_id",
                            match=MatchValue(value=cid)
                        )
                        for cid in exclude_ids[:100]  # Limit filter size
                    ]
                )

            # Search
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=interest_embedding.tolist(),
                limit=limit,
                query_filter=query_filter
            )

            # Format results
            recommendations = []
            for result in results:
                recommendations.append({
                    "content_id": result.id,
                    "relevance_score": result.score,
                    "metadata": result.payload
                })

            logger.info(f"Generated {len(recommendations)} personalized recommendations")
            return recommendations

        except Exception as e:
            logger.error(f"Interest-based search failed: {e}")
            return []

    def delete_content_embedding(self, content_id: str):
        """
        Delete content embedding from Qdrant.

        Args:
            content_id: Content ID
        """
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[content_id]
            )
            logger.info(f"Deleted embedding for content: {content_id}")

        except Exception as e:
            logger.error(f"Failed to delete embedding {content_id}: {e}")

    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the collection.

        Returns:
            Dict with collection stats
        """
        try:
            info = self.client.get_collection(self.collection_name)

            return {
                "total_points": info.points_count,
                "vector_dim": info.config.params.vectors.size,
                "distance_metric": info.config.params.vectors.distance.name,
            }

        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {}


# Singleton
_vector_store = None


def get_vector_store() -> VectorStore:
    """Get or create vector store singleton"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
