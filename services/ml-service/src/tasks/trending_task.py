"""Celery task for pre-computing trending posts."""

import logging
import json
import asyncio
from celery import Task
from src.celery_app import app
from src.config import settings

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Custom Task class with error handling"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@app.task(base=CallbackTask, bind=True, max_retries=2)
def precompute_trending_posts(self, campus: str = "all"):
    """
    Pre-compute trending posts for a campus and cache to Redis.

    Args:
        campus: Campus identifier (default: "all")

    Flow:
        1. For each time window (6h, 24h, 7d)
        2. Call trending service to get trending posts
        3. Cache results to Redis with 15min TTL
    """
    logger.info(f"Starting trending pre-computation for campus: {campus}")

    try:
        # Import async dependencies
        from src.db.redis_client import get_redis_client
        from src.db.qdrant_client import get_qdrant_client
        from src.ml.embeddings import create_embeddings_service
        from src.ml.trending import create_trending_service

        # Initialize services
        redis_client = get_redis_client(settings.REDIS_URL)
        qdrant_client = get_qdrant_client(settings.QDRANT_URL)
        embeddings_service = create_embeddings_service(qdrant_client, settings.ML_MODEL)
        trending_service = create_trending_service(qdrant_client, embeddings_service)

        # Time windows to pre-compute
        time_windows = ["6h", "24h", "7d"]

        # Run async operations in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Connect Redis
            loop.run_until_complete(redis_client.connect())

            results = {}
            for time_window in time_windows:
                cache_key = f"trending:{campus}:{time_window}"

                logger.info(f"Computing trending for {campus}/{time_window}")

                # Get trending posts
                trending_data = loop.run_until_complete(
                    trending_service.get_trending_posts(
                        campus=campus,
                        time_window=time_window,
                        limit=10
                    )
                )

                # Build response structure
                response = {
                    "topics": trending_data,
                    "computed_at": int(asyncio.get_event_loop().time()),
                    "cache_ttl": 900
                }

                # Cache to Redis (15 min TTL)
                loop.run_until_complete(
                    redis_client.setex(
                        cache_key,
                        900,  # 15 minutes
                        json.dumps(response)
                    )
                )

                results[time_window] = len(trending_data)
                logger.info(f"Cached {len(trending_data)} topics for {campus}/{time_window}")

        finally:
            loop.close()

        logger.info(f"Trending pre-computation complete for {campus}: {results}")
        return {
            "status": "success",
            "campus": campus,
            "results": results
        }

    except Exception as e:
        logger.error(f"Trending pre-computation failed for {campus}: {e}")
        raise
