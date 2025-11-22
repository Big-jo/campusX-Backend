"""
Manual test script for scraper debugging
Set breakpoints in this file or in the scraper modules
"""
import sys
import os

# Ensure proper import path
sys.path.insert(0, os.path.dirname(__file__))

from src.db.mongodb import get_sync_db, COLLECTIONS
from src.tasks.scraper_task import scrape_by_interest


def main():
    """Manual trigger for testing/debugging scraper"""

    # Get first active bot from DB
    db = get_sync_db()
    bot = db[COLLECTIONS["bots"]].find_one({"status": "active"})

    if not bot:
        print("❌ No active bots found. Run: yarn seed:bots")
        return

    bot_id = str(bot["user_id"])
    interest_category = bot["botType"]

    print(f"🤖 Testing scraper for bot:")
    print(f"   Bot ID: {bot_id}")
    print(f"   Interest: {interest_category}")
    print(f"   Keywords: {bot['config']['keywords']}")
    print("\n🔍 Starting scrape...\n")

    # Set breakpoint here or in scraper_task.py to debug
    result = scrape_by_interest(bot_id, interest_category)

    print("\n✅ Scraping complete!")
    print(f"   Result: {result}")

    # Check scraped content
    scraped_count = db[COLLECTIONS["scraped_content"]].count_documents({
        "interestCategory": interest_category
    })
    print(f"\n📊 Total scraped content for {interest_category}: {scraped_count}")


if __name__ == "__main__":
    main()
