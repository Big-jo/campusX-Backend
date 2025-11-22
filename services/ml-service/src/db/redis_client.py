"""Redis client for caching ML results."""

import logging
import json
from typing import Optional, Any
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client for ML service caching."""

    def __init__(self, url: str = "redis://localhost:6379/2"):
        """
        Initialize Redis client.

        Args:
            url: Redis connection URL (defaults to DB 2 for ML service)
        """
        self.url = url
        self.client: Optional[redis.Redis] = None
        logger.info(f"Initialized Redis client (lazy connection)")

    async def connect(self):
        """Connect to Redis."""
        if self.client is None:
            self.client = await redis.from_url(
                self.url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info(f"Connected to Redis at {self.url}")

    async def disconnect(self):
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            logger.info("Disconnected from Redis")

    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis."""
        if not self.client:
            await self.connect()

        try:
            return await self.client.get(key)
        except Exception as e:
            logger.error(f"Redis GET failed for {key}: {e}")
            return None

    async def set(self, key: str, value: str, ex: Optional[int] = None):
        """Set value in Redis with optional expiry."""
        if not self.client:
            await self.connect()

        try:
            await self.client.set(key, value, ex=ex)
        except Exception as e:
            logger.error(f"Redis SET failed for {key}: {e}")

    async def setex(self, key: str, seconds: int, value: str):
        """Set value with expiry time."""
        await self.set(key, value, ex=seconds)

    async def delete(self, *keys: str):
        """Delete one or more keys."""
        if not self.client:
            await self.connect()

        try:
            await self.client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis DELETE failed: {e}")

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        if not self.client:
            await self.connect()

        try:
            return bool(await self.client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS failed for {key}: {e}")
            return False

    async def ttl(self, key: str) -> int:
        """Get time to live for key."""
        if not self.client:
            await self.connect()

        try:
            return await self.client.ttl(key)
        except Exception as e:
            logger.error(f"Redis TTL failed for {key}: {e}")
            return -1

    async def invalidate_pattern(self, pattern: str):
        """Delete keys matching pattern (e.g., 'search:*')."""
        if not self.client:
            await self.connect()

        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                await self.client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys matching {pattern}")

        except Exception as e:
            logger.error(f"Redis invalidation failed for {pattern}: {e}")


# Global instance
redis_client: Optional[RedisClient] = None


def get_redis_client(url: str = None) -> RedisClient:
    """Get or create Redis client singleton."""
    global redis_client

    if redis_client is None:
        import os
        url = url or os.getenv("REDIS_URL", "redis://localhost:6379/2")
        redis_client = RedisClient(url)

    return redis_client
