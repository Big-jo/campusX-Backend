"""
NATS-based interaction tracking service.
Listens for user interaction events and updates interest graph.
"""

import logging
import asyncio
import json
import time
from typing import Dict
from nats.aio.client import Client as NATS
from bson import ObjectId
from src.config import settings
from src.interest_graph.interest_tracker import get_interest_tracker

logger = logging.getLogger(__name__)

# DB-backed category map cache (refreshed every 5 minutes)
_category_cache: dict = {}
_cache_ts: float = 0
_CACHE_TTL = 300  # seconds


def _build_category_map() -> dict:
    """
    Build hashtag→category map from live interestcategories collection.
    Includes both category names and their topic names as keys so newly
    auto-discovered categories are picked up automatically.
    """
    from src.db.mongodb import get_sync_db, COLLECTIONS
    mapping = {}
    try:
        db = get_sync_db()
        for cat in db[COLLECTIONS.get("interest_categories", "interestcategories")].find(
            {}, {"name": 1, "topics": 1}
        ):
            name = cat.get("name", "")
            if not name:
                continue
            mapping[name.lower()] = name
            for topic in cat.get("topics", []):
                t = topic.get("name", "").lower()
                if t:
                    mapping[t] = name
    except Exception as e:
        logger.warning(f"Failed to build category map from DB: {e}")
    return mapping


def _get_category_map() -> dict:
    global _category_cache, _cache_ts
    if not _category_cache or (time.time() - _cache_ts) > _CACHE_TTL:
        _category_cache = _build_category_map()
        _cache_ts = time.time()
        logger.debug(f"Category map refreshed: {len(_category_cache)} entries")
    return _category_cache


def _hashtags_to_category(hashtags: list) -> str:
    """
    Map post hashtags to an interest category using the live DB map.
    Falls back to substring matching for compound hashtags (e.g. #machinelearning).
    """
    mapping = _get_category_map()
    for tag in hashtags:
        clean = tag.lower().lstrip("#")
        # Exact match first
        if clean in mapping:
            return mapping[clean]
        # Substring match: handles compound hashtags like "machinelearning" → "machine learning"
        for key, cat in mapping.items():
            if clean in key or key in clean:
                return cat
    return ""


class InteractionService:
    """
    Listens for user interaction events via NATS and updates interest graph.
    """

    def __init__(self):
        self.nc = NATS()
        self.interest_tracker = get_interest_tracker()

        self.interaction_weights = {
            "view": 0.1,
            "like": 0.5,
            "share": 1.0,
            "comment": 0.7,
            "bookmark": 0.8,
        }

    async def connect(self):
        try:
            await self.nc.connect(settings.NATS_URL)
            logger.info(f"Connected to NATS: {settings.NATS_URL}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            raise

    async def start(self):
        try:
            await self.connect()
            await self.nc.subscribe("user.interaction.*", cb=self._handle_interaction)
            logger.info("Interaction service started, listening for events...")
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
            "content_id": "abc",  # may be empty for user posts
            "post_id": "xyz",
            "interaction_type": "like",
            "timestamp": "2025-11-25T10:30:00Z"
        }
        """
        try:
            event = json.loads(msg.data.decode())

            user_id = event.get("user_id")
            content_id = event.get("content_id", "")
            post_id = event.get("post_id", "")
            interaction_type = event.get("interaction_type")

            if not user_id or not (content_id or post_id):
                logger.warning(f"Invalid interaction event: {event}")
                return

            # If content_id is missing, try to resolve it from the post
            category_override = None
            if not content_id and post_id:
                content_id = await self._get_content_id_from_post(post_id)
                if not content_id:
                    # Fall back to hashtag-based category for user-generated posts
                    category_override = await self._get_category_from_post_hashtags(post_id)
                    if not category_override:
                        logger.debug(
                            f"Skipping interaction: no content or category for post {post_id}"
                        )
                        return

            weight = self.interaction_weights.get(interaction_type, 0.1)

            self.interest_tracker.track_interaction(
                user_id=user_id,
                content_id=content_id,
                interaction_type=interaction_type,
                weight=weight,
                category_override=category_override,
            )

            logger.info(
                f"Processed {interaction_type} from user {user_id} "
                f"on content {content_id or post_id} (weight={weight})"
            )

        except Exception as e:
            logger.error(f"Failed to handle interaction: {e}", exc_info=True)

    async def _get_content_id_from_post(self, post_id: str) -> str:
        """Lookup content_id from post_id."""
        try:
            from src.db.mongodb import get_sync_db, COLLECTIONS
            db = get_sync_db()
            # Bug fix: must use ObjectId, not raw string
            post = db[COLLECTIONS.get("posts", "posts")].find_one(
                {"_id": ObjectId(post_id)}
            )
            if post:
                return str(post.get("contentId", ""))
            return ""
        except Exception as e:
            logger.error(f"Failed to lookup content_id from post: {e}")
            return ""

    async def _get_category_from_post_hashtags(self, post_id: str) -> str:
        """Infer interest category from post hashtags when no contentId exists."""
        try:
            from src.db.mongodb import get_sync_db, COLLECTIONS
            db = get_sync_db()
            post = db[COLLECTIONS.get("posts", "posts")].find_one(
                {"_id": ObjectId(post_id)},
                {"hashTags": 1}
            )
            if not post or not post.get("hashTags"):
                return ""
            return _hashtags_to_category(post["hashTags"])
        except Exception as e:
            logger.error(f"Failed to infer category from post hashtags: {e}")
            return ""

    async def stop(self):
        try:
            if self.nc.is_connected:
                await self.nc.close()
                logger.info("Disconnected from NATS")
        except Exception as e:
            logger.error(f"Error stopping service: {e}")


async def main():
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
