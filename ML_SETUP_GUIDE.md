# ML Search & Recommendations - Setup Guide

**Status:** Phase 1-2 Complete ✅

---

## What's Been Implemented

### Phase 1: Infrastructure ✅
- NATS JetStream message broker (Docker)
- Qdrant vector database (Docker)
- ML service structure with NATS client
- TypeScript NATS client wrapper
- Environment configuration

### Phase 2: Post Embeddings Pipeline ✅
- Python NATS subscriber (`src/main.py`)
- Event handlers for `ml.post.created`
- TypeScript post creation publishes to NATS
- Automatic embedding generation
- Graceful error handling

---

## Quick Start

### 1. Install Dependencies

**TypeScript Core:**
```bash
cd services/core
npm install
# This installs nats@2.28.2
```

**Python ML Service:**
```bash
cd services/ml-service
pip install -r requirements.txt
# Downloads sentence-transformers model (~80MB on first run)
```

---

### 2. Start Services

**Option A: Docker Compose (Recommended)**
```bash
# Start all infrastructure
docker-compose up -d mongodb redis nats qdrant

# Build and start ml-service
docker-compose up --build ml-service

# Start TypeScript core (separate terminal)
cd services/core
npm run dev
```

**Option B: Local Development**
```bash
# Terminal 1: NATS + Qdrant
docker-compose up -d nats qdrant mongodb redis

# Terminal 2: Python ML Service
cd services/ml-service
export NATS_URL=nats://localhost:4222
export QDRANT_URL=http://localhost:6333
export MONGODB_URI=mongodb://localhost:27017/campusx
python -m src.mainGenerated and stored embedding for post

# Terminal 3: TypeScript Core
cd services/core
export NATS_URL=nats://localhost:4222
npm run dev
```

---

### 3. Initialize Qdrant Collections

```bash
cd services/ml-service
python scripts/setup_qdrant.py
```

**Expected Output:**
```
Connecting to Qdrant...
Creating collections...
✅ Qdrant setup complete!
  - Posts collection: posts
  - User profiles collection: user_profiles

Collection stats:
  Posts: 0 points
  User Profiles: 0 points
```

---

### 4. Test End-to-End Flow

**Create a test post via API:**

```bash
# Using curl (replace with your JWT token)
curl -X POST http://localhost:3000/api/v2/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Machine learning is transforming education #AI #EdTech",
    "campus": "UNILAG"
  }'
```

**What happens:**
1. TypeScript creates post in MongoDB
2. Publishes `ml.post.created` event to NATS
3. Python ML service receives event
4. Generates 384-dim embedding using Sentence Transformers
5. Stores in Qdrant with metadata (campus, author, hashtags)

**Verify in logs:**

**TypeScript logs:**
```
Express server started on port: 3000
NATS client connected successfully
```

**Python ML service logs:**
```
ML Service initialized successfully
✅ ml.post.created
Processing post embedding: 507f1f77bcf86cd799439011
Generated and stored embedding for post 507f1f77bcf86cd799439011
```

---

### 5. Verify Embeddings in Qdrant

**Check collection size:**
```bash
curl http://localhost:6333/collections/posts
```

**Expected response:**
```json
{
  "result": {
    "status": "green",
    "points_count": 1,
    "vectors_count": 1
  }
}
```

**Query vectors:**
```bash
curl -X POST http://localhost:6333/collections/posts/points/scroll \
  -H "Content-Type: application/json" \
  -d '{"limit": 5, "with_vector": false, "with_payload": true}'
```

**Expected:**
```json
{
  "result": {
    "points": [
      {
        "id": "507f1f77bcf86cd799439011",
        "payload": {
          "campus": "UNILAG",
          "author_id": "...",
          "created_at": 1732204800,
          "hashtags": ["AI", "EdTech"],
          "engagement_score": 0.0,
          "sentiment": 0.0
        }
      }
    ]
  }
}
```

---

### 6. Backfill Existing Posts

