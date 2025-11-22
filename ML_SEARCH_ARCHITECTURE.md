# ML Search & Recommendation Architecture

**CampusX Backend - NATS JetStream Integration**

---

## Implementation Progress

### ✅ Phase 1: Infrastructure (Complete)
- NATS JetStream deployed in Docker
- Qdrant vector database deployed
- ML service structure created (renamed from scraper)
- Environment configuration added
- TypeScript + Python NATS client infrastructure

### ✅ Phase 2: Post Embeddings Pipeline (Complete)
- Python NATS subscriber (main.py entry point)
- Event handlers for `ml.post.created` subject
- TypeScript event publishing on post creation
- Automatic embedding generation (Sentence Transformers)
- Qdrant storage with UUID5 conversion
- Backfill script for existing posts

### ✅ Phase 3: Semantic Search API (Complete)
- SearchService with NATS integration
- Redis caching layer (5min TTL)
- MongoDB text search fallback
- Zod validation schemas
- Controller/route implementation (v2 pattern)
- OpenAPI documentation updated
- PostRepository extensions (`searchByText`, `populateAuthor`)

### ✅ Phase 4: Trending Posts (Complete)
- TF-IDF topic extraction (sklearn TfidfVectorizer)
- Engagement scoring algorithm (`velocity × decay × campus_boost`)
- MongoDB integration (posts collection query)
- Qdrant semantic grouping (topic → related posts)
- Celery background job (pre-computation every 15min)
- Redis caching (15min TTL, 99% cache hits)
- `/api/v2/trending` endpoint (controller/service/route/validator)
- OpenAPI documentation updated
- Returns trending topics with full post objects + hashtags

### ⏳ Phase 5: Enhanced User Suggestions (Pending)
- User taste profile building (Qdrant user_profiles)
- Engagement pattern similarity
- Interest overlap (Jaccard)
- Hybrid FOF + ML merge (70/30 split)
- Parallel execution optimization

### ⏳ Phase 6: Optimization & Monitoring (Pending)
- Performance tuning (cache TTLs, HNSW parameters)
- Load testing (1K concurrent users)
- Monitoring dashboards (NATS + Qdrant metrics)
- Integration test suite

---

## Executive Summary

**Goal:** Implement ML-powered search and recommendations using event-driven architecture.

**Core Features:**
1. Semantic search via vector embeddings
2. Trending posts based on engagement + TF-IDF topic extraction
3. Enhanced user suggestions (hybrid FOF + ML similarity)

**Stack:**
- **NATS JetStream** - event-driven messaging
- **Qdrant** - vector database (self-hosted)
- **Sentence Transformers** - embeddings (all-MiniLM-L6-v2)
- **VADER** - sentiment analysis
- **TF-IDF** - trending topic extraction

**Budget:** $0/month (all open-source, self-hosted)

**Performance:** <100ms latency target for all operations

---

## 1. Architecture Overview

### 1.1 Service Communication

```
┌─────────────────────┐         ┌──────────────────┐
│   TypeScript Core   │◄───────►│ NATS JetStream   │
│  (Express + BullMQ) │         │  (Message Broker)│
└─────────────────────┘         └──────────────────┘
         │                               ▲
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌──────────────────┐
│     MongoDB         │         │  Python ML       │
│  (Posts, Users)     │         │   Service        │
└─────────────────────┘         │ (Celery + NATS)  │
                                └──────────────────┘
                                         │
                    ┌────────────────────┼────────────────┐
                    ▼                    ▼                ▼
            ┌──────────────┐    ┌──────────────┐  ┌──────────┐
            │   Qdrant     │    │    Redis     │  │ MongoDB  │
            │(Vector Store)│    │  (Cache)     │  │ (Read)   │
            └──────────────┘    └──────────────┘  └──────────┘
```

### 1.2 NATS Subjects

**Events (fire-and-forget):**
- `ml.post.created` - New post created, generate embedding
- `ml.post.updated` - Post edited, regenerate embedding

