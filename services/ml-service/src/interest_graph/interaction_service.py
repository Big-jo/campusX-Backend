"""
NATS-based interaction tracking service.
Listens for user interaction events and updates interest graph.
"""

import logging
import asyncio
import json
from typing import Dict
from nats.aio.client import Client as NATS
from src.config import settings
from src.interest_graph.interest_tracker import get_interest_tracker

logger = logging.getLogger(__name__)


class InteractionService:
    """
    Listens for user interaction events via NATS and updates interest graph.
    """

    def __init__(self):
        self.nc = NATS()
        self.interest_tracker = get_interest_tracker()

        # Interaction weights
        self.interaction_weights = {
            "view": 0.1,
            "like": 0.5,
            "share": 1.0,
            "comment": 0.7,
            "bookmark": 0.8,
        }

    async def connect(self):
        """Connect to NATS"""
        try:
            await self.nc.connect(settings.NATS_URL)
            logger.info(f"Connected to NATS: {settings.NATS_URL}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            raise

    async def start(self):
        """Start listening for interaction events"""
        try:
            await self.connect()

            # Subscribe to interaction events
            await self.nc.subscribe("user.interaction.*", cb=self._handle_interaction)

            logger.info("Interaction service started, listening for events...")

            # Keep alive
            while True:
                await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Interaction service failed: {e}")
            await self.stop()

    async def _handle_interaction(self, msg):
        """
        Handle incoming interaction event.

        Event format:
        {
            "user_id": "123",
            "content_id": "abc",
            "post_id": "xyz",
            "interaction_type": "like",
            "timestamp": "2025-11-25T10:30:00Z"
        }
        """
        try:
            # Parse event
            event = json.loads(msg.data.decode())

            user_id = event.get("user_id")
            content_id = event.get("content_id")
            post_id = event.get("post_id")
            interaction_type = event.get("interaction_type")

            if not user_id or not (content_id or post_id):
                logger.warning(f"Invalid interaction event: {event}")
                return

            # If only post_id provided, lookup content_id
            if post_id and not content_id:
                content_id = await self._get_content_id_from_post(post_id)

            if not content_id:
                logger.warning(f"No content_id found for post {post_id}")
                return

            # Get interaction weight
            weight = self.interaction_weights.get(interaction_type, 0.1)

            # Track interaction
            self.interest_tracker.track_interaction(
                user_id=user_id,
                content_id=content_id,
                interaction_type=interaction_type,
                weight=weight
            )

            logger.info(
                f"Processed {interaction_type} from user {user_id} "
                f"on content {content_id} (weight={weight})"
            )

        except Exception as e:
            logger.error(f"Failed to handle interaction: {e}", exc_info=True)

    async def _get_content_id_from_post(self, post_id: str) -> str:
        """Lookup content_id from post_id (if needed)"""
        try:
            from src.db.mongodb import get_sync_db, COLLECTIONS

            db = get_sync_db()
            post = db[COLLECTIONS.get("posts", "posts")].find_one({"_id": post_id})

            if post:
                return str(post.get("contentId", ""))

            return ""

        except Exception as e:
            logger.error(f"Failed to lookup content_id from post: {e}")
            return ""

    async def stop(self):
        """Stop service and disconnect"""
        try:
            if self.nc.is_connected:
                await self.nc.close()
                logger.info("Disconnected from NATS")
        except Exception as e:
            logger.error(f"Error stopping service: {e}")


# Run as standalone service
async def main():
    """Main entry point for interaction service"""
    service = InteractionService()

    try:
        await service.start()
    except KeyboardInterrupt:
        logger.info("Shutting down interaction service...")
        await service.stop()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    asyncio.run(main())
