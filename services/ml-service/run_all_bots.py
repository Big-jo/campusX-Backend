#!/usr/bin/env python3
"""
Run scraping task once for all active bots
Usage: python run_all_bots.py
"""
import logging
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.tasks.scraper_task import scrape_by_interest
from bson import ObjectId

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Trigger scraping for all active bots once"""
    db = get_sync_db()

    # Find all active bots
    bots = db[COLLECTIONS["bots"]].find({"status": "active"})

    task_ids = []

    for bot in bots:
        bot_id = str(bot["user_id"])
        interest_category = bot["botType"]

        logger.info(f"Triggering scrape for {interest_category} (bot: {bot_id})")

        # Queue task
        task = scrape_by_interest.delay(bot_id, interest_category)
        task_ids.append(task.id)

        logger.info(f"  Task queued: {task.id}")

    logger.info(f"\n✅ Queued {len(task_ids)} scraping tasks")
    logger.info("Tasks will execute when Celery worker is running")

    # Print task IDs
    print("\nTask IDs:")
    for task_id in task_ids:
        print(f"  - {task_id}")

if __name__ == "__main__":
    main()