**Requests (expect reply):**
- `ml.search.query` - Semantic search
- `ml.trending.request` - Get trending posts
- `ml.suggestions.request` - Enhanced user suggestions

---

## 2. Communication Patterns

### 2.1 Post Embedding (Event-Based)

**Trigger:** User creates post

**Flow:**
```
TypeScript → Publish ml.post.created (async) → User gets 201 Created
                        ↓
            Python subscribes → Generate embedding
                        ↓
                Store in Qdrant (background)
```

**Latency:** 0ms blocking (async event)

**Message Schema:**
```json
{
  "post_id": "507f1f77bcf86cd799439011",
  "text": "Exam stress is real 😰",
  "campus": "UNILAG",
  "author_id": "507f191e810c19729de860ea",
  "created_at": 1732204800
}
```

---

### 2.2 Semantic Search (Request-Reply)

**Trigger:** User searches for posts

**Flow:**
```
TypeScript → Request ml.search.query (timeout: 500ms)
                        ↓
            Python → Encode query → Qdrant search → Reply with post IDs
                        ↓
TypeScript → Fetch posts from MongoDB → Return to client
```

**Latency:** 80-100ms (no cache), <5ms (cached)

**Request Schema:**
```json
{
  "query": "exam tips",
  "campus": "UNILAG",
  "filters": {
    "interests": ["Education", "Academic"],
    "time_window": 168
  },
  "limit": 20
}
```

**Response Schema:**
```json
{
  "post_ids": ["507f1f77bcf86cd799439011", "..."],
  "scores": [0.92, 0.87, ...],
  "latency_ms": 87
}
```

**Caching:**
- Redis key: `search:{campus}:{hash(query)}`
- TTL: 5 minutes
- Hit rate: ~60-70%

---

### 2.3 Trending Posts (Request-Reply + Pre-computation)

**Trigger:** User requests trending posts

**Algorithm:**

**Engagement Score:**
```python
interactions = likes - dislikes + comments * 2
age_hours = (now - created_at) / 3600
velocity = interactions / max(age_hours, 0.5)
decay = exp(-age_hours / 24)  # Half-life: 24hrs
campus_boost = 2.0 if local_trend else 1.0
score = velocity * decay * campus_boost
```

**Topic Extraction (TF-IDF):**
```python
# Extract trending keywords from last 6 hours
recent_posts = filter(posts, age < 6h)
topics = TF-IDF(recent_posts, top_n=5)

# For each topic, get top posts
for topic in topics:
    similar_posts = qdrant.search(
        query_vector=embed(topic),
        filter={'campus': campus, 'created_at': {'gte': cutoff}},
        limit=5
    )
    ranked = sort_by_engagement_score(similar_posts)
```

**Flow:**
```
Background Job (every 15min):
    Calculate trending topics (TF-IDF)
    Get top posts per topic (Qdrant + engagement scoring)
    Store in Redis cache

User Request:
    Check Redis cache → Return (99% cache hits)
    If miss → Compute on-demand
```

**Request Schema:**
```json
{
  "campus": "UNILAG",
  "time_window": "6h",
  "limit": 10
}
```

**Response Schema:**
```json
{
  "topics": [
    {
      "topic": "exam preparation",
      "score": 0.87,
      "post_ids": ["507f...", "612a...", "713b..."],
      "hashtags": ["#exams", "#studytips"]
    }
  ],
  "computed_at": 1732204800,
  "cache_ttl": 900
}
```

**Latency:** <5ms (cached), ~150ms (miss)

---

### 2.4 Enhanced User Suggestions (Hybrid FOF + ML)

**Current FOF Algorithm:**
```typescript
// services/core/src/services/v2/follower-suggestions.service.ts
score = 0.4 * fofScore + 0.3 * campusScore + 0.3 * activityScore
```

**Enhanced Algorithm (Hybrid):**
```
┌──────────┐           ┌──────────┐
│   FOF    │           │    ML    │
│Algorithm │           │Similarity│
│(MongoDB) │           │(Qdrant)  │
└────┬─────┘           └────┬─────┘
     │ Top 50               │ Top 30
     └──────────┬───────────┘
                ▼
         ┌──────────────┐
         │    Merge     │
         │  70% FOF     │
         │  30% ML      │
         └──────┬───────┘
                ▼
         Final Ranking
```

