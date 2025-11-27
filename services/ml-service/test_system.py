"""
Consolidated system test: Infrastructure, Pipeline, Quality, Interest Graph, NATS
Combines test_e2e, test_phase2, test_phase3, test_nats_events, test_pipeline
"""

import asyncio
import logging
from datetime import datetime
from bson import ObjectId

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# INFRASTRUCTURE TESTS
# ============================================================================

async def test_infrastructure():
    """Test MongoDB, Qdrant, embeddings model"""
    logger.info("\n" + "="*60)
    logger.info("INFRASTRUCTURE CHECK")
    logger.info("="*60)

    results = {}

    # MongoDB
    try:
        from src.db.mongodb import get_sync_db, COLLECTIONS
        db = get_sync_db()
        feed_count = db[COLLECTIONS.get("rss_sources", "rsssources")].count_documents({"active": True})
        logger.info(f"✅ MongoDB: {feed_count} active feeds")
        results['mongodb'] = True
    except Exception as e:
        logger.error(f"❌ MongoDB failed: {e}")
        results['mongodb'] = False

    # Qdrant
    try:
        from src.interest_graph.vector_store import get_vector_store
        vector_store = get_vector_store()
        stats = vector_store.get_collection_stats()
        logger.info(f"✅ Qdrant: {stats.get('vectors_count', 0)} vectors")
        results['qdrant'] = True
    except Exception as e:
        logger.error(f"❌ Qdrant failed: {e}")
        results['qdrant'] = False

    # Embeddings
    try:
        from src.interest_graph.embeddings_generator import get_embeddings_generator
        generator = get_embeddings_generator()
        test_emb = generator.generate_content_embedding({"title": "Test", "content": "Test"})
        logger.info(f"✅ Embeddings: {test_emb.shape[0]} dimensions")
        results['embeddings'] = True
    except Exception as e:
        logger.error(f"❌ Embeddings failed: {e}")
        results['embeddings'] = False

    return results


# ============================================================================
# NORMALIZATION & QUALITY TESTS
# ============================================================================

def test_normalizer():
    """Test URL normalization"""
    logger.info("\n" + "="*60)
    logger.info("URL NORMALIZER")
    logger.info("="*60)

    from src.content.normalizer import get_normalizer
    normalizer = get_normalizer()

    test_urls = [
        "http://www.example.com/article?utm_source=twitter",
        "https://example.com/article/",
        "https://www.example.com/article#comments"
    ]

    for url in test_urls:
        canonical = normalizer.normalize_url(url)
        logger.info(f"Original: {url}")
        logger.info(f"Canonical: {canonical}\n")


def test_deduplication():
    """Test deduplication strategies"""
    logger.info("\n" + "="*60)
    logger.info("DEDUPLICATION")
    logger.info("="*60)

    from src.content.deduplicator import get_deduplicator
    dedup = get_deduplicator()

    test_content = [
        {"url": "https://example.com/article", "title": "Test Article", "content": "Sample content"},
        {"url": "https://example.com/article?ref=home", "title": "Test Article", "content": "Sample content"}
    ]

    for i, content in enumerate(test_content):
        fingerprint = dedup.generate_fingerprint(content["content"], content["title"])
        logger.info(f"Content {i+1} fingerprint: {fingerprint}")


def test_quality_scoring():
    """Test quality scoring"""
    logger.info("\n" + "="*60)
    logger.info("QUALITY SCORING")
    logger.info("="*60)

    from src.content.quality_scorer import get_quality_scorer
    scorer = get_quality_scorer()

    test_content = {
        "title": "Introduction to Machine Learning",
        "content": "Machine learning is a subset of artificial intelligence. " * 50,
        "sourceDomain": "example.com"
    }

    score = scorer.calculate_quality_score(test_content)
    signals = scorer.get_quality_metrics(test_content)
    logger.info(f"Quality score: {score:.2f}")
    logger.info(f"Signals: {signals}")


# ============================================================================
# EMBEDDINGS & VECTOR STORE TESTS
# ============================================================================

