from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from src.config import settings

# Async client (for async tasks)
async_client: Optional[AsyncIOMotorClient] = None
async_db = None

# Sync client (for Celery tasks)
sync_client: Optional[MongoClient] = None
sync_db = None


def get_sync_db():
    """Get synchronous MongoDB database (for Celery tasks)"""
    global sync_client, sync_db
    if sync_db is None:
        sync_client = MongoClient(settings.MONGO_URI)
        sync_db = sync_client.get_database("test")
        print(sync_db)
    return sync_db


async def get_async_db():
    """Get asynchronous MongoDB database"""
    global async_client, async_db
    if async_db is None:
        async_client = AsyncIOMotorClient(settings.MONGO_URI)
        async_db = async_client.get_database()
    return async_db


def close_sync_db():
    """Close sync MongoDB connection"""
    global sync_client, sync_db
    if sync_client:
        sync_client.close()
        sync_client = None
        sync_db = None


async def close_async_db():
    """Close async MongoDB connection"""
    global async_client, async_db
    if async_client:
        async_client.close()
        async_client = None
        async_db = None


# Collection names (match TypeScript models)
COLLECTIONS = {
    "users": "users",
    "bots": "bots",
    "scraped_content": "scrapedcontents",  # Mongoose pluralizes as 'scrapedcontents'
}