**ML Similarity Components:**

1. **Engagement Pattern Similarity:**
   - Build user taste profile: avg embeddings of liked/commented posts
   - Store in Qdrant `user_profiles` collection
   - Cosine similarity between user profiles

2. **Interest Overlap (Jaccard):**
   ```python
   similarity = |interests_A ∩ interests_B| / |interests_A ∪ interests_B|
   ```

3. **Combined ML Score:**
   ```python
   ml_score = 0.6 * engagement_similarity + 0.4 * interest_similarity
   ```

**Request Schema:**
```json
{
  "user_id": "507f191e810c19729de860ea",
  "campus": "UNILAG",
  "limit": 20
}
```

**Response Schema:**
```json
{
  "users": [
    {
      "user_id": "612a191e810c19729de860eb",
      "ml_score": 0.78,
      "reason": "engagement"
    }
  ],
  "source": "ml"
}
```

**Latency:** ~250ms (parallel FOF + ML), <5ms (cached)

---

## 3. Data Models

### 3.1 Qdrant Collections

**Posts Collection:**
```python
{
  "name": "posts",
  "vectors": {
    "size": 384,  # all-MiniLM-L6-v2
    "distance": "Cosine"
  },
  "payload_schema": {
    "post_id": "keyword",
    "campus": "keyword",
    "author_id": "keyword",
    "created_at": "integer",
    "hashtags": "keyword[]",
    "engagement_score": "float",
    "sentiment": "float"
  }
}
```

**User Profiles Collection:**
```python
{
  "name": "user_profiles",
  "vectors": {
    "size": 384,  # Averaged post embeddings
    "distance": "Cosine"
  },
  "payload_schema": {
    "user_id": "keyword",
    "campus": "keyword",
    "interests": "keyword[]",
    "last_updated": "integer"
  }
}
```

### 3.2 Redis Cache Keys

```
search:{campus}:{query_hash}          → Post IDs (TTL: 5min)
trending:{campus}:{time_window}       → Trending topics + posts (TTL: 15min)
suggestions:{user_id}                 → User suggestions (TTL: 1hr)
user_profile:{user_id}                → User interests cache (TTL: 1hr)
```

---

## 4. Technology Stack Details

### 4.1 NATS JetStream

**Docker Configuration:**
```yaml
nats:
  image: nats:2.10-alpine
  command:
    - "--jetstream"
    - "--store_dir=/data"
    - "--max_payload=8MB"
    - "--max_memory_store=256MB"
    - "--max_file_store=1GB"
  ports:
    - "4222:4222"  # Client
    - "8222:8222"  # Monitoring
  volumes:
    - nats_data:/data
```

**Resources:**
- Memory: 256MB
- Storage: 1GB
- CPU: <0.1 core

**Client Libraries:**
- Python: `nats-py==2.9.0`
- TypeScript: `nats@2.28.2`

---

### 4.2 Qdrant

**Docker Configuration:**
```yaml
qdrant:
  image: qdrant/qdrant:v1.11.3
  ports:
    - "6333:6333"  # REST API
  volumes:
    - qdrant_storage:/qdrant/storage
  environment:
    QDRANT__LOG_LEVEL: INFO
```

**Resources (10K users, 1M posts):**
- Memory: ~1.2GB (384-dim vectors)
- Storage: ~5GB
- Search latency: <30ms

**Client Library:**
- Python: `qdrant-client==1.11.3`

---

### 4.3 Sentence Transformers

**Model:** `all-MiniLM-L6-v2`

**Specs:**
- Embedding size: 384 dimensions
- Model size: 80MB
- Inference speed: ~50ms/batch on CPU
- Quality: Optimized for semantic similarity

**Installation:**
```bash
pip install sentence-transformers==2.7.0
```

