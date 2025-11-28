"""
Pipeline-based content tasks.
Replaces direct scraper tasks with orchestrated pipeline.
"""

import logging
from datetime import datetime
from bson import ObjectId
from celery import Task
from src.celery_app import app
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.pipeline.content_pipeline import get_pipeline
from src.pipeline.pipeline_config import PipelineConfig
from src.search.content_source import SourceType
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class PipelineCallbackTask(Task):
    """Custom Task class for pipeline cleanup"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Pipeline task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@app.task(base=PipelineCallbackTask, bind=True, max_retries=3)
async def run_content_pipeline(
    self,
    interest_category: str,
    keywords: list = None,
    source_type: str = "rss",
    limit: int = 10,
    bot_id: str = None,
):
    """
    Run content pipeline for interest category.

    Args:
        interest_category: Interest category name
        keywords: Optional keywords
        source_type: Source type ('rss', 'serper', 'gemini')
        limit: Max articles to process
        bot_id: Optional bot ID for tracking

    Returns:
        Dict with pipeline results
    """
    logger.info(
        f"Pipeline task started: category={interest_category}, source={source_type}"
    )

    try:
        db = get_sync_db()

        # Create pipeline config
        config = PipelineConfig(
            enable_enrichment=True,
            enable_gcs_upload=False,  # Disabled by default
            enable_deduplication=True,
        )

        # Get pipeline
        pipeline = get_pipeline(config)

        # Convert source type string to enum
        try:
            source = SourceType(source_type.lower())
        except ValueError:
            source = SourceType.RSS

        # Run pipeline
        enriched_content = await pipeline.run(
            interest_category=interest_category,
            keywords=keywords or [],
            source_type=source,
            limit=limit,
        )

        if not enriched_content:
            logger.warning(f"Pipeline produced no content for {interest_category}")
            return {
                "status": "success",
                "enriched": 0,
                "message": "No content passed quality gates",
            }

        # Store enriched content in MongoDB
        stored_count = 0
        skipped_count = 0

        for content in enriched_content:
            try:
                # Check if URL already exists
                url = content["url"]
                existing = db[COLLECTIONS["scraped_content"]].find_one({"url": url})
                if existing:
                    logger.info(f"Skipping duplicate URL: {url}")
                    skipped_count += 1
                    continue

                # Extract domain
                domain = urlparse(url).netloc
                if domain.startswith("www."):
                    domain = domain[4:]

                # Prepare enriched content document
                enriched_doc = {
                    # Original data
                    "url": url,
                    "title": content["title"],
                    "content": content["content"],
                    "images": content.get("images", []),
                    "keywords": content.get("keywords", []),
                    "sourceDomain": domain,
                    "interestCategory": interest_category,
                    # Enriched data
                    "enriched": content.get("enriched"),
                    # Quality metrics
                    "quality": {
                        "score": content.get("qualityScore", 0.0),
                        "word_count": content.get("metadata", {}).get("wordCount", 0),
                    },
                    # Metadata
                    "scrapedAt": content.get("scrapedAt", datetime.utcnow()),
                    "enrichedAt": datetime.utcnow() if content.get("enriched") else None,
                    "sourceType": source_type,
                    "discoveredTitle": content.get("discoveredTitle", ""),
                    # Status
                    "status": content.get("status", "enriched"),
                    "usedByBots": [ObjectId(bot_id)] if bot_id else [],
                    "images_processed": content.get("images_processed", False),
                    # Original metadata
                    "metadata": content.get("metadata", {}),
                }

                # Insert into MongoDB (using existing collection for now)
                result = db[COLLECTIONS["scraped_content"]].insert_one(enriched_doc)
                content_id = str(result.inserted_id)

                logger.info(
                    f"Stored enriched content: {content['title'][:50]}... "
                    f"(score: {content.get('qualityScore', 0):.2f})"
                )

                # Generate and store embedding (Phase 3)
                try:
                    from src.interest_graph.embeddings_generator import get_embeddings_generator
                    from src.interest_graph.vector_store import get_vector_store

                    embeddings_gen = get_embeddings_generator()
                    vector_store = get_vector_store()

                    # Add _id to content for vector store
                    content_with_id = {**enriched_doc, "_id": result.inserted_id}

                    # Generate and store embedding
                    embedding = embeddings_gen.generate_content_embedding(content_with_id)
                    vector_store.store_content_embedding(content_id, content_with_id, embedding)

                    logger.info(f"Stored embedding for content {content_id}")

                except Exception as emb_error:
                    logger.warning(f"Failed to store embedding for {content_id}: {emb_error}")
                    # Don't fail the whole pipeline if embedding fails

                stored_count += 1

            except Exception as e:
                logger.error(f"Failed to store content {content.get('url')}: {e}")
                continue

        logger.info(
            f"Pipeline complete for {interest_category}: "
            f"{stored_count} stored, {skipped_count} skipped"
        )

        return {
            "status": "success",
            "enriched": stored_count,
            "skipped": skipped_count,
            "category": interest_category,
            "source": source_type,
        }

    except Exception as e:
        logger.error(f"Pipeline task failed for {interest_category}: {e}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2**self.request.retries))


@app.task(base=PipelineCallbackTask)
async def discover_rss_feeds(interest_category: str, limit: int = 10):
    """
    Discover RSS feeds for interest category using Serper.

    Args:
        interest_category: Interest category
        limit: Max feeds to discover

    Returns:
        Dict with discovered feeds
    """
    logger.info(f"RSS discovery task: {interest_category}")

    try:
        from src.search.serper_searcher import get_serper_searcher

        db = get_sync_db()
        searcher = get_serper_searcher()

        # Discover feeds
        feeds = searcher.discover_rss_feeds(interest_category, limit)

        if not feeds:
            logger.warning(f"No RSS feeds discovered for {interest_category}")
            return {"status": "success", "discovered": 0}

        # Store in MongoDB
        stored_count = 0
        for feed in feeds:
            try:
                # Check if already exists
                existing = db[COLLECTIONS.get("rss_sources", "rsssources")].find_one(
                    {"url": feed["url"]}
                )
                if existing:
                    logger.info(f"RSS feed already exists: {feed['url']}")
                    continue

                # Store feed
                rss_doc = {
                    "url": feed["url"],
                    "category": interest_category,
                    "discovered_via": "serper",
                    "quality_score": 0.0,  # To be assessed later
                    "last_fetched": None,
                    "active": True,
                    "metadata": {
                        "title": feed.get("title", ""),
                        "source": feed.get("source", ""),
                    },
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }

                db[COLLECTIONS.get("rss_sources", "rsssources")].insert_one(rss_doc)
                logger.info(f"Stored RSS feed: {feed['url']}")
                stored_count += 1

            except Exception as e:
                logger.error(f"Failed to store RSS feed {feed['url']}: {e}")
                continue

        logger.info(
            f"RSS discovery complete: {stored_count} new feeds for {interest_category}"
        )

        return {
            "status": "success",
            "discovered": stored_count,
            "category": interest_category,
        }

    except Exception as e:
        logger.error(f"RSS discovery failed for {interest_category}: {e}")
        return {"status": "error", "message": str(e)}


@app.task(base=PipelineCallbackTask)
def validate_all_queries_task():
    """
    Celery task to validate all search queries.
    Runs health check and disables stale queries.
    """
    logger.info("Running scheduled query validation")

    try:
        from src.search.query_tracker import get_query_tracker

        tracker = get_query_tracker()

        # Run health check
        result = tracker.health_check_all(max_age_days=7)

        logger.info(f"Query validation complete: {result['disabled_count']} queries disabled")

        return {
            "status": "success",
            "disabled_count": result["disabled_count"]
        }

    except Exception as e:
        logger.error(f"Query validation failed: {e}")
        return {"status": "error", "message": str(e)}


@app.task(base=PipelineCallbackTask)
async def auto_discovery_task(
    min_users: int = 5,
    max_new_categories: int = 5,
    feeds_per_topic: int = 3
):
    """
    Automated content discovery based on user interests.
    Detects emerging topics and discovers new RSS feeds.

    Args:
        min_users: Minimum users showing interest
        max_new_categories: Max new categories to create
        feeds_per_topic: Feeds to discover per topic

    Returns:
        Discovery cycle summary
    """
    logger.info("Running auto-discovery cycle")

    try:
        from src.interest_graph.auto_discovery import get_auto_discovery

        discovery = get_auto_discovery()

        # Run discovery cycle
        result = await discovery.run_discovery_cycle(
            min_users=min_users,
            max_new_categories=max_new_categories,
            feeds_per_topic=feeds_per_topic
        )

        logger.info(
            f"Auto-discovery complete: {result.get('new_categories', 0)} categories, "
            f"{result.get('new_feeds', 0)} feeds"
        )

        return result

    except Exception as e:
        logger.error(f"Auto-discovery failed: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


@app.task(base=PipelineCallbackTask)
async def analyze_content_gaps_task(limit: int = 5):
    """
    Analyze content gaps and prioritize discovery.

    Args:
        limit: Max gaps to analyze

    Returns:
        Prioritized content gaps
    """
    logger.info("Analyzing content gaps")

    try:
        from src.interest_graph.auto_discovery import get_auto_discovery

        discovery = get_auto_discovery()
        priorities = await discovery.prioritize_content_gaps(limit=limit)

        logger.info(f"Identified {len(priorities)} content gaps")

        return {
            "status": "success",
            "gaps": priorities
        }

    except Exception as e:
        logger.error(f"Gap analysis failed: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
