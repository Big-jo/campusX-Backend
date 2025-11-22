"""
Main entry point for ML Service.

This service:
1. Subscribes to NATS events (post.created, post.updated)
2. Handles NATS requests (search, trending, user suggestions)
3. Runs alongside existing Celery workers
"""

import asyncio
import logging
import signal
import sys
from typing import Optional

from src.nats_handlers.client import NATSClient, nats_client
from src.nats_handlers.handlers import create_handlers
from src.db.qdrant_client import get_qdrant_client
from src.db.redis_client import get_redis_client
from src.ml.embeddings import create_embeddings_service
from src.ml.trending import create_trending_service
from src.ml.similarity import create_similarity_service
from src.config import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MLService:
    """Main ML Service coordinator."""

    def __init__(self):
        self.running = False
        self.handlers: Optional[any] = None

    async def initialize(self):
        """Initialize all services and connections."""
        logger.info("Initializing ML Service...")

        try:
            # Initialize Qdrant
            logger.info(f"Connecting to Qdrant at {config.QDRANT_URL}")
            qdrant = get_qdrant_client(config.QDRANT_URL)

            # Ensure collections exist
            qdrant.create_collections()

            # Initialize Redis
            logger.info(f"Connecting to Redis for caching")
            redis = get_redis_client(config.REDIS_URL)
            await redis.connect()

            # Initialize ML services
            logger.info(f"Loading ML model: {config.ML_MODEL}")
            embeddings_service = create_embeddings_service(qdrant, config.ML_MODEL)
            trending_service = create_trending_service(qdrant, embeddings_service)
            similarity_service = create_similarity_service(qdrant, embeddings_service)

            # Pre-load embedding model
            embeddings_service.load_model()
            logger.info("ML model loaded successfully")

            # Create NATS message handlers
            self.handlers = create_handlers(
                embeddings_service=embeddings_service,
                trending_service=trending_service,
                similarity_service=similarity_service,
                redis_client=redis
            )

            # Connect to NATS
            logger.info(f"Connecting to NATS at {config.NATS_URL}")
            await nats_client.connect(config.NATS_URL)

            # Subscribe to events
            await self.subscribe_to_events()

            # Subscribe to requests
            await self.subscribe_to_requests()

            logger.info("✅ ML Service initialized successfully")

        except Exception as e:
            logger.error(f"❌ Failed to initialize ML Service: {e}")
            raise

    async def subscribe_to_events(self):
        """Subscribe to NATS events (fire-and-forget)."""
        logger.info("Subscribing to events...")

        # Post created event
        await nats_client.subscribe(
            subject="ml.post.created",
            callback=self.handlers.handle_post_created,
            queue="ml_post_workers"  # Load balancing across instances
        )

        logger.info("  ✓ ml.post.created")

    async def subscribe_to_requests(self):
        """Subscribe to NATS request-reply subjects."""
        logger.info("Subscribing to requests...")

        # Semantic search
        await nats_client.subscribe(
            subject="ml.search.query",
            callback=self.handlers.handle_search_request,
            queue="ml_search_workers"
        )
        logger.info("  ✓ ml.search.query")

        # Trending posts
        await nats_client.subscribe(
            subject="ml.trending.request",
            callback=self.handlers.handle_trending_request,
            queue="ml_trending_workers"
        )
        logger.info("  ✓ ml.trending.request")

        # User suggestions
        await nats_client.subscribe(
            subject="ml.suggestions.request",
            callback=self.handlers.handle_user_suggestions_request,
            queue="ml_suggestions_workers"
        )
        logger.info("  ✓ ml.suggestions.request")

    async def run(self):
        """Run the service (keep alive)."""
        self.running = True

        logger.info("🚀 ML Service is running...")
        logger.info("Press Ctrl+C to stop")

        try:
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Service shutdown requested")

    async def shutdown(self):
        """Graceful shutdown."""
        logger.info("Shutting down ML Service...")

        self.running = False

        # Disconnect from NATS
        if nats_client.is_connected:
            await nats_client.disconnect()

        logger.info("✅ ML Service stopped")


# Global service instance
ml_service: Optional[MLService] = None


def signal_handler(signum, frame):
    """Handle shutdown signals."""
    logger.info(f"Received signal {signum}")
    if ml_service:
        asyncio.create_task(ml_service.shutdown())


async def main():
    """Main entry point."""
    global ml_service

    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        ml_service = MLService()
        await ml_service.initialize()
        await ml_service.run()

    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        if ml_service:
            await ml_service.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting...")
