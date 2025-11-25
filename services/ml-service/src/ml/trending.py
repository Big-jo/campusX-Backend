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

        Args:
            campus: Campus identifier
            time_window: Time window ('6h', '24h', '7d')
            limit: Max number of topics

        Returns:
            List of trending topics with top posts
        """
        try:
            from src.db.mongodb import get_async_db, COLLECTIONS

            # Parse time window
            hours = {"6h": 6, "24h": 24, "7d": 168}[time_window]
            cutoff_time = int(time.time()) - (hours * 3600)

            # Fetch recent posts from MongoDB
            db = await get_async_db()
            posts_col = db[COLLECTIONS["posts"]]
            print(posts_col)

            # Query: campus filter, type=post, recent, sort by engagement
            query = {
                "type": "post",
                "createdAt": {"$gte": cutoff_time}
            }

            if campus != "all":
                query["campus"] = campus

            # Fetch posts with engagement data
            cursor = posts_col.find(query)
            posts = await cursor.to_list(length=1000)
            print(f"Fetched {len(posts)} posts")

            if not posts:
                return []

            # Calculate engagement scores for all posts
            for post in posts:
                post["engagement_score"] = self.calculate_engagement_score(
                    likes=post.get("likes", 0),
                    dislikes=post.get("dislikes", 0),
                    comments=post.get("comments", 0),
                    created_at=post.get("createdAt", cutoff_time),
                    is_local_trend=(campus != "all")
                )

            # Sort by engagement score
            posts.sort(key=lambda p: p["engagement_score"], reverse=True)

            # Take top posts for topic extraction
            top_posts = posts[:100]

            # Extract trending keywords using TF-IDF
            trending_topics = self.extract_trending_keywords(top_posts, top_n=limit)

            if not trending_topics:
                # If no topics found, return top posts by engagement
                return [
                    {
                        "topic": "trending posts",
                        "score": 1.0,
                        "post_ids": [str(p["_id"]) for p in posts[:limit]],
                        "hashtags": []
                    }
                ]

            # For each topic, find related posts using semantic similarity
            result = []
            for topic_data in trending_topics:
                topic = topic_data["topic"]

                # Encode topic to vector
                topic_vector = self.embeddings.encode(topic)

                # Search Qdrant for posts similar to this topic
                search_results = self.qdrant.search_posts(
                    query_vector=topic_vector,
                    campus=campus,
                    limit=5,
                    filters={"created_at": {"gte": cutoff_time}}
                )

                # Extract post IDs and hashtags
                post_ids = [r["post_id"] for r in search_results if "post_id" in r]

                # Collect hashtags from matched posts
                hashtags = []
                for post in posts:
                    if str(post["_id"]) in post_ids:
                        hashtags.extend(post.get("hashTags", []))

                # Count hashtag frequency
                hashtag_counts = Counter(hashtags)
                top_hashtags = [tag for tag, _ in hashtag_counts.most_common(3)]

                result.append({
                    "topic": topic,
                    "score": topic_data["score"],
                    "post_ids": post_ids,
                    "hashtags": top_hashtags
                })

            return result

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