```bash
cd services/ml-service

# Test with 10 posts first
python scripts/backfill_embeddings.py --limit 10

# Full backfill (run overnight for large datasets)
python scripts/backfill_embeddings.py --batch-size 32
```

**Monitor progress:**
```
Progress: 32/1000 (✅ 32 | ❌ 0)
Progress: 64/1000 (✅ 64 | ❌ 0)
...
✅ Backfill complete!
  Processed: 987
  Failed: 13
```

---

## Monitoring & Debugging

### Check Service Health

**NATS:**
```bash
curl http://localhost:8222/varz
# Shows: connections, in_msgs, out_msgs, uptime
```

**Qdrant:**
```bash
curl http://localhost:6333/health
# Response: {"status": "ok"}
```

**MongoDB:**
```bash
mongo mongodb://localhost:27017
> use campusx
> db.posts.countDocuments()
```

---

### View NATS Messages (Debug)

**Subscribe to all ML events:**
```bash
docker exec -it campusx-nats nats sub "ml.>"
```

**Create a post and watch:**
```
[#1] Received on "ml.post.created"
{"post_id":"507f...", "text":"...", "campus":"UNILAG", ...}
```

---

### Common Issues

**1. "NATS not connected" in TypeScript logs**
- Check: `docker ps | grep nats` (container running?)
- Check: `NATS_URL` environment variable
- Solution: Restart core service

**2. Python ML service crashes on startup**
- Error: "Model download failed"
  - Solution: Check internet connection, model downloads on first run
- Error: "Cannot connect to Qdrant"
  - Solution: `docker-compose up -d qdrant`, wait 10s, retry

**3. Embeddings not being generated**
- Check Python logs for `ml.post.created` subscriptions
- Test NATS: `docker exec -it campusx-nats nats pub ml.post.created '{"post_id":"test"}'`
- Verify handler is running: Check for "Subscribed to ml.post.created" in logs

**4. High memory usage**
- Sentence Transformers model: ~500MB RAM
- Qdrant: ~1GB per 250K vectors
- Solution: Reduce `ML_BATCH_SIZE` or use smaller model

---

## Performance Benchmarks

**Embedding Generation:**
- CPU: ~50ms per post (all-MiniLM-L6-v2)
- GPU: ~5ms per post (if available)
- Batch (32 posts): ~800ms total = 25ms/post

**NATS Latency:**
- Publish (TypeScript → NATS): <1ms
- Round-trip (request-reply): ~10-20ms

**Qdrant Search:**
- 10K vectors: <30ms
- 100K vectors: <50ms
- 1M vectors: <100ms

---

## Next Steps (Phase 3-6)

### Phase 3: Semantic Search
- [ ] Create `/api/v2/search` endpoint
- [ ] Implement search request handler
- [ ] Add Redis caching (5min TTL)
- [ ] Test search accuracy

### Phase 4: Trending Posts
- [ ] MongoDB integration for recent posts
- [ ] TF-IDF topic extraction
- [ ] Background job (Celery) for pre-computation
- [ ] Create `/api/v2/trending` endpoint

### Phase 5: Enhanced User Suggestions
- [ ] Build user taste profiles
- [ ] Modify FOF service for hybrid merge
- [ ] Parallel execution (FOF + ML)
- [ ] A/B testing

### Phase 6: Optimization
- [ ] Load testing (1K concurrent users)
- [ ] Monitoring dashboards
- [ ] Fine-tune cache TTLs
- [ ] Production deployment

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NATS_URL` | `nats://localhost:4222` | NATS connection URL |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant REST API URL |
| `ML_MODEL` | `all-MiniLM-L6-v2` | Sentence Transformers model |
| `ML_BATCH_SIZE` | `32` | Batch processing size |
| `ML_CACHE_TTL_SEARCH` | `300` | Search cache TTL (seconds) |
| `ML_CACHE_TTL_TRENDING` | `900` | Trending cache TTL (seconds) |
| `ML_CACHE_TTL_SUGGESTIONS` | `3600` | Suggestions cache TTL (seconds) |
| `REDIS_ML_DB` | `2` | Redis DB for ML caching |

