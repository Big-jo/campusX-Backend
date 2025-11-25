#!/usr/bin/env python3
"""
Backfill embeddings for existing posts.

This script:
1. Fetches all posts from MongoDB
2. Generates embeddings for each post
3. Stores embeddings in Qdrant

Usage:
    python backfill_embeddings.py [--limit 1000] [--batch-size 32]
"""

import sys
import os
import argparse
import asyncio
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.db.qdrant_client import get_qdrant_client
from src.db.mongodb import get_async_db
from src.ml.embeddings import create_embeddings_service
from src.config import config
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def fetch_posts(limit: int = None) -> List[Dict[str, Any]]:
    """
    Fetch posts from MongoDB.

    Args:
        limit: Max number of posts to fetch (None = all)

    Returns:
        List of post documents
    """
    try:
        db = await get_async_db()
        posts_collection = db['posts']

        # Build query
        query = {"type": "post"}  # Only main posts, not comments

        # Fetch posts
        cursor = posts_collection.find(query)

        if limit:
            cursor = cursor.limit(limit)

        posts = await cursor.to_list(length=None)

        logger.info(f"Fetched {len(posts)} posts from MongoDB")
        return posts

    except Exception as e:
        logger.error(f"Failed to fetch posts: {e}")
        raise


async def backfill_posts(posts: List[Dict[str, Any]], batch_size: int = 32):
    """
    Generate and store embeddings for posts.

    Args:
        posts: List of post documents
        batch_size: Number of posts to process in parallel
    """
    try:
        # Initialize services
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant = get_qdrant_client(qdrant_url)

        embeddings_service = create_embeddings_service(qdrant)

        # Load model once
        embeddings_service.load_model()

        logger.info(f"Processing {len(posts)} posts in batches of {batch_size}...")

        processed = 0
        failed = 0

        # Process in batches
        for i in range(0, len(posts), batch_size):
            batch = posts[i:i + batch_size]

            tasks = []
            for post in batch:
                # Extract post data
                post_id = str(post['_id'])
                text = post.get('text', '')
                campus = post.get('campus', 'unknown')
                author_id = str(post.get('author', ''))
                created_at = post.get('createdAt', 0)
                hashtags = post.get('hashTags', [])

                # Skip if no text
                if not text or len(text.strip()) < 10:
                    continue

                # Create task
                task = embeddings_service.generate_and_store(
                    post_id=post_id,
                    text=text,
                    campus=campus,
                    author_id=author_id,
                    created_at=created_at,
                    hashtags=hashtags
                )
                tasks.append(task)

            # Execute batch
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Count successes/failures
            for result in results:
                if isinstance(result, Exception):
                    failed += 1
                    logger.warning(f"Failed to process post: {result}")
                else:
                    processed += 1

            # Progress update
            logger.info(f"Progress: {processed + failed}/{len(posts)} "
                       f"(✅ {processed} | ❌ {failed})")

        logger.info(f"\n✅ Backfill complete!")
        logger.info(f"  Processed: {processed}")
        logger.info(f"  Failed: {failed}")

    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Backfill post embeddings')
    parser.add_argument('--limit', type=int, default=None,
                       help='Max number of posts to process (default: all)')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Batch size for parallel processing (default: 32)')

    args = parser.parse_args()

    try:
        logger.info("Starting embeddings backfill...")
        logger.info(f"  Limit: {args.limit or 'all'}")
        logger.info(f"  Batch size: {args.batch_size}")

        # Run async operations
        async def run():
            posts = await fetch_posts(limit=args.limit)

            if not posts:
                logger.warning("No posts found to backfill")
                return

            await backfill_posts(posts, batch_size=args.batch_size)

        asyncio.run(run())

    except KeyboardInterrupt:
        logger.warning("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Backfill failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
