"""
One-time migration script: RSS feeds → Search queries
Generates Gemini queries for existing categories and drops rsssources collection.
"""

import asyncio
import logging
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.search.query_generator import get_query_generator as get_gemini_query_generator
from src.search.query_manager import get_query_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate():
    """Run migration from RSS to search queries"""
    logger.info("Starting RSS → Search migration")

    try:
        db = get_sync_db()
        query_generator = get_gemini_query_generator()
        query_manager = get_query_manager()

        # Step 1: Get all categories
        categories_collection = db[COLLECTIONS.get("interest_categories", "interestcategories")]
        categories = list(categories_collection.find({}))

        logger.info(f"Found {len(categories)} categories")

        # Step 2: Generate queries for each category
        migrated_count = 0
        for category_doc in categories:
            category_name = category_doc.get("name")
            category_id = str(category_doc["_id"])

            logger.info(f"Generating query for: {category_name}")

            try:
                # Generate query
                query_text = query_generator.generate_query_for_category(category_name)

                # Store query
                stored = query_manager.store_query(
                    query_text=query_text,
                    category=category_name,
                    category_id=category_id,
                    generated_via="migration"
                )

                if stored:
                    migrated_count += 1
                    logger.info(f"✅ {category_name}: {query_text}")

            except Exception as e:
                logger.error(f"❌ Failed for {category_name}: {e}")
                continue

        # Step 3: Drop rsssources collection
        if "rsssources" in db.list_collection_names():
            db.rsssources.drop()
            logger.info("Dropped rsssources collection")

        # Step 4: Create indexes
        queries_collection = db[COLLECTIONS.get("search_queries", "searchqueries")]
        queries_collection.create_index([("category", 1), ("active", 1)])
        queries_collection.create_index([("quality_score", -1)])
        logger.info("Created indexes on searchqueries")

        logger.info(f"Migration complete: {migrated_count}/{len(categories)} queries generated")

    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(migrate())