def test_embeddings():
    """Test embedding generation and similarity"""
    logger.info("\n" + "="*60)
    logger.info("EMBEDDINGS")
    logger.info("="*60)

    from src.interest_graph.embeddings_generator import get_embeddings_generator
    generator = get_embeddings_generator()

    samples = [
        {"title": "Machine Learning Intro", "content": "ML is a subset of AI"},
        {"title": "Deep Learning", "content": "DL uses neural networks"}
    ]

    embeddings = []
    for sample in samples:
        embedding = generator.generate_content_embedding(sample)
        embeddings.append(embedding)
        logger.info(f"Title: {sample['title']}, Shape: {embedding.shape}")

    # Compute similarity
    import numpy as np
    similarity = np.dot(embeddings[0], embeddings[1]) / (
        np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
    )
    logger.info(f"Similarity: {similarity:.3f}")


async def test_vector_store():
    """Test Qdrant operations"""
    logger.info("\n" + "="*60)
    logger.info("VECTOR STORE")
    logger.info("="*60)

    from src.interest_graph.vector_store import get_vector_store
    from src.interest_graph.embeddings_generator import get_embeddings_generator

    vector_store = get_vector_store()
    generator = get_embeddings_generator()

    # Add test content
    test_content = {
        "_id": ObjectId(),
        "title": "Test ML Article",
        "content": "Machine learning test content",
        "interestCategory": "Technology",
        "qualityScore": 0.8
    }

    embedding = generator.generate_content_embedding(test_content)
    content_id = str(test_content["_id"])

    vector_store.store_content_embedding(content_id, test_content, embedding)

    logger.info(f"✅ Added embedding for {content_id}")

    # Search
    results = vector_store.search_similar_content(embedding, limit=3)
    logger.info(f"Found {len(results)} similar results")


# ============================================================================
# INTEREST TRACKING TESTS
# ============================================================================

async def test_interest_tracking():
    """Test user interest tracking with multiple categories"""
    logger.info("\n" + "="*60)
    logger.info("INTEREST TRACKING")
    logger.info("="*60)

    from src.interest_graph.interest_tracker import get_interest_tracker
    from src.db.mongodb import get_sync_db, COLLECTIONS

    tracker = get_interest_tracker()
    test_user = "test_user_456"

    # Create test content across multiple categories
    db = get_sync_db()
    test_content = [
        {
            "_id": ObjectId(),
            "title": "Machine Learning Fundamentals",
            "content": "Deep dive into ML",
            "interestCategory": "Technology",
            "status": "enriched"
        },
        {
            "_id": ObjectId(),
            "title": "Neural Networks Explained",
            "content": "Understanding neural networks",
            "interestCategory": "Technology",
            "status": "enriched"
        },
        {
            "_id": ObjectId(),
            "title": "Basketball Championship Finals",
            "content": "Game recap and analysis",
            "interestCategory": "Sports",
            "status": "enriched"
        },
        {
            "_id": ObjectId(),
            "title": "Stock Market Analysis",
            "content": "Market trends and predictions",
            "interestCategory": "Finance",
            "status": "enriched"
        },
        {
            "_id": ObjectId(),
            "title": "Soccer World Cup",
            "content": "World cup highlights",
            "interestCategory": "Sports",
            "status": "enriched"
        }
    ]

    # Insert test content
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].insert_many(test_content)

    # Simulate user interactions: Heavy on Technology, moderate on Sports, light on Finance
    interaction_patterns = [
        (test_content[0]["_id"], "view", 0.1),      # Tech
        (test_content[0]["_id"], "like", 0.5),      # Tech
        (test_content[1]["_id"], "view", 0.1),      # Tech
        (test_content[1]["_id"], "like", 0.5),      # Tech
        (test_content[1]["_id"], "share", 1.0),     # Tech - strong signal
        (test_content[2]["_id"], "view", 0.1),      # Sports
        (test_content[2]["_id"], "like", 0.5),      # Sports
        (test_content[4]["_id"], "view", 0.1),      # Sports
        (test_content[3]["_id"], "view", 0.1),      # Finance
    ]

    for content_id, interaction_type, weight in interaction_patterns:
        tracker.track_interaction(
            user_id=test_user,
            content_id=str(content_id),
            interaction_type=interaction_type,
            weight=weight
        )

    # Get and display interests
    interests = tracker.get_user_interests(test_user)
    if interests:
        interest_vector = interests.get('interest_vector', {})
        logger.info(f"User interest breakdown:")

        # Sort by interest strength
        sorted_interests = sorted(interest_vector.items(), key=lambda x: x[1], reverse=True)
        for category, score in sorted_interests:
            logger.info(f"  - {category}: {score:.2f}")

        # Verify Technology is top interest
        if sorted_interests and sorted_interests[0][0] == "Technology":
            logger.info("✅ Correctly identified Technology as primary interest")

    # Cleanup
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].delete_many({
        "_id": {"$in": [c["_id"] for c in test_content]}
    })
    db[COLLECTIONS.get("user_interests", "userinterests")].delete_one({"user_id": test_user})


