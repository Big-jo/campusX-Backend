"""
Generate embeddings for content using sentence transformers.
Used for semantic similarity and personalization.
"""

import logging
import numpy as np
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from src.config import settings

logger = logging.getLogger(__name__)


class EmbeddingsGenerator:
    """
    Generate embeddings for content using pre-trained models.
    """

    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.ML_MODEL
        logger.info(f"Loading embeddings model: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model loaded. Embedding dimension: {self.embedding_dim}")

    def generate_content_embedding(self, content: Dict) -> np.ndarray:
        """
        Generate embedding for content.

        Args:
            content: Content dict with title and content fields

        Returns:
            Embedding vector (numpy array)
        """
        try:
            # Combine title and content for embedding
            title = content.get("title", "")
            text = content.get("content", "")

            # Use title + first 500 words of content for embedding
            words = text.split()[:500]
            combined_text = f"{title}. {' '.join(words)}"

            # Generate embedding
            embedding = self.model.encode(
                combined_text,
                convert_to_numpy=True,
                show_progress_bar=False
            )

            return embedding

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Return zero vector on error
            return np.zeros(self.embedding_dim)

    def generate_batch_embeddings(
        self, content_list: List[Dict]
    ) -> List[np.ndarray]:
        """
        Generate embeddings for multiple content items (batch processing).

        Args:
            content_list: List of content dicts

        Returns:
            List of embedding vectors
        """
        try:
            # Prepare texts
            texts = []
            for content in content_list:
                title = content.get("title", "")
                text = content.get("content", "")
                words = text.split()[:500]
                combined = f"{title}. {' '.join(words)}"
                texts.append(combined)

            # Batch encode
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 10,
                batch_size=settings.ML_BATCH_SIZE
            )

            return [emb for emb in embeddings]

        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            # Return zero vectors
            return [np.zeros(self.embedding_dim) for _ in content_list]

    def generate_query_embedding(self, query: str) -> np.ndarray:
        """
        Generate embedding for search query.

        Args:
            query: Search query string

        Returns:
            Embedding vector
        """
        try:
            embedding = self.model.encode(
                query,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            return embedding

        except Exception as e:
            logger.error(f"Query embedding failed: {e}")
            return np.zeros(self.embedding_dim)

    def compute_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """
        Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding
            embedding2: Second embedding

        Returns:
            Similarity score (0-1)
        """
        try:
            # Cosine similarity
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)

            # Normalize to 0-1 range (cosine can be -1 to 1)
            normalized = (similarity + 1) / 2

            return float(normalized)

        except Exception as e:
            logger.error(f"Similarity computation failed: {e}")
            return 0.0

    def compute_average_embedding(
        self, embeddings: List[np.ndarray], weights: List[float] = None
    ) -> np.ndarray:
        """
        Compute weighted average of embeddings.

        Args:
            embeddings: List of embedding vectors
            weights: Optional weights for each embedding

        Returns:
            Average embedding vector
        """
        if not embeddings:
            return np.zeros(self.embedding_dim)

        try:
            if weights:
                # Weighted average
                weighted = [emb * w for emb, w in zip(embeddings, weights)]
                avg = np.sum(weighted, axis=0) / sum(weights)
            else:
                # Simple average
                avg = np.mean(embeddings, axis=0)

            return avg

        except Exception as e:
            logger.error(f"Average embedding computation failed: {e}")
            return np.zeros(self.embedding_dim)


# Singleton
_generator = None


def get_embeddings_generator(model_name: str = None) -> EmbeddingsGenerator:
    """Get or create embeddings generator singleton"""
    global _generator
    if _generator is None:
        _generator = EmbeddingsGenerator(model_name)
    return _generator
