"""Embeddings service using Sentence Transformers."""

import logging
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingsService:
    """Service for generating and searching embeddings."""

    def __init__(self, qdrant_client, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embeddings service.

        Args:
            qdrant_client: Qdrant client for vector storage
            model_name: Sentence Transformers model name
        """
        self.qdrant = qdrant_client
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        logger.info(f"Embeddings service initialized with model: {model_name}")

    def load_model(self):
        """Load the sentence transformer model (lazy loading)."""
        if self.model is None:
            logger.info(f"Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Model loaded: {self.model_name}")

    def encode(self, text: str) -> List[float]:
        """
        Encode text to embedding vector.

        Args:
            text: Input text

        Returns:
            384-dimensional embedding vector
        """
        if self.model is None:
            self.load_model()

        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    async def generate_and_store(
        self,
        post_id: str,
        text: str,
        campus: str,
        author_id: str,
        created_at: int,
        hashtags: List[str] = None
    ):
        """
        Generate embedding for post and store in Qdrant.

        Args:
            post_id: Post MongoDB ObjectId
            text: Post content
            campus: Campus identifier
            author_id: Author's user ID
            created_at: Unix timestamp
            hashtags: List of hashtags
        """
        try:
            # Generate embedding
            vector = self.encode(text)
            print()
            # Store in Qdrant
            self.qdrant.upsert_post(
                post_id=post_id,
                vector=vector,
                campus=campus,
                author_id=author_id,
                created_at=created_at,
                hashtags=hashtags or [],
                engagement_score=0.0,  # Initial score
                sentiment=0.0  # TODO: Add sentiment analysis
            )

            logger.info(f"Generated and stored embedding for post {post_id}")

        except Exception as e:
            logger.error(f"Failed to generate/store embedding for {post_id}: {e}")
            raise

    async def search(
        self,
        query: str,
        campus: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Semantic search for posts.

        Args:
            query: Search query text
            campus: Campus filter
            filters: Additional filters (time_window, interests)
            limit: Max results

        Returns:
            Dict with post_ids and scores
        """
        try:
            # Encode search query
            query_vector = self.encode(query)

            # Search Qdrant
            results = self.qdrant.search_posts(
                query_vector=query_vector,
                campus=campus,
                limit=limit,
                filters=filters,
                score_threshold=0.3
            )

            return {
                "post_ids": [r["post_id"] for r in results],
                "scores": [r["score"] for r in results]
            }

        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise

    def build_user_profile(self, post_embeddings: List[List[float]]) -> List[float]:
        """
        Build user taste profile from post embeddings.

        Averages embeddings of posts user engaged with.

        Args:
            post_embeddings: List of embedding vectors

        Returns:
            Average embedding vector
        """
        if not post_embeddings:
            return []

        embeddings_array = np.array(post_embeddings)
        avg_embedding = np.mean(embeddings_array, axis=0)

        return avg_embedding.tolist()


# Factory function
def create_embeddings_service(qdrant_client, model_name: str = None):
    """Create and return EmbeddingsService instance."""
    import os
    model_name = model_name or os.getenv("ML_MODEL", "all-MiniLM-L6-v2")
    return EmbeddingsService(qdrant_client, model_name)
