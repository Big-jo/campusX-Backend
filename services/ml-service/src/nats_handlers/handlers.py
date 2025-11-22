"""NATS message handlers for ML operations."""

import asyncio
import json
import logging
import time
from typing import Optional

from .schemas import (
    PostCreatedEvent,
    SearchRequest,
    SearchResponse,
    TrendingRequest,
    TrendingResponse,
    UserSuggestionsRequest,
    UserSuggestionsResponse,
    ErrorResponse
)

logger = logging.getLogger(__name__)


class MLHandlers:
    """Message handlers for ML service."""

    def __init__(self, embeddings_service, trending_service, similarity_service, redis_client):
        """
        Initialize handlers with ML services.

        Args:
            embeddings_service: Service for generating embeddings
            trending_service: Service for trending topics/posts
            similarity_service: Service for user similarity
            redis_client: Redis client for caching
        """
        self.embeddings = embeddings_service
        self.trending = trending_service
        self.similarity = similarity_service
        self.redis = redis_client

    # Event Handlers (async, no reply)

    async def handle_post_created(self, msg, data: dict):
        """
        Handle post.created event - generate embedding.

        This is async fire-and-forget, no reply expected.
        """
        try:
            event = PostCreatedEvent(**data)
            logger.info(f"Processing post embedding: {event.post_id}")

            # Generate embedding (will be implemented in embeddings.py)
            await self.embeddings.generate_and_store(
                post_id=event.post_id,
                text=event.text,
                campus=event.campus,
                author_id=event.author_id,
                created_at=event.created_at,
                hashtags=event.hashtags or []
            )

            logger.info(f"Embedded post {event.post_id}")

        except Exception as e:
            logger.error(f"Failed to process post.created: {e}")
            # TODO: Publish to DLQ for retry
            # await nats_client.publish("ml.post.created.dlq", data)

    # Request Handlers (sync, send reply)

    async def handle_search_request(self, msg, data: dict):
        """
        Handle semantic search request.

        Returns post IDs ranked by similarity.
        """
        start_time = time.time()

        try:
            request = SearchRequest(**data)

            # Check cache first
            cache_key = f"search:{request.campus}:{hash(request.query)}"
            cached = await self.redis.get(cache_key)

            if cached:
                response = SearchResponse(**json.loads(cached))
                response.source = "cache"
                response.latency_ms = int((time.time() - start_time) * 1000)

                await self._send_reply(msg, response.model_dump())
                return

            # Cache miss - perform vector search
            try:
                async with asyncio.timeout(0.45):  # 450ms internal timeout
                    results = await self.embeddings.search(
                        query=request.query,
                        campus=request.campus,
                        filters=request.filters,
                        limit=request.limit
                    )

                    response = SearchResponse(
                        post_ids=results["post_ids"],
                        scores=results["scores"],
                        latency_ms=int((time.time() - start_time) * 1000),
                        source="vector"
                    )

                    # Cache for 5 minutes
                    await self.redis.setex(
                        cache_key,
                        300,
                        json.dumps(response.model_dump())
                    )

                    await self._send_reply(msg, response.model_dump())

            except asyncio.TimeoutError:
                error = ErrorResponse(
                    error="search_timeout",
                    message="Search took too long",
                    fallback=True
                )
                await self._send_reply(msg, error.model_dump())

        except Exception as e:
            logger.error(f"Search request failed: {e}")
            error = ErrorResponse(
                error="search_error",
                message=str(e),
                fallback=True
            )
            await self._send_reply(msg, error.model_dump())

    async def handle_trending_request(self, msg, data: dict):
        """
        Handle trending posts request.

        Returns trending topics with top posts.
        """
        start_time = time.time()

        try:
            request = TrendingRequest(**data)

            # Check cache (should be pre-computed)
            cache_key = f"trending:{request.campus}:{request.time_window}"
            cached = await self.redis.get(cache_key)

            if cached:
                response = TrendingResponse(**json.loads(cached))
                response.source = "cache"
                await self._send_reply(msg, response.model_dump())
                return

            # Cache miss - compute on demand
            logger.warning(f"Trending cache miss for {request.campus}:{request.time_window}")

            topics = await self.trending.get_trending_posts(
                campus=request.campus,
                time_window=request.time_window,
                limit=request.limit
            )

            response = TrendingResponse(
                topics=topics,
                computed_at=int(time.time()),
                cache_ttl=900,  # 15 min
                source="computed"
            )

            # Cache result
            await self.redis.setex(
                cache_key,
                900,
                json.dumps(response.model_dump())
            )

            await self._send_reply(msg, response.model_dump())

        except Exception as e:
            logger.error(f"Trending request failed: {e}")
            error = ErrorResponse(
                error="trending_error",
                message=str(e),
                fallback=False
            )
            await self._send_reply(msg, error.model_dump())

    async def handle_user_suggestions_request(self, msg, data: dict):
        """
        Handle user suggestions request.

        Returns ML-scored user suggestions.
        """
        start_time = time.time()

        try:
            request = UserSuggestionsRequest(**data)

            # Check cache
            cache_key = f"suggestions:{request.user_id}"
            cached = await self.redis.get(cache_key)

            if cached:
                response = UserSuggestionsResponse(**json.loads(cached))
                await self._send_reply(msg, response.model_dump())
                return

            # Compute suggestions
            users = await self.similarity.get_similar_users(
                user_id=request.user_id,
                campus=request.campus,
                limit=request.limit
            )

            response = UserSuggestionsResponse(
                users=users,
                source="ml"
            )

            # Cache for 1 hour
            await self.redis.setex(
                cache_key,
                3600,
                json.dumps(response.model_dump())
            )

            await self._send_reply(msg, response.model_dump())

        except Exception as e:
            logger.error(f"User suggestions request failed: {e}")
            error = ErrorResponse(
                error="suggestions_error",
                message=str(e),
                fallback=False
            )
            await self._send_reply(msg, error.model_dump())

    async def _send_reply(self, msg, data: dict):
        """Send reply to NATS request."""
        if msg.reply:
            from .client import nats_client
            payload = json.dumps(data).encode()
            await nats_client.nc.publish(msg.reply, payload)


# Factory function to create handlers
def create_handlers(embeddings_service, trending_service, similarity_service, redis_client):
    """Create and return MLHandlers instance."""
    return MLHandlers(
        embeddings_service=embeddings_service,
        trending_service=trending_service,
        similarity_service=similarity_service,
        redis_client=redis_client
    )
