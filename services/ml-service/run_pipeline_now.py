#!/usr/bin/env python3
"""
Directly run the content pipeline for all active bots — no Celery needed.
Usage: python run_pipeline_now.py [--category Technology] [--limit 10] [--source search|rss|serper]
"""
import asyncio
import logging
import argparse
from datetime import datetime
from urllib.parse import urlparse
from bson import ObjectId

from src.db.mongodb import get_sync_db, COLLECTIONS
from src.pipeline.content_pipeline import get_pipeline
from src.pipeline.pipeline_config import PipelineConfig
from src.search.content_source import SourceType

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def run_for_category(category: str, keywords: list, source_type: SourceType, limit: int, bot_id: str = None):
    db = get_sync_db()

    config = PipelineConfig(
        enable_enrichment=True,
        enable_gcs_upload=False,
        enable_deduplication=True,
    )
    pipeline = get_pipeline(config)

    logger.info(f"[{category}] Running pipeline (source={source_type.value}, limit={limit})")
    enriched = await pipeline.run(
        interest_category=category,
        keywords=keywords,
        source_type=source_type,
        limit=limit,
    )

    if not enriched:
        logger.warning(f"[{category}] No content produced")
        return 0

    stored = 0
    for content in enriched:
        url = content["url"]
        if db[COLLECTIONS["scraped_content"]].find_one({"url": url}):
            logger.info(f"[{category}] Skipping duplicate: {url}")
            continue

        domain = urlparse(url).netloc.removeprefix("www.")
        doc = {
            "url": url,
            "title": content["title"],
            "content": content["content"],
            "images": content.get("images", []),
            "keywords": content.get("keywords", []),
            "sourceDomain": domain,
            "interestCategory": category,
            "enriched": content.get("enriched"),
            "qualityScore": content.get("qualityScore", 0.0),
            "scrapedAt": content.get("scrapedAt", datetime.utcnow()),
            "sourceType": source_type.value,
            "status": "pending",
            "usedByBots": [ObjectId(bot_id)] if bot_id else [],
            "metadata": content.get("metadata", {}),
        }
        result = db[COLLECTIONS["scraped_content"]].insert_one(doc)
        logger.info(f"[{category}] Saved: {content['title'][:60]}...")

        # Generate embedding
        try:
            from src.interest_graph.embeddings_generator import get_embeddings_generator
            from src.interest_graph.vector_store import get_vector_store
            gen = get_embeddings_generator()
            vs = get_vector_store()
            emb = gen.generate_content_embedding({**doc, "_id": result.inserted_id})
            vs.store_content_embedding(str(result.inserted_id), {**doc, "_id": result.inserted_id}, emb)
        except Exception as e:
            logger.warning(f"[{category}] Embedding skipped: {e}")

        stored += 1

    logger.info(f"[{category}] Done — {stored}/{len(enriched)} stored")
    return stored


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", help="Run for a specific category only")
    parser.add_argument("--limit", type=int, default=10, help="Max articles per bot (default: 10)")
    parser.add_argument("--source", default="search", choices=["search", "rss", "serper"])
    args = parser.parse_args()

    source_type = SourceType(args.source)
    db = get_sync_db()

    if args.category:
        bots = list(db[COLLECTIONS["bots"]].find({"status": "active", "botType": args.category}))
        if not bots:
            # Run without a specific bot
            logger.info(f"No active bots for '{args.category}', running pipeline directly")
            await run_for_category(args.category, [args.category.lower()], source_type, args.limit)
            return
    else:
        bots = list(db[COLLECTIONS["bots"]].find({"status": "active"}))

    if not bots:
        logger.error("No active bots found in DB")
        return

    logger.info(f"Found {len(bots)} active bot(s)")
    total = 0

    for bot in bots:
        category = bot.get("botType", "General")
        keywords = bot.get("config", {}).get("keywords", [category.lower()])
        bot_id = str(bot["user_id"])
        count = await run_for_category(category, keywords, source_type, args.limit, bot_id)
        total += count

    logger.info(f"\n✅ Total new content items saved: {total}")
    logger.info("Bot poster worker (BullMQ) will pick up 'pending' items and create posts.")


if __name__ == "__main__":
    asyncio.run(main())