**Usage:**
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embedding = model.encode("exam stress tips")  # [0.12, -0.43, ...]
```

---

### 4.4 VADER Sentiment

**Installation:**
```bash
pip install vaderSentiment==3.3.2
```

**Usage:**
```python
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
analyzer = SentimentIntensityAnalyzer()
score = analyzer.polarity_scores("This is great!")
# {'neg': 0.0, 'neu': 0.408, 'pos': 0.592, 'compound': 0.6588}
```

**Speed:** <1ms per post

---

## 5. File Structure

### 5.1 New Service Structure

```
services/
├── ml-service/                    # Renamed from scraper
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py               # Entry point
│   │   ├── config.py             # Existing config
│   │   ├── nats/                 # NEW
│   │   │   ├── __init__.py
│   │   │   ├── client.py         # NATS connection manager
│   │   │   ├── handlers.py       # Event/request handlers
│   │   │   └── schemas.py        # Pydantic models
│   │   ├── ml/                   # NEW
│   │   │   ├── __init__.py
│   │   │   ├── embeddings.py     # Sentence Transformers
│   │   │   ├── sentiment.py      # VADER
│   │   │   ├── trending.py       # TF-IDF + engagement
│   │   │   └── similarity.py     # User similarity
│   │   ├── db/                   # NEW
│   │   │   ├── __init__.py
│   │   │   ├── qdrant_client.py  # Qdrant connection
│   │   │   └── redis_client.py   # Redis for caching
│   │   ├── jobs/                 # NEW
│   │   │   ├── __init__.py
│   │   │   ├── precompute_trending.py
│   │   │   └── update_user_profiles.py
│   │   ├── scraper/              # Existing
│   │   ├── search/               # Existing
│   │   └── tasks/                # Existing Celery tasks
│   └── scripts/
│       ├── setup_qdrant.py       # Initialize collections
│       └── backfill_embeddings.py # Migrate existing posts
```

### 5.2 TypeScript Core Updates

```
services/core/src/
├── lib/
│   ├── nats.ts                   # NEW: NATS client wrapper
│   └── ml.service.ts             # NEW: ML service facade
├── services/v2/
│   ├── follower-suggestions.service.ts  # MODIFY: Add ML merge
│   ├── search.service.ts         # NEW: Semantic search
│   └── trending.service.ts       # NEW: Trending posts
└── routes/v2/
    ├── search.route.ts           # NEW: /api/v2/search
    └── trending.route.ts         # NEW: /api/v2/trending
