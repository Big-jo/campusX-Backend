#!/usr/bin/env python3
"""
Setup Qdrant collections for ML service.

This script initializes the required Qdrant collections:
- posts: Post embeddings with metadata
- user_profiles: User taste profiles
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.db.qdrant_client import get_qdrant_client
from src.config import config
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Initialize Qdrant collections."""
    try:
        logger.info("Connecting to Qdrant...")
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant = get_qdrant_client(qdrant_url)

        logger.info("Creating collections...")
        qdrant.create_collections()

        logger.info("✅ Qdrant setup complete!")
        logger.info(f"  - Posts collection: {qdrant.posts_collection}")
        logger.info(f"  - User profiles collection: {qdrant.user_profiles_collection}")

        # Verify collections exist
        client = qdrant.client
        posts_info = client.get_collection(qdrant.posts_collection)
        profiles_info = client.get_collection(qdrant.user_profiles_collection)

        logger.info(f"\nCollection stats:")
        logger.info(f"  Posts: {posts_info.points_count} points")
        logger.info(f"  User Profiles: {profiles_info.points_count} points")

    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
