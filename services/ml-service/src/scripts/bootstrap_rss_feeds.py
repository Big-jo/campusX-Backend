"""
Bootstrap RSS feeds dynamically from InterestCategories collection.
Discovers feeds for all categories and topics in the system.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.search.serper_searcher import get_serper_searcher
from src.feed_manager.feed_tracker import get_feed_tracker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def load_interest_categories() -> List[Dict]:
    """
    Load interest categories from MongoDB.

    Returns:
        List of interest category documents with topics
    """
    db = get_sync_db()
    categories = list(db[COLLECTIONS.get("interest_categories", "interestcategories")].find({}))

    logger.info(f"Loaded {len(categories)} interest categories from MongoDB")

    return categories


async def discover_feeds_for_search_term(
    search_term: str,
    category_id: str = None,
    topic_id: str = None,
    limit: int = 10
) -> int:
    """
    Discover RSS feeds for a search term (category or topic).

    Args:
        search_term: Category or topic name to search
        category_id: InterestCategory ID (for linking)
        topic_id: Topic ID if this is a topic (optional)
        limit: Max feeds to discover

    Returns:
        Number of feeds discovered and stored
    """
    logger.info(f"Discovering feeds for: {search_term}")

    try:
        db = get_sync_db()
        collection = db[COLLECTIONS.get("rss_sources", "rsssources")]
        searcher = get_serper_searcher()
        tracker = get_feed_tracker()

        # Discover feeds
        feeds = searcher.discover_rss_feeds(search_term, limit)
        
        if not feeds:
            logger.warning(f"No feeds discovered for {search_term}")
            return 0

        stored_count = 0
        validated_count = 0

        for feed in feeds:
            try:
                feed_url = feed["url"]

                # Check if already exists
                existing = collection.find_one({"url": feed_url})
                if existing:
                    logger.info(f"Feed already exists: {feed_url}")
                    continue

                # Validate feed before storing
                validation = tracker.validate_feed(feed_url)

                if not validation["valid"]:
                    logger.warning(
                        f"Feed validation failed: {feed_url} - {validation['error']}"
                    )
                    continue

                validated_count += 1

                # Calculate initial quality score
                article_count = validation["article_count"]
                initial_quality = min(article_count / 20, 1.0) * 0.7  # Conservative

                # Store feed
                feed_doc = {
                    "url": feed_url,
                    "category": search_term,
                    "category_id": category_id,
                    "topic_id": topic_id,
                    "discovered_via": "serper",
                    "quality_score": initial_quality,
                    "last_fetched": None,
                    "active": True,
                    "metadata": {
                        "title": validation.get("feed_title", feed.get("title", "")),
                        "description": validation.get("feed_description", ""),
                        "source": feed.get("source", ""),
                        "initial_article_count": article_count,
                        "stats": {
                            "total_fetches": 0,
                            "successful_fetches": 0,
                            "failed_fetches": 0,
                            "total_articles": 0,
                            "avg_articles_per_fetch": 0.0,
                        },
                    },
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }

                collection.insert_one(feed_doc)
                stored_count += 1

                logger.info(
                    f"Stored feed: {feed_url} ({article_count} articles, "
                    f"quality={initial_quality:.2f})"
                )

            except Exception as e:
                logger.error(f"Failed to process feed {feed.get('url')}: {e}")
                continue

        logger.info(
            f"Search term '{search_term}': discovered {len(feeds)}, "
            f"validated {validated_count}, stored {stored_count}"
        )

        return stored_count

    except Exception as e:
        logger.error(f"Failed to discover feeds for {search_term}: {e}", exc_info=True)
        return 0


async def bootstrap_category(category: Dict, feeds_per_item: int = 5) -> int:
    """
    Bootstrap RSS feeds for a single category and its topics.

    Args:
        category: InterestCategory document
        feeds_per_item: Max feeds per category/topic

    Returns:
        Total feeds stored
    """
    category_id = category.get("id")
    category_name = category.get("name")

    logger.info(f"\n{'='*60}")
    logger.info(f"Bootstrapping category: {category_name} (ID: {category_id})")
    logger.info(f"{'='*60}")

    total_stored = 0

    # Discover feeds for main category
    count = await discover_feeds_for_search_term(
        search_term=category_name,
        category_id=category_id,
        topic_id=None,
        limit=feeds_per_item
    )
    total_stored += count

    # Small delay to avoid rate limiting
    await asyncio.sleep(2)

    # Discover feeds for each topic
    topics = category.get("topics", [])
    logger.info(f"Category has {len(topics)} topics")

    for topic in topics:
        topic_id = topic.get("id")
        topic_name = topic.get("name")

        logger.info(f"  Topic: {topic_name} (ID: {topic_id})")

        count = await discover_feeds_for_search_term(
            search_term=topic_name,
            category_id=category_id,
            topic_id=topic_id,
            limit=feeds_per_item
        )
        total_stored += count

        # Delay between topics
        await asyncio.sleep(2)

    logger.info(f"Category '{category_name}' complete: {total_stored} feeds stored\n")

    return total_stored


async def bootstrap_all_categories(feeds_per_item: int = 5):
    """
    Bootstrap all categories and topics from MongoDB.

    Args:
        feeds_per_item: Max feeds per category/topic
    """
    logger.info("=" * 60)
    logger.info("Starting Dynamic RSS Feed Bootstrap")
    logger.info("=" * 60)

    # Load categories from MongoDB
    categories = load_interest_categories()

    if not categories:
        logger.error("No interest categories found in MongoDB!")
        logger.error("Please ensure InterestCategory collection is populated in the main app")
        return 0

    total_stored = 0

    for category in categories:
        try:
            count = await bootstrap_category(category, feeds_per_item)
            total_stored += count
        except Exception as e:
            logger.error(f"Failed to bootstrap category {category.get('name')}: {e}")
            continue

    logger.info("=" * 60)
    logger.info(f"Bootstrap Complete: {total_stored} total feeds stored")
    logger.info("=" * 60)

    return total_stored


async def bootstrap_specific_categories(category_names: List[str], feeds_per_item: int = 5):
    """
    Bootstrap specific categories only.

    Args:
        category_names: List of category names to bootstrap
        feeds_per_item: Max feeds per category/topic
    """
    logger.info(f"Bootstrapping specific categories: {category_names}")

    # Load categories from MongoDB
    all_categories = load_interest_categories()

    # Filter to requested categories
    categories = [
        c for c in all_categories
        if c.get("name") in category_names
    ]

    if not categories:
        logger.error(f"No matching categories found for: {category_names}")
        return 0

    total_stored = 0

    for category in categories:
        count = await bootstrap_category(category, feeds_per_item)
        total_stored += count

    logger.info(f"Bootstrap complete: {total_stored} feeds stored")
    return total_stored


def show_stats():
    """Show current feed statistics"""
    db = get_sync_db()
    collection = db[COLLECTIONS.get("rss_sources", "rsssources")]
    categories_collection = db[COLLECTIONS.get("interest_categories", "interestcategories")]

    total = collection.count_documents({})
    active = collection.count_documents({"active": True})

    # Stats by category
    categories = list(categories_collection.find({}))
    by_category = {}

    for category in categories:
        category_id = category.get("id")
        category_name = category.get("name")
        count = collection.count_documents({
            "category_id": category_id,
            "active": True
        })
        by_category[category_name] = count

    logger.info("\n" + "=" * 60)
    logger.info("RSS Feed Statistics")
    logger.info("=" * 60)
    logger.info(f"Total feeds: {total}")
    logger.info(f"Active feeds: {active}")
    logger.info(f"\nBy Category:")

    for category_name, count in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
        logger.info(f"  {category_name:25} {count:3} feeds")

    logger.info("=" * 60 + "\n")


async def main():
    """Main bootstrap script"""
    import sys

    if len(sys.argv) > 1:
        # Bootstrap specific categories
        category_names = sys.argv[1:]
        logger.info(f"Bootstrapping specific categories: {category_names}")
        await bootstrap_specific_categories(category_names, feeds_per_item=5)
    else:
        # Bootstrap all categories
        await bootstrap_all_categories(feeds_per_item=5)

    # Show stats
    show_stats()


if __name__ == "__main__":
    asyncio.run(main())
