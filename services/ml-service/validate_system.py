"""
Quick system validation script.
Checks all components are working correctly.
"""

import asyncio
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def check_mongodb():
    """Check MongoDB connection"""
    try:
        from src.db.mongodb import get_sync_db, COLLECTIONS

        db = get_sync_db()

        # Check collections exist
        collections = db.list_collection_names()
        required = ["scrapedcontents", "rsssources", "interestcategories"]

        missing = [c for c in required if c not in collections]
        if missing:
            logger.warning(f"Missing collections: {missing}")

        # Check feed count
        feed_count = db[COLLECTIONS.get("rss_sources", "rsssources")].count_documents({})
        active_count = db[COLLECTIONS.get("rss_sources", "rsssources")].count_documents({"active": True})

        logger.info(f"✅ MongoDB connected ({db.name})")
        logger.info(f"   Feeds: {feed_count} total, {active_count} active")

        return True

    except Exception as e:
        logger.error(f"❌ MongoDB failed: {e}")
        return False


def check_qdrant():
    """Check Qdrant connection"""
    try:
        from src.interest_graph.vector_store import get_vector_store

        vector_store = get_vector_store()
        stats = vector_store.get_collection_stats()

        logger.info(f"✅ Qdrant connected")
        logger.info(f"   Collection: {stats.get('vectors_count', 0)} vectors")

        return True

    except Exception as e:
        logger.error(f"❌ Qdrant failed: {e}")
        logger.info("   Run: docker run -d -p 6333:6333 qdrant/qdrant")
        return False


def check_embeddings():
    """Check embedding model"""
    try:
        from src.interest_graph.embeddings_generator import get_embeddings_generator

        generator = get_embeddings_generator()

        # Test embedding generation
        test_content = {"title": "Test", "content": "This is a test"}
        embedding = generator.generate_content_embedding(test_content)

        logger.info(f"✅ Embeddings working")
        logger.info(f"   Model: {generator.model_name}, Dim: {embedding.shape[0]}")

        return True

    except Exception as e:
        logger.error(f"❌ Embeddings failed: {e}")
        return False


def check_redis():
    """Check Redis connection"""
    try:
        from celery import Celery
        from src.config import settings

        app = Celery('test')
        app.config_from_object(settings, namespace='CELERY')

        # Ping Redis
        result = app.backend.client.ping()

        logger.info(f"✅ Redis connected")

        return True

    except Exception as e:
        logger.error(f"❌ Redis failed: {e}")
        logger.info("   Run: redis-server")
        return False


def check_api_keys():
    """Check API keys configured"""
    try:
        from src.config import settings

        checks = {
            "Gemini": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_key"),
            "Serper": bool(settings.SERPER_API_KEY and settings.SERPER_API_KEY != "your_serper_key")
        }

        all_ok = all(checks.values())

        for name, ok in checks.items():
            if ok:
                logger.info(f"✅ {name} API key configured")
            else:
                logger.warning(f"⚠️  {name} API key missing (set in .env)")

        return all_ok

    except Exception as e:
        logger.error(f"❌ Config check failed: {e}")
        return False


async def check_pipeline():
    """Check pipeline can run"""
    try:
        from src.pipeline.content_pipeline import get_pipeline
        from src.pipeline.pipeline_config import PipelineConfig

        config = PipelineConfig(
            enable_enrichment=False,  # Skip to avoid API costs
            enable_deduplication=True,
            enable_gcs_upload=False
        )

        pipeline = get_pipeline(config)

        logger.info(f"✅ Pipeline initialized")
        logger.info(f"   Config: enrich={config.enable_enrichment}, dedup={config.enable_deduplication}")

        return True

    except Exception as e:
        logger.error(f"❌ Pipeline failed: {e}")
        return False


def check_monitoring():
    """Check monitoring system"""
    try:
        from src.monitoring.metrics import get_metrics_collector

        collector = get_metrics_collector()
        health = collector.get_system_health()

        logger.info(f"✅ Monitoring working")
        logger.info(f"   Health: {health['status']} (score: {health.get('health_score', 0):.2f})")

        return True

    except Exception as e:
        logger.error(f"❌ Monitoring failed: {e}")
        return False


async def main():
    """Run all checks"""
    logger.info("=" * 60)
    logger.info("ML SERVICE VALIDATION")
    logger.info("=" * 60)
    logger.info("")

    checks = {
        "MongoDB": check_mongodb,
        "Qdrant": check_qdrant,
        "Embeddings": check_embeddings,
        "Redis": check_redis,
        "API Keys": check_api_keys,
        "Pipeline": check_pipeline,
        "Monitoring": check_monitoring,
    }

    results = {}

    for name, check_func in checks.items():
        logger.info(f"\nChecking {name}...")
        try:
            if asyncio.iscoroutinefunction(check_func):
                results[name] = await check_func()
            else:
                results[name] = check_func()
        except Exception as e:
            logger.error(f"Check failed: {e}")
            results[name] = False

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("VALIDATION SUMMARY")
    logger.info("=" * 60)

    passed = sum(results.values())
    total = len(results)

    for name, ok in results.items():
        status = "✅ PASS" if ok else "❌ FAIL"
        logger.info(f"{status} - {name}")

    logger.info("")
    logger.info(f"Result: {passed}/{total} checks passed")

    if passed == total:
        logger.info("✅ System ready for operation")
    elif passed >= total * 0.7:
        logger.warning("⚠️  System partially ready (some optional components missing)")
    else:
        logger.error("❌ System not ready (critical components missing)")

    logger.info("")
    logger.info("Next steps:")
    logger.info("  1. Fix any failed checks above")
    logger.info("  2. Run: python -m src.scripts.bootstrap_rss_feeds (if feeds = 0)")
    logger.info("  3. Start services:")
    logger.info("     - celery -A src.celery_app worker --loglevel=info")
    logger.info("     - celery -A src.celery_app beat --loglevel=info")
    logger.info("")
    logger.info("See QUICK_START.md for detailed setup instructions.")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
