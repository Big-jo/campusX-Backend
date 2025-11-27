import logging
from datetime import datetime
from bson import ObjectId
from celery import Task
from src.celery_app import app
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.search.content_source import get_content_source, DEFAULT_SOURCE, SourceType
from src.scraper.scraper import get_scraper
from src.scraper.processor import get_processor
from src.config import settings

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Custom Task class for cleanup"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@app.task(base=CallbackTask, bind=True, max_retries=3)
def scrape_by_interest(self, bot_id: str, interest_category: str):
    """
    Scrape content for a specific interest category

    Args:
        bot_id: Bot user ID (ObjectId string)
        interest_category: Interest category name (e.g., "Technology")

    Flow:
        1. Get bot config from MongoDB
        2. Search for URLs using Gemini Search
        3. Scrape each URL
        4. Process content (markdown + GCS upload)
        5. Write to MongoDB (status='pending')
    """
    logger.info(f"Starting scrape task for {interest_category} (bot: {bot_id})")

    try:
        db = get_sync_db()

        # 1. Get bot config
        # TODO: We alredy got this in first connection (optimise)
        bot = db[COLLECTIONS["bots"]].find_one({"user_id": ObjectId(bot_id)})
        if not bot:
            logger.error(f"Bot not found: {bot_id}")
            return {"status": "error", "message": "Bot not found"}

        keywords = bot.get("config", {}).get("keywords", [])
        if not keywords:
            logger.warning(f"No keywords configured for bot {bot_id}")
            keywords = [interest_category.lower()]

        logger.info(f"Bot config: keywords={keywords}")

        # 2. Search for URLs (using configured source: RSS, Gemini, etc.)
        source = get_content_source(SourceType.RSS)
        search_results = source.search(
            interest_category=interest_category,
            keywords=keywords,
            limit=settings.GEMINI_SEARCH_MAX_RESULTS,
        )

        if not search_results:
            logger.warning(f"No search results for {interest_category}")
            return {"status": "success", "scraped": 0, "message": "No search results"}

        logger.info(f"Found {len(search_results)} URLs (source: {DEFAULT_SOURCE})")

        # 3. Scrape and process each URL
        scraper = get_scraper()
        processor = get_processor()
        scraped_count = 0
        skipped_count = 0

        for result in search_results:
            url = result["url"]

            try:
                # Check if already scraped
                existing = db[COLLECTIONS["scraped_content"]].find_one({"url": url})
                if existing:
                    logger.info(f"Skipping already scraped URL: {url}")
                    skipped_count += 1
                    continue

                # Scrape
                scraped_data = scraper.scrape(url)
                if not scraped_data:
                    logger.warning(f"Failed to scrape: {url}")
                    continue

                # Process
                processed = processor.process(scraped_data)

                # Quality filter
                if processed["qualityScore"] < settings.MIN_QUALITY_SCORE:
                    logger.info(
                        f"Rejected low-quality content: {url} "
                        f"(score: {processed['qualityScore']})"
                    )
                    continue

                if processed["metadata"]["wordCount"] < settings.MIN_WORD_COUNT:
                    logger.info(
                        f"Rejected short content: {url} "
                        f"(words: {processed['metadata']['wordCount']})"
                    )
                    continue

                # 4. Extract domain
                from urllib.parse import urlparse

                domain = urlparse(url).netloc
                if domain.startswith("www."):
                    domain = domain[4:]

                # 5. Write to MongoDB (save scraped data with raw image URLs)
                scraped_content_doc = {
                    "url": processed["url"],
                    "title": processed["title"],
                    "content": processed["content"],
                    "images": scraped_data.get("images", []),  # Raw image URLs (not GCS)
                    "keywords": processed["keywords"],
                    "sourceDomain": domain,
                    "interestCategory": interest_category,
                    "scrapedAt": datetime.utcnow(),
                    "qualityScore": processed["qualityScore"],
                    "status": "pending",
                    "usedByBots": [],
                    "metadata": processed["metadata"],
                }

                db[COLLECTIONS["scraped_content"]].insert_one(scraped_content_doc)

                logger.info(
                    f"Scraped and saved: {processed['title']} "
                    f"(score: {processed['qualityScore']:.2f}, "
                    f"words: {processed['metadata']['wordCount']})"
                )

                scraped_count += 1

            except Exception as e:
                logger.error(f"Failed to process URL {url}: {e}")
                continue

        logger.info(
            f"Scraping complete for {interest_category}: "
            f"{scraped_count} new, {skipped_count} skipped"
        )

        return {
            "status": "success",
            "scraped": scraped_count,
            "skipped": skipped_count,
            "category": interest_category,
        }

    except Exception as e:
        logger.error(f"Scraping task failed for {interest_category}: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2**self.request.retries))
