"""NATS client connection manager."""

import asyncio
import json
import logging
from typing import Optional, Callable, Any
from nats.aio.client import Client as NATS
from nats.js.api import StreamConfig

logger = logging.getLogger(__name__)


class NATSClient:
    """Singleton NATS client for ML service."""

    _instance: Optional['NATSClient'] = None
    _nc: Optional[NATS] = None
    _connected: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self, nats_url: str = "nats://localhost:4222"):
        """Connect to NATS server with auto-reconnect."""
        if self._connected:
            logger.info("NATS already connected")
            return

        self._nc = NATS()

        try:
            await self._nc.connect(
                servers=[nats_url],
                max_reconnect_attempts=10,
                reconnect_time_wait=1,  # 1s between retries
                error_cb=self._error_handler,
                disconnected_cb=self._disconnected_handler,
                reconnected_cb=self._reconnected_handler,
                closed_cb=self._closed_handler,
            )

            self._connected = True
            logger.info(f"Connected to NATS at {nats_url}")

            # Setup JetStream
            await self._setup_jetstream()

        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            raise

    async def _setup_jetstream(self):
        """Initialize JetStream streams if needed."""
        try:
            js = self._nc.jetstream()

            # Create ML events stream
            try:
                await js.add_stream(
                    StreamConfig(
                        name="ML_EVENTS",
                        subjects=["ml.post.*", "ml.user.*"],
                        retention="limits",
                        max_age=86400,  # 24 hours
                        max_bytes=1024 * 1024 * 100,  # 100MB
                    )
                )
                logger.info("Created ML_EVENTS JetStream")
            except Exception as e:
                # Stream might already exist
                logger.debug(f"ML_EVENTS stream: {e}")

        except Exception as e:
            logger.warning(f"JetStream setup failed (continuing anyway): {e}")

    async def disconnect(self):
        """Gracefully disconnect from NATS."""
        if self._nc and self._connected:
            await self._nc.drain()
            await self._nc.close()
            self._connected = False
            logger.info("Disconnected from NATS")

    async def publish(self, subject: str, data: dict):
        """Publish a message (fire-and-forget event)."""
        if not self._connected or not self._nc:
            raise RuntimeError("NATS not connected")

        payload = json.dumps(data).encode()
        await self._nc.publish(subject, payload)
        logger.debug(f"Published to {subject}: {data}")

    async def request(
        self,
        subject: str,
        data: dict,
        timeout: float = 0.5
    ) -> dict:
        """Send request and wait for reply."""
        if not self._connected or not self._nc:
            raise RuntimeError("NATS not connected")

        payload = json.dumps(data).encode()

        try:
            response = await self._nc.request(
                subject,
                payload,
                timeout=timeout
            )
            return json.loads(response.data.decode())

        except asyncio.TimeoutError:
            logger.error(f"Request to {subject} timed out after {timeout}s")
            raise
        except Exception as e:
            logger.error(f"Request to {subject} failed: {e}")
            raise

    async def subscribe(
        self,
        subject: str,
        callback: Callable[[dict], Any],
        queue: Optional[str] = None
    ):
        """Subscribe to a subject with callback."""
        if not self._connected or not self._nc:
            raise RuntimeError("NATS not connected")

        async def message_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                logger.debug(f"Received message on {subject}: {data}")

                # Call the callback
                result = callback(msg, data)
                if asyncio.iscoroutine(result):
                    await result

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in message: {e}")
            except Exception as e:
                logger.error(f"Error handling message on {subject}: {e}")

        await self._nc.subscribe(subject, cb=message_handler, queue=queue)
        logger.info(f"Subscribed to {subject}" + (f" (queue: {queue})" if queue else ""))

    # Connection lifecycle handlers

    async def _error_handler(self, error):
        logger.error(f"NATS error: {error}")

    async def _disconnected_handler(self):
        logger.warning("NATS disconnected, will auto-reconnect")
        self._connected = False

    async def _reconnected_handler(self):
        logger.info("NATS reconnected successfully")
        self._connected = True

    async def _closed_handler(self):
        logger.info("NATS connection closed")
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def nc(self) -> NATS:
        """Get raw NATS client (advanced usage)."""
        return self._nc


# Global instance
nats_client = NATSClient()