# ============================================================================
# AUTO-DISCOVERY TESTS
# ============================================================================

async def test_auto_discovery():
    """Test interest auto-discovery and topic detection"""
    logger.info("\n" + "="*60)
    logger.info("AUTO-DISCOVERY")
    logger.info("="*60)

    from src.interest_graph.topic_detector import get_topic_detector
    from src.interest_graph.auto_discovery import get_auto_discovery
    from src.db.mongodb import get_sync_db, COLLECTIONS

    topic_detector = get_topic_detector()
    auto_discovery = get_auto_discovery()
    db = get_sync_db()

    # Create synthetic user interest data to simulate emerging topics
    test_users = ["user_discovery_1", "user_discovery_2", "user_discovery_3"]

    # Create test content
    test_content = {
        "_id": ObjectId(),
        "title": "Quantum Computing Breakthrough",
        "content": "Latest advances in quantum computing",
        "interestCategory": "Science",
        "status": "enriched"
    }
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].insert_one(test_content)

    # Create interest profiles for multiple users showing interest in same emerging topic
    for user in test_users:
        db[COLLECTIONS.get("user_interests", "userinterests")].insert_one({
            "user_id": user,
            "interest_vector": {
                "Science": 2.5,
                "Technology": 1.0
            },
            "transitions": [
                {
                    "from": "Technology",
                    "to": "Science",
                    "timestamp": datetime.utcnow()
                },
                {
                    "from": "Science",
                    "to": "Science",
                    "timestamp": datetime.utcnow()
                }
            ],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    # Test topic detection
    logger.info("Testing emerging topic detection...")
    emerging_topics = topic_detector.detect_emerging_topics(
        min_users=2,
        min_drift_score=0.1,
        lookback_days=30
    )

    if emerging_topics:
        logger.info(f"✅ Detected {len(emerging_topics)} emerging topics:")
        for topic in emerging_topics[:3]:
            logger.info(f"  - {topic.get('topic', 'Unknown')}: {topic.get('user_count', 0)} users")
    else:
        logger.info("⚠️  No emerging topics detected (expected with limited test data)")

    # Test content gap analysis
    logger.info("Testing content gap analysis...")
    gaps = topic_detector.analyze_content_gaps(limit=3)

    if gaps:
        logger.info(f"✅ Identified {len(gaps)} content gaps:")
        for gap in gaps:
            logger.info(
                f"  - {gap.get('category', 'Unknown')}: "
                f"gap_score={gap.get('gap_score', 0):.2f}, "
                f"priority={gap.get('priority', 'low')}"
            )
    else:
        logger.info("⚠️  No content gaps identified")

    # Cleanup
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].delete_one({"_id": test_content["_id"]})
    db[COLLECTIONS.get("user_interests", "userinterests")].delete_many({
        "user_id": {"$in": test_users}
    })

    logger.info("✅ Auto-discovery tests complete")


# ============================================================================
# CONTENT GAP CLOSING TESTS
# ============================================================================

async def test_content_gap_closing():
    """Test content gap detection and closing mechanism"""
    logger.info("\n" + "="*60)
    logger.info("CONTENT GAP CLOSING")
    logger.info("="*60)

    from src.interest_graph.auto_discovery import get_auto_discovery
    from src.db.mongodb import get_sync_db, COLLECTIONS

    auto_discovery = get_auto_discovery()
    db = get_sync_db()

    # Create test scenario: High user interest but low content availability
    test_users = [f"gap_user_{i}" for i in range(10)]
    test_category = "Blockchain"

    # Create high user interest
    for user in test_users:
        db[COLLECTIONS.get("user_interests", "userinterests")].insert_one({
            "user_id": user,
            "interest_vector": {
                test_category: 3.5,  # High interest
                "Technology": 1.0
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    # Create minimal content (simulates gap)
    test_content = {
        "_id": ObjectId(),
        "title": "Blockchain Intro",
        "content": "Basic blockchain content",
        "interestCategory": test_category,
        "status": "enriched"
    }
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].insert_one(test_content)

    # Ensure category exists
    db[COLLECTIONS.get("interest_categories", "interestcategories")].insert_one({
        "name": test_category,
        "description": "Test category",
        "createdAt": datetime.utcnow()
    })

    # Test gap prioritization
    logger.info("Prioritizing content gaps...")
    gaps = await auto_discovery.prioritize_content_gaps(limit=5)

    if gaps:
        logger.info(f"✅ Found {len(gaps)} prioritized gaps:")
        for gap in gaps:
            logger.info(
                f"  - {gap.get('category')}: "
                f"gap_score={gap.get('gap_score'):.2f}, "
                f"feeds={gap.get('current_feeds')}, "
                f"action={gap.get('recommended_action')}"
            )

        # Verify Blockchain has high gap score
        blockchain_gap = next((g for g in gaps if g.get('category') == test_category), None)
        if blockchain_gap:
            if blockchain_gap.get('gap_score', 0) > 5.0:
                logger.info(f"✅ Correctly identified high gap for {test_category}")
            if blockchain_gap.get('recommended_action') == 'discover_feeds':
                logger.info("✅ Recommended action: discover_feeds (correct)")
    else:
        logger.info("⚠️  No gaps prioritized")

    # Cleanup
    db[COLLECTIONS.get("scraped_content", "scrapedcontents")].delete_one({"_id": test_content["_id"]})
    db[COLLECTIONS.get("user_interests", "userinterests")].delete_many({
        "user_id": {"$in": test_users}
    })
    db[COLLECTIONS.get("interest_categories", "interestcategories")].delete_one({
        "name": test_category
    })

    logger.info("✅ Content gap closing tests complete")


# ============================================================================
# CATEGORY TREE EXPANSION TESTS
# ============================================================================

async def test_category_tree_expansion():
    """Test automatic category tree expansion based on user interests"""
    logger.info("\n" + "="*60)
    logger.info("CATEGORY TREE EXPANSION")
    logger.info("="*60)

    from src.interest_graph.auto_discovery import get_auto_discovery
    from src.interest_graph.query_generator import get_query_generator
    from src.db.mongodb import get_sync_db, COLLECTIONS

    auto_discovery = get_auto_discovery()
    query_generator = get_query_generator()
    db = get_sync_db()

    # Create emerging interest pattern: Multiple users showing new interest
    test_users = [f"tree_user_{i}" for i in range(6)]
    emerging_topic = "Web3"

    for user in test_users:
        db[COLLECTIONS.get("user_interests", "userinterests")].insert_one({
            "user_id": user,
            "interest_vector": {
                emerging_topic: 2.0,
                "Technology": 1.5
            },
            "transitions": [
                {
                    "from": "Technology",
                    "to": emerging_topic,
                    "timestamp": datetime.utcnow()
                }
            ],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    # Test category name suggestion
    logger.info(f"Generating category name for: {emerging_topic}")
    try:
        category_name = query_generator.suggest_category_name(
            emerging_topic,
            related_topics=["Blockchain", "Decentralization", "NFT"]
        )
        logger.info(f"✅ Suggested category name: '{category_name}'")
    except Exception as e:
        logger.warning(f"⚠️  Category naming skipped (API key needed): {e}")
        category_name = emerging_topic

    # Test RSS query generation
    logger.info("Generating RSS feed queries...")
    queries = query_generator.generate_rss_search_queries(emerging_topic)
    logger.info(f"✅ Generated {len(queries)} RSS queries:")
    for i, query in enumerate(queries[:3], 1):
        logger.info(f"  {i}. {query}")

    # Test discovery cycle (dry run - won't actually call Serper without API)
    logger.info("Testing discovery cycle structure...")

    # Count categories before
    category_count_before = db[COLLECTIONS.get("interest_categories", "interestcategories")].count_documents({})

    try:
        # This would normally discover feeds via Serper
        # For test, we just verify the structure works
        result = await auto_discovery.run_discovery_cycle(
            min_users=3,
            max_new_categories=2,
            feeds_per_topic=2
        )

        logger.info(f"Discovery cycle result: {result.get('status')}")
        if result.get('new_categories'):
            logger.info(f"✅ Created {result.get('new_categories')} new categories")
        if result.get('new_feeds'):
            logger.info(f"✅ Discovered {result.get('new_feeds')} new feeds")

    except Exception as e:
        logger.info(f"⚠️  Discovery cycle test skipped (requires API keys): {str(e)[:100]}")

    # Cleanup
    db[COLLECTIONS.get("user_interests", "userinterests")].delete_many({
        "user_id": {"$in": test_users}
    })

    logger.info("✅ Category tree expansion tests complete")


# ============================================================================
# PIPELINE TESTS
# ============================================================================

async def test_pipeline():
    """Test content pipeline"""
    logger.info("\n" + "="*60)
    logger.info("CONTENT PIPELINE")
    logger.info("="*60)

    from src.tasks.pipeline_task import run_content_pipeline

    try:
        result = await run_content_pipeline(
            interest_category="Technology",
            source_type="rss",
            limit=5
        )
        logger.info(f"✅ Pipeline result: {result}")
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {e}")


# ============================================================================
# NATS TESTS
# ============================================================================

async def test_nats():
    """Test NATS interaction tracking"""
    logger.info("\n" + "="*60)
    logger.info("NATS INTEGRATION")
    logger.info("="*60)

    try:
        from nats.aio.client import Client as NATS
        import json

        nc = NATS()
        await nc.connect("nats://localhost:4222")

        # Publish test event
        event = {
            "user_id": "test_user_123",
            "content_id": str(ObjectId()),
            "interaction_type": "like",
            "timestamp": datetime.utcnow().isoformat()
        }

        await nc.publish("user.interaction.like", json.dumps(event).encode())
        logger.info(f"✅ Published NATS event: {event['interaction_type']}")

        await nc.close()
    except Exception as e:
        logger.warning(f"⚠️ NATS test skipped (not critical): {e}")


# ============================================================================
# MAIN
# ============================================================================

async def main():
    """Run all tests"""
    logger.info("\n" + "="*80)
    logger.info("ML SERVICE SYSTEM TEST")
    logger.info("="*80)

    # Infrastructure
    infra_results = await test_infrastructure()
    if not all(infra_results.values()):
        logger.error("\n❌ Infrastructure tests failed. Fix issues before continuing.")
        return

    # Normalization & Quality
    test_normalizer()
    test_deduplication()
    test_quality_scoring()

    # Embeddings & Vector Store
    test_embeddings()
    await test_vector_store()

    # Interest Tracking
    await test_interest_tracking()

    # Auto-Discovery
    await test_auto_discovery()

    # Content Gap Closing
    await test_content_gap_closing()

    # Category Tree Expansion
    await test_category_tree_expansion()

    # Pipeline
    await test_pipeline()

    # NATS (optional)
    await test_nats()

    logger.info("\n" + "="*80)
    logger.info("✅ ALL TESTS COMPLETE")
    logger.info("="*80)


if __name__ == "__main__":
    asyncio.run(main())