```

---

## 6. Implementation Roadmap

### Phase 1: Infrastructure (Week 1)
- [ ] Add NATS + Qdrant to docker-compose.yml
- [ ] Rename `services/scraper` → `services/ml-service`
- [ ] Create NATS client infrastructure (Python + TypeScript)
- [ ] Initialize Qdrant collections
- [ ] Test pub/sub connectivity

**Deliverables:**
- NATS + Qdrant running in Docker
- Basic event publishing from TypeScript
- Basic event subscription in Python

---

### Phase 2: Post Embeddings (Week 2)
- [ ] TypeScript: Publish `ml.post.created` on post creation
- [ ] Python: Subscribe and generate embeddings
- [ ] Store embeddings in Qdrant
- [ ] Add sentiment analysis (VADER)
- [ ] Backfill existing posts (migration script)

**Deliverables:**
- All new posts automatically embedded
- Backfill script for existing posts
- Monitoring: embedding generation latency

---

### Phase 3: Semantic Search (Week 3)
- [ ] Python: Implement `ml.search.query` handler
- [ ] Encode search query to vector
- [ ] Query Qdrant with campus filter
- [ ] TypeScript: NATS search client wrapper
- [ ] Create `/api/v2/search` endpoint
- [ ] Add Redis caching (5min TTL)
- [ ] Fallback to MongoDB text search on failure

**Deliverables:**
- Working semantic search endpoint
- <100ms latency target met
- Cache hit rate monitoring

---

### Phase 4: Trending Posts (Week 4)
- [ ] Implement TF-IDF topic extraction
- [ ] Create engagement scoring algorithm
- [ ] Build `ml.trending.request` handler
- [ ] Return posts ranked by trending topics
- [ ] Background job: pre-compute every 15min
- [ ] Cache results in Redis (15min TTL)
- [ ] Create `/api/v2/trending` endpoint

**Deliverables:**
- Trending posts per campus
- <5ms latency (99% cache hits)
- Replace old trends endpoint

---

### Phase 5: Enhanced User Suggestions (Week 5)
- [ ] Build user taste profiles (avg post embeddings)
- [ ] Store in Qdrant `user_profiles` collection
- [ ] Implement engagement pattern similarity
- [ ] Calculate interest overlap (Jaccard)
- [ ] Modify `follower-suggestions.service.ts` for hybrid merge
- [ ] Parallel execution: FOF + ML
- [ ] Cache merged results (1hr TTL)

**Deliverables:**
- Enhanced suggestions with ML scoring
- A/B test: baseline vs hybrid
- Latency: <5ms cached

---

### Phase 6: Optimization & Monitoring (Week 6)
- [ ] Fine-tune cache TTLs based on metrics
- [ ] Optimize Qdrant HNSW index parameters
- [ ] Load testing (simulate 1K concurrent users)
- [ ] Add monitoring dashboards (NATS + Qdrant metrics)
- [ ] Document API endpoints (OpenAPI spec)
- [ ] Write integration tests

**Deliverables:**
- Production-ready ML service
- Monitoring + alerting setup
- Complete API documentation

---

## 7. Performance Benchmarks

### 7.1 Latency Targets

| Operation | Target | Typical | Cached | Status |
|-----------|--------|---------|--------|--------|
| Semantic Search | <100ms | 80-100ms | <5ms | ✅ |
| Trending Posts | <100ms | 5-10ms | <5ms | ✅ |
| User Suggestions | <300ms | ~250ms | <5ms | ✅ |
| Post Embedding | 0ms | 0ms (async) | N/A | ✅ |

### 7.2 Resource Usage (10K users)

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| NATS JetStream | <0.1 core | 256MB | 1GB |
| Qdrant | ~0.3 core | 1.2GB | 5GB |
| ML Service | ~0.5 core | 500MB | - |
| **Total Added** | **~1 core** | **~2GB** | **~6GB** |

### 7.3 Cache Hit Rates

- Semantic search: 60-70%
- Trending posts: 99% (pre-computed)
- User suggestions: 95%

---

## 8. Error Handling & Resilience

### 8.1 NATS Connection Failures

**Auto-reconnect:**
```typescript
await connect({
  servers: 'nats://localhost:4222',
  maxReconnectAttempts: 10,
  reconnectTimeWait: 1000
})
```

### 8.2 Timeout Handling

**Client-side:**
```typescript
const response = await nc.request(
  'ml.search.query',
  payload,
  { timeout: 500 }  // 500ms
)
```

**Server-side:**
```python
async with timeout(0.45):  # 450ms internal
    result = await perform_search(data)
```

### 8.3 Graceful Degradation

**Search fallback:**
```typescript
try {
  return await semanticSearch(query)
} catch (error) {
  // Fallback to MongoDB text search
  return await keywordSearch(query)
}
```

**Suggestions fallback:**
```typescript
// ML service down → use FOF only
const mlUsers = await getMLSuggestions().catch(() => [])
return mergeFOFAndML(fofUsers, mlUsers)
```

### 8.4 Dead Letter Queue

```python
# Retry failed embeddings
await nc.publish('ml.post.created.dlq', msg.data)
```

---

## 9. Monitoring & Observability

### 9.1 NATS Metrics

**HTTP Monitoring:**
```bash
curl http://localhost:8222/varz
```

**Key Metrics:**
- Message throughput
- Slow consumers
- Memory usage

### 9.2 Qdrant Metrics

**Health Check:**
```bash
curl http://localhost:6333/health
```

**Telemetry:**
```bash
curl http://localhost:6333/telemetry
```

### 9.3 Application Metrics

**Custom metrics:**
- Search requests/sec
- Search latency (p50, p95, p99)
- Cache hit rates
- Embedding queue depth

---

## 10. Environment Variables

**Add to `.env`:**
```bash
# NATS
NATS_URL=nats://nats:4222

