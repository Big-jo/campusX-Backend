"""
Search query manager with MongoDB storage.
Manages search queries like RSS feeds - stores, retrieves, tracks quality.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class QueryManager:
    """
    Manages search queries in MongoDB.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.collection = self.db[COLLECTIONS.get("search_queries", "searchqueries")]

    def store_query(
        self,
        query_text: str,
        category: str,
        category_id: Optional[str] = None,
        generated_via: str = "manual"
    ) -> bool:
        """
        Store new search query.

        Args:
            query_text: The search query
            category: Interest category
            category_id: Category ObjectId (optional)
            generated_via: How it was generated (gemini, manual, auto_discovery)

        Returns:
            True if stored successfully
        """
        try:
            # Check if query already exists
            existing = self.collection.find_one({
                "query_text": query_text,
                "category": category
            })

            if existing:
                logger.info(f"Query already exists: {query_text}")
                return True

            # Create new query document
            query_doc = {
                "query_text": query_text,
                "category": category,
                "category_id": category_id,
                "generated_via": generated_via,
                "quality_score": 0.5,  # Initial neutral score
                "last_used": None,
                "active": True,
                "metadata": {
                    "stats": {
                        "total_searches": 0,
                        "successful_searches": 0,
                        "failed_searches": 0,
                        "total_results": 0,
                        "avg_results_per_search": 0.0
                    },
                    "success_rate": 0.0,
                    "last_error": None
                },
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }

            self.collection.insert_one(query_doc)
            logger.info(f"Stored query: {query_text} (category: {category})")
            return True

        except Exception as e:
            logger.error(f"Failed to store query: {e}")
            return False

    def get_query_for_category(
        self, category: str, min_quality: float = 0.3
    ) -> Optional[str]:
        """
        Get best active query for a category.

        Args:
            category: Interest category
            min_quality: Minimum quality score

        Returns:
            Query text or None
        """
        try:
            query_doc = self.collection.find_one(
                {
                    "category": category,
                    "active": True,
                    "quality_score": {"$gte": min_quality}
                },
                sort=[("quality_score", -1)]  # Best quality first
            )

            if query_doc:
                # Update last_used timestamp
                self.collection.update_one(
                    {"_id": query_doc["_id"]},
                    {"$set": {"last_used": datetime.utcnow()}}
                )
                return query_doc["query_text"]

            logger.warning(f"No active query found for category: {category}")
            return None

        except Exception as e:
            logger.error(f"Failed to get query for {category}: {e}")
            return None

    def get_active_queries(
        self, category: Optional[str] = None, min_quality: float = 0.3
    ) -> List[Dict]:
        """
        Get all active queries.

        Args:
            category: Filter by category (optional)
            min_quality: Minimum quality score

        Returns:
            List of query documents
        """
        query = {"active": True, "quality_score": {"$gte": min_quality}}

        if category:
            query["category"] = category

        queries = list(self.collection.find(query).sort("quality_score", -1))

        logger.info(
            f"Retrieved {len(queries)} active queries "
            f"(category={category}, min_quality={min_quality})"
        )

        return queries

    def update_query_quality(self, query_text: str, quality_score: float):
        """
        Update quality score for a query.

        Args:
            query_text: The query
            quality_score: New quality score
        """
        try:
            self.collection.update_one(
                {"query_text": query_text},
                {
                    "$set": {
                        "quality_score": quality_score,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            logger.debug(f"Updated quality for '{query_text}': {quality_score:.2f}")

        except Exception as e:
            logger.error(f"Failed to update quality: {e}")

    def disable_query(self, query_text: str):
        """
        Disable a query.

        Args:
            query_text: The query to disable
        """
        try:
            self.collection.update_one(
                {"query_text": query_text},
                {
                    "$set": {
                        "active": False,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Disabled query: {query_text}")

        except Exception as e:
            logger.error(f"Failed to disable query: {e}")


# Singleton
_manager = None


def get_query_manager() -> QueryManager:
    """Get or create query manager singleton"""
    global _manager
    if _manager is None:
        _manager = QueryManager()
    return _manager
