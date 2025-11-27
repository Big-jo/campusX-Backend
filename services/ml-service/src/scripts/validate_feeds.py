"""
Feed validation and health check script.
Validates all feeds, disables broken ones, and generates report.
"""

import asyncio
import logging
from src.feed_manager.feed_tracker import get_feed_tracker
from src.db.mongodb import get_sync_db, COLLECTIONS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def validate_all_feeds():
    """
    Validate all RSS feeds in MongoDB.
    Test fetch, update quality scores, disable broken feeds.
    """
    logger.info("=" * 60)
    logger.info("Starting Feed Validation")
    logger.info("=" * 60)

    db = get_sync_db()
    collection = db[COLLECTIONS.get("rss_sources", "rsssources")]
    tracker = get_feed_tracker()

    # Get all feeds
    all_feeds = list(collection.find({}))
    logger.info(f"Found {len(all_feeds)} total feeds")

    results = {
        "valid": 0,
        "invalid": 0,
        "disabled": 0,
        "errors": []
    }

    for feed in all_feeds:
        feed_url = feed["url"]
        category = feed.get("category", "Unknown")

        logger.info(f"\nValidating: {feed_url}")
        logger.info(f"  Category: {category}")
        logger.info(f"  Current quality: {feed.get('quality_score', 0):.2f}")
        logger.info(f"  Active: {feed.get('active', False)}")

        # Validate
        validation = tracker.validate_feed(feed_url)

        if validation["valid"]:
            results["valid"] += 1
            logger.info(f"  ✓ Valid - {validation['article_count']} articles")

            # Track success
            tracker.track_fetch_success(feed_url, validation["article_count"])

        else:
            results["invalid"] += 1
            error = validation["error"]
            logger.warning(f"  ✗ Invalid - {error}")

            # Track failure
            tracker.track_fetch_failure(feed_url, error)

            # Check if should be disabled
            if feed.get("active", True):
                results["disabled"] += 1
                logger.warning(f"  → Disabling feed")

            results["errors"].append({
                "url": feed_url,
                "category": category,
                "error": error
            })

    # Run health check (disables stale feeds)
    logger.info("\n" + "=" * 60)
    logger.info("Running Health Check")
    logger.info("=" * 60)

    health_result = tracker.health_check_all(max_age_days=7)
    results["disabled"] += health_result["disabled_count"]

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("Validation Summary")
    logger.info("=" * 60)
    logger.info(f"Total feeds: {len(all_feeds)}")
    logger.info(f"Valid: {results['valid']}")
    logger.info(f"Invalid: {results['invalid']}")
    logger.info(f"Disabled: {results['disabled']}")

    if results["errors"]:
        logger.info(f"\nErrors ({len(results['errors'])}):")
        for err in results["errors"][:10]:  # Show first 10
            logger.info(f"  {err['category']}: {err['url']}")
            logger.info(f"    Error: {err['error']}")

    logger.info("=" * 60)

    return results


def show_feed_quality_report():
    """
    Show quality report for all categories.
    """
    logger.info("\n" + "=" * 60)
    logger.info("Feed Quality Report")
    logger.info("=" * 60)

    db = get_sync_db()
    collection = db[COLLECTIONS.get("rss_sources", "rsssources")]
    categories_collection = db[COLLECTIONS.get("interest_categories", "interestcategories")]

    # Get categories
    categories = list(categories_collection.find({}))

    report = []

    for category in categories:
        category_id = category.get("id")
        category_name = category.get("name")

        # Get feeds for this category
        feeds = list(collection.find({"category_id": category_id}))
        active_feeds = [f for f in feeds if f.get("active", True)]

        # Calculate average quality
        if active_feeds:
            avg_quality = sum(f.get("quality_score", 0) for f in active_feeds) / len(active_feeds)
        else:
            avg_quality = 0

        report.append({
            "category": category_name,
            "total": len(feeds),
            "active": len(active_feeds),
            "avg_quality": avg_quality
        })

    # Sort by avg quality descending
    report.sort(key=lambda x: x["avg_quality"], reverse=True)

    for item in report:
        logger.info(
            f"{item['category']:25} "
            f"Feeds: {item['active']:2}/{item['total']:2}  "
            f"Quality: {item['avg_quality']:.2f}"
        )

    logger.info("=" * 60)


def main():
    """Main validation script"""
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "report":
        # Just show quality report
        show_feed_quality_report()
    else:
        # Full validation
        validate_all_feeds()
        show_feed_quality_report()


if __name__ == "__main__":
    main()
