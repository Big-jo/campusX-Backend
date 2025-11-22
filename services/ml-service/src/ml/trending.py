"""Trending posts service using TF-IDF and engagement scoring."""

import logging
import math
import time
from typing import List, Dict, Any
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)


class TrendingService:
    """Service for calculating trending topics and posts."""

    def __init__(self, qdrant_client, embeddings_service):
        """
        Initialize trending service.

        Args:
            qdrant_client: Qdrant client for vector operations
            embeddings_service: Embeddings service for encoding topics
        """
        self.qdrant = qdrant_client
        self.embeddings = embeddings_service
        logger.info("Trending service initialized")

    def calculate_engagement_score(
        self,
        likes: int,
        dislikes: int,
        comments: int,
        created_at: int,
        is_local_trend: bool = True
    ) -> float:
        """
        Calculate engagement score with time decay.

        Formula:
            interactions = likes - dislikes + comments * 2
            velocity = interactions / age_hours
            decay = exp(-age_hours / 24)  # Half-life: 24hrs
            campus_boost = 2.0 if local else 1.0
            score = velocity * decay * campus_boost

        Args:
            likes: Number of likes
            dislikes: Number of dislikes
            comments: Number of comments
            created_at: Unix timestamp
            is_local_trend: Whether this is campus-specific

        Returns:
            Engagement score
        """
        now = int(time.time())
        age_hours = (now - created_at) / 3600

        # Prevent division by zero
        age_hours = max(age_hours, 0.5)

        # Calculate interactions (comments weighted 2x)
        interactions = likes - dislikes + (comments * 2)

        # Velocity (interactions per hour)
        velocity = interactions / age_hours

        # Time decay (exponential, half-life = 24 hours)
        decay = math.exp(-age_hours / 24)

        # Campus boost
        campus_multiplier = 2.0 if is_local_trend else 1.0

        # Final score
        score = velocity * decay * campus_multiplier

        return max(score, 0.0)

    def extract_trending_keywords(
        self,
        posts: List[Dict[str, Any]],
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Extract trending keywords using TF-IDF.

        Args:
            posts: List of post dictionaries with 'text' and 'hashtags'
            top_n: Number of top keywords to return

        Returns:
            List of trending topics with scores
        """
        if not posts:
            return []

        try:
            # Combine text and hashtags
            texts = []
            for post in posts:
                text = post.get("text", "")
                hashtags = " ".join(post.get("hashtags", []))
                texts.append(f"{text} {hashtags}")

            # TF-IDF vectorization
            vectorizer = TfidfVectorizer(
                max_features=100,
                stop_words="english",
                ngram_range=(1, 2),  # Unigrams and bigrams
                min_df=2  # Keyword must appear in at least 2 posts
            )

            tfidf_matrix = vectorizer.fit_transform(texts)
            feature_names = vectorizer.get_feature_names_out()

            # Sum TF-IDF scores across all documents
            scores = tfidf_matrix.sum(axis=0).A1

            # Get top keywords
            top_indices = scores.argsort()[-top_n:][::-1]

            trending_topics = [
                {
                    "topic": feature_names[i],
                    "score": float(scores[i])
                }
                for i in top_indices
                if scores[i] > 0
            ]

            return trending_topics

        except Exception as e:
            logger.error(f"TF-IDF extraction failed: {e}")
            return []

    async def get_trending_posts(
        self,
        campus: str,
        time_window: str = "6h",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get trending posts for a campus.

        This is a stub implementation that needs MongoDB integration.

        Args:
            campus: Campus identifier
            time_window: Time window ('6h', '24h', '7d')
            limit: Max number of topics

        Returns:
            List of trending topics with top posts
        """
        try:
            # Parse time window
            hours = {"6h": 6, "24h": 24, "7d": 168}[time_window]
            cutoff_time = int(time.time()) - (hours * 3600)

            # TODO: Fetch recent posts from MongoDB
            # For now, return empty (will be implemented in Phase 4)

            logger.warning("get_trending_posts is a stub - MongoDB integration needed")

            return []

        except Exception as e:
            logger.error(f"Failed to get trending posts: {e}")
            raise

    def extract_hashtags(self, text: str) -> List[str]:
        """
        Extract hashtags from text.

        Args:
            text: Text containing hashtags

        Returns:
            List of hashtags (without #)
        """
        words = text.split()
        hashtags = [
            word[1:].lower()
            for word in words
            if word.startswith("#") and len(word) > 1
        ]
        return hashtags


# Factory function
def create_trending_service(qdrant_client, embeddings_service):
    """Create and return TrendingService instance."""
    return TrendingService(qdrant_client, embeddings_service)