---

## Architecture Diagram

```
┌─────────────┐         ┌──────────────┐
│  TypeScript │────1───>│ NATS         │
│  Core API   │<───2────│  JetStream   │
└─────────────┘         └──────────────┘
       │                        │
       │                        │ 3
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  MongoDB    │<───6────│  Python ML   │
│  (Posts)    │         │   Service    │
└─────────────┘         └──────────────┘
                               │
                               │ 4, 5
                               ▼
                        ┌──────────────┐
                        │   Qdrant     │
                        │  (Vectors)   │
                        └──────────────┘
```

**Flow:**
1. TypeScript publishes `ml.post.created` event
2. Python subscribes to event
3. ML service receives message
4. Generate embedding (Sentence Transformers)
5. Store in Qdrant
6. (Future) Read post metadata from MongoDB

---

## Troubleshooting Commands

```bash
# View all containers
docker-compose ps

# Restart ML service
docker-compose restart ml-service

# View ML service logs
docker-compose logs -f ml-service

# View NATS logs
docker-compose logs -f nats

# Shell into ML service
docker-compose exec ml-service bash

# Test NATS pub/sub manually
docker exec -it campusx-nats nats pub ml.post.created '{"post_id":"test","text":"Hello","campus":"UNILAG","author_id":"123","created_at":1732204800}'

# Qdrant web UI (if enabled)
# Visit: http://localhost:6333/dashboard

# Check Qdrant collections
curl http://localhost:6333/collections

# Delete a collection (reset)
curl -X DELETE http://localhost:6333/collections/posts

# Redis check (ML cache)
docker-compose exec redis redis-cli -n 2
> KEYS *
```

---

## File Structure Reference

```
services/
├── ml-service/
│   ├── src/
│   │   ├── main.py              # NATS subscriber entry point
│   │   ├── config.py            # ML config (updated)
│   │   ├── nats/
│   │   │   ├── client.py        # NATS connection
│   │   │   ├── handlers.py      # Event/request handlers
│   │   │   └── schemas.py       # Pydantic models
│   │   ├── ml/
│   │   │   ├── embeddings.py    # Sentence Transformers
│   │   │   ├── trending.py      # TF-IDF + engagement
│   │   │   └── similarity.py    # User similarity
│   │   └── db/
│   │       ├── qdrant_client.py # Qdrant operations
│   │       └── redis_client.py  # Redis caching
│   ├── scripts/
│   │   ├── setup_qdrant.py      # Initialize collections
│   │   └── backfill_embeddings.py # Migrate existing posts
│   ├── requirements.txt          # Updated with ML deps
│   ├── Dockerfile               # Updated paths
│   └── start.sh                 # Runs Celery + NATS
│
└── core/
    └── src/
        ├── Start.ts             # Initialize NATS on startup
        ├── lib/
        │   └── nats.ts          # NATS client wrapper
        └── services/v2/
            └── posts.service.ts # Publish ml.post.created
```

---

## Cost Estimate (Self-Hosted)

| Component | Resource | Monthly Cost |
|-----------|----------|--------------|
| NATS JetStream | 256MB RAM, 1GB disk | $0 |
| Qdrant | 1.2GB RAM, 5GB disk | $0 |
| ML Service | 1GB RAM (model + runtime) | $0 |
| Sentence Transformers | Open-source | $0 |
| **Total** | | **$0** |

**Hosting options:**
- Railway.app free tier: 500hrs/month
- Render.com free tier: 750hrs/month
- Oracle Cloud Always Free: 1GB RAM VM

---

## Support & Documentation

- Architecture: `ML_SEARCH_ARCHITECTURE.md`
- Scripts: `services/ml-service/scripts/README.md`
- Issues: Create GitHub issue with logs

---

**Last Updated:** 2025-11-22
**Phase:** 2 of 6 Complete
**Next Milestone:** Semantic Search API (Phase 3)
