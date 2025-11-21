#!/usr/bin/env python3
"""
Check scraping results in MongoDB
Usage: python check_results.py
"""
import logging
from src.db.mongodb import get_sync_db, COLLECTIONS
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Check scraped content statistics"""
    db = get_sync_db()

    # Count by status
    total = db[COLLECTIONS["scraped_content"]].count_documents({})
    pending = db[COLLECTIONS["scraped_content"]].count_documents({"status": "pending"})
    posted = db[COLLECTIONS["scraped_content"]].count_documents({"status": "posted"})

    print(f"\n📊 Scraped Content Stats:")
    print(f"   Total: {total}")
    print(f"   Pending: {pending}")
    print(f"   Posted: {posted}")

    # Recent scrapes (last hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db[COLLECTIONS["scraped_content"]].count_documents({
        "scrapedAt": {"$gte": one_hour_ago}
    })
    print(f"   Last hour: {recent}")

    # By category
    print(f"\n📂 By Category:")
    pipeline = [
        {"$group": {"_id": "$interestCategory", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    for result in db[COLLECTIONS["scraped_content"]].aggregate(pipeline):
        print(f"   {result['_id']}: {result['count']}")

    # Latest 5 articles
    print(f"\n📰 Latest Articles:")
    latest = db[COLLECTIONS["scraped_content"]].find(
        {},
        {"title": 1, "interestCategory": 1, "qualityScore": 1, "scrapedAt": 1}
    ).sort("scrapedAt", -1).limit(5)

    for article in latest:
        print(f"   [{article['interestCategory']}] {article['title']}")
        print(f"      Score: {article.get('qualityScore', 0):.2f} | {article['scrapedAt']}")

if __name__ == "__main__":
    main()