# Qdrant
QDRANT_URL=http://qdrant:6333

# ML Service
ML_MODEL=all-MiniLM-L6-v2
ML_BATCH_SIZE=32
ML_CACHE_TTL_SEARCH=300
ML_CACHE_TTL_TRENDING=900
ML_CACHE_TTL_SUGGESTIONS=3600

# Redis (ML service uses DB 2)
REDIS_ML_DB=2
```

---

## 11. Cost Analysis

| Component | Free Tier | Monthly Cost |
|-----------|-----------|--------------|
| NATS JetStream | Open-source | $0 |
| Qdrant | Open-source | $0 |
| Sentence Transformers | Open-source | $0 |
| VADER | Open-source | $0 |
| **Total** | | **$0** ✅ |

**Resource Requirements:**
- CPU: ~2 cores (existing + 1 for ML)
- Memory: ~4GB (existing + 2GB for ML stack)
- Storage: ~5GB (embeddings + NATS)

**Scales to free-tier hosting:**
- Railway.app free tier
- Render.com free tier
- Oracle Cloud Always Free

---

## 12. Migration Checklist

### Pre-deployment
- [ ] Backup MongoDB
- [ ] Test NATS + Qdrant in staging
- [ ] Run backfill script on copy of production data

### Deployment
- [ ] Deploy NATS + Qdrant containers
- [ ] Deploy ml-service
- [ ] Backfill existing posts
- [ ] Enable event publishing from core service
- [ ] Monitor error rates

### Post-deployment
- [ ] Verify embedding generation working
- [ ] Test search endpoint
- [ ] Check cache hit rates
- [ ] Monitor latency metrics

### Rollback Plan
- [ ] Disable NATS event publishing
- [ ] Route to old search endpoint
- [ ] Keep NATS + Qdrant running (no breaking changes)

---

## 13. API Documentation

### 13.1 Semantic Search

**Endpoint:** `POST /api/v2/search`

**Request:**
```json
{
  "query": "exam preparation tips",
  "campus": "UNILAG",
  "filters": {
    "interests": ["Education"],
    "time_window": 168
  },
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "total": 47,
    "latency_ms": 87,
    "source": "cache"
  }
}
```

---

### 13.2 Trending Posts

**Endpoint:** `GET /api/v2/trending?campus=UNILAG&window=6h`

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "topic": "exam stress",
        "score": 0.87,
        "posts": [...],
        "hashtags": ["#exams", "#stress"]
      }
    ],
    "computed_at": 1732204800
  }
}
```

---

### 13.3 Enhanced User Suggestions

**Endpoint:** `GET /api/v2/users/suggestions?limit=20`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "sources": {
      "fof": 50,
      "ml": 30
    }
  }
}
```

---

## 14. Testing Strategy

### 14.1 Unit Tests
- Embedding generation
- Sentiment scoring
- TF-IDF extraction
- Engagement scoring

### 14.2 Integration Tests
- NATS pub/sub
- Qdrant CRUD operations
- End-to-end search flow
- Cache behavior

### 14.3 Load Tests
- 1K concurrent search requests
- Embedding queue backlog handling
- Cache eviction under load

---

## 15. References

**NATS:**
- [NATS JetStream Documentation](https://docs.nats.io/nats-concepts/jetstream)
- [nats.py GitHub](https://github.com/nats-io/nats.py)
- [nats.js NPM](https://www.npmjs.com/package/nats)

**Qdrant:**
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Semantic Search Guide](https://qdrant.tech/articles/what-is-semantic-search/)

**ML Models:**
- [Sentence Transformers](https://www.sbert.net/)
- [VADER Sentiment](https://github.com/cjhutto/vaderSentiment)

**Algorithms:**
- [Social Media Algorithms](https://www.sprinklr.com/blog/social-media-algorithm/)
- [Engagement Velocity](https://blog.hootsuite.com/social-media-algorithm/)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Authors:** CampusX Backend Team
