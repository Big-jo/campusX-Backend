"""
Auto-discovery orchestrator: Feedback loop for content discovery.
User interests → Detect topics → Generate queries → Discover feeds → New content
"""

import logging
from typing import List, Dict
from datetime import datetime
from bson import ObjectId
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.interest_graph.topic_detector import get_topic_detector
from src.interest_graph.query_generator import get_query_generator
from src.search.query_generator import get_query_generator as get_search_query_generator
from src.search.query_manager import get_query_manager
from src.search.query_tracker import get_query_tracker

logger = logging.getLogger(__name__)


class AutoDiscovery:
    """
    Orchestrates the feedback loop for automatic content discovery.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.topic_detector = get_topic_detector()
        self.query_generator = get_query_generator()
        self.search_query_gen = get_search_query_generator()
        self.query_manager = get_query_manager()
        self.query_tracker = get_query_tracker()
        self.categories_collection = self.db[COLLECTIONS.get("interest_categories", "interestcategories")]
        self.queries_collection = self.db[COLLECTIONS.get("search_queries", "searchqueries")]

    async def run_discovery_cycle(
        self,
        min_users: int = 5,
        max_new_categories: int = 5,
        queries_per_topic: int = 1
    ) -> Dict:
        """
        Run complete auto-discovery cycle.

        Args:
            min_users: Minimum users to detect emerging topic
            max_new_categories: Max new categories to create
            queries_per_topic: Search queries to generate per topic

        Returns:
            Summary of discovery cycle
        """
        logger.info("Starting auto-discovery cycle")

        try:
            # Step 1: Detect emerging topics
            emerging_topics = self.topic_detector.detect_emerging_topics(
                min_users=min_users,
                min_drift_score=0.3,
                lookback_days=7
            )

            if not emerging_topics:
                logger.info("No emerging topics detected")
                return {"status": "success", "new_categories": 0, "new_queries": 0}

            logger.info(f"Detected {len(emerging_topics)} emerging topics")

            # Step 2: Create new categories for truly new topics
            new_categories = []
            for topic_data in emerging_topics[:max_new_categories]:
                topic = topic_data["topic"]

                if topic_data["is_new_category"]:
                    # Create new category
                    category_id = await self._create_category(topic, topic_data)
                    if category_id:
                        new_categories.append({"name": topic, "id": category_id})
                        logger.info(f"Created new category: {topic}")

            # Step 3: Generate search queries for all emerging topics
            total_queries = 0
            for topic_data in emerging_topics:
                topic = topic_data["topic"]

                # Get category ID (either new or existing)
                category = self.categories_collection.find_one({"name": topic})
                if not category:
                    logger.warning(f"Category not found after creation: {topic}")
                    continue

                category_id = str(category["_id"])

                # Generate optimized query using Gemini
                query_text = self.search_query_gen.generate_query_for_category(topic)

                # Store query
                stored = await self._store_query(query_text, topic, category_id)
                if stored:
                    total_queries += 1

            logger.info(f"Discovery cycle complete: {len(new_categories)} categories, {total_queries} queries")

            return {
                "status": "success",
                "new_categories": len(new_categories),
                "categories": new_categories,
                "new_queries": total_queries,
                "timestamp": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Auto-discovery cycle failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    async def prioritize_content_gaps(self, limit: int = 5) -> List[Dict]:
        """
        Identify and prioritize content gaps for discovery.

        Args:
            limit: Max gaps to address

        Returns:
            List of prioritized gaps with discovery actions
        """
        try:
            gaps = self.topic_detector.analyze_content_gaps(limit=limit)

            if not gaps:
                return []

            # For each gap, generate discovery plan
            priorities = []
            for gap in gaps:
                category = gap["category"]

                # Find category in DB
                cat_doc = self.categories_collection.find_one({"name": category})
                if not cat_doc:
                    continue

                # Check existing query count
                query_count = self.queries_collection.count_documents({
                    "category": category,
                    "active": True
                })

                priorities.append({
                    "category": category,
                    "gap_score": gap["gap_score"],
                    "priority": gap["priority"],
                    "current_queries": query_count,
                    "current_content": gap["content_count"],
                    "user_interest": gap["interest_weight"],
                    "recommended_action": "generate_query" if query_count < 1 else "refine_query"
                })

            logger.info(f"Prioritized {len(priorities)} content gaps")
            return priorities

        except Exception as e:
            logger.error(f"Gap prioritization failed: {e}", exc_info=True)
            return []

    async def _create_category(self, topic: str, topic_data: Dict) -> str:
        """Create new interest category"""
        try:
            # Check if exists
            existing = self.categories_collection.find_one({"name": topic})
            if existing:
                return str(existing["_id"])

            # Suggest proper category name
            category_name = self.query_generator.suggest_category_name(topic)

            # Create category document
            category_doc = {
                "name": category_name,
                "description": f"Auto-discovered category based on user interests",
                "topics": [],  # Can be populated later
                "auto_discovered": True,
                "discovery_metadata": {
                    "user_count": topic_data.get("user_count", 0),
                    "avg_drift_score": topic_data.get("avg_drift_score", 0),
                    "detected_at": topic_data.get("detected_at", datetime.utcnow())
                },
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }

            result = self.categories_collection.insert_one(category_doc)
            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Failed to create category {topic}: {e}")
            return None

    async def _store_query(self, query_text: str, category: str, category_id: str) -> bool:
        """Store generated search query"""
        try:
            if not query_text:
                return False

            # Use query manager to store
            stored = self.query_manager.store_query(
                query_text=query_text,
                category=category,
                category_id=category_id,
                generated_via="auto_discovery"
            )

            if stored:
                logger.info(f"Stored query for {category}: {query_text}")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to store query for {category}: {e}")
            return False

    async def _store_feed_legacy(self, feed: Dict, category: str, category_id: str) -> bool:
        """Store discovered RSS feed (LEGACY - kept for migration reference)"""
        try:
            url = feed.get("url", "")
            if not url:
                return False

            # Check if exists
            existing = self.queries_collection.find_one({"url": url})
            if existing:
                logger.info(f"Feed already exists: {url}")
                return False

            # Store feed
            feed_doc = {
                "url": url,
                "category": category,
                "category_id": category_id,
                "topic_id": None,
                "discovered_via": "auto_discovery",
                "quality_score": 0.0,
                "last_fetched": None,
                "active": True,
                "metadata": {
                    "title": feed.get("title", ""),
                    "source": feed.get("source", ""),
                },
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }

            self.rss_collection.insert_one(feed_doc)
            logger.info(f"Stored new feed: {url}")
            return True

        except Exception as e:
            logger.error(f"Failed to store feed: {e}")
            return False


# Singleton
_auto_discovery = None


def get_auto_discovery() -> AutoDiscovery:
    """Get or create auto-discovery singleton"""
    global _auto_discovery
    if _auto_discovery is None:
        _auto_discovery = AutoDiscovery()
    return _auto_discovery
