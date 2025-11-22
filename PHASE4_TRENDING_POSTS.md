# Phase 4: Trending Posts - Testing Guide

## What Was Implemented

### Backend (Python ML Service)
1. **MongoDB Integration** - Added posts collection to COLLECTIONS
2. **Trending Algorithm** - Implemented `get_trending_posts()` in `ml/trending.py`:
   - Fetches recent posts from MongoDB (filtered by campus, time window, type=post)
   - Calculates engagement scores: `velocity * decay * campus_boost`
   - Extracts trending topics using TF-IDF
   - Groups posts by topic using Qdrant semantic similarity
   - Returns top hashtags per topic
3. **Celery Task** - Created `precompute_trending_posts` in `tasks/trending_task.py`:
   - Pre-computes trending for all time windows (6h, 24h, 7d)
   - Caches results to Redis with 15min TTL
4. **Scheduler** - Registered periodic task in `tasks/scheduler.py`:
   - Runs every 15 minutes via Celery Beat

### Frontend (TypeScript Core Service)
5. **Validator** - Created Zod schema for trending requests
6. **Service** - Created `TrendingService` with NATS integration
7. **Controller** - Created `TrendingController` following v2 pattern
8. **Route** - Created `/api/v2/trending` endpoint with auth + validation
9. **Registration** - Added route to v2 router

## Files Created/Modified

### Created (5 files):
- `services/ml-service/src/tasks/trending_task.py`
- `services/core/src/validators/v2/trending.validator.ts`
- `services/core/src/services/v2/trending.service.ts`
- `services/core/src/controllers/v2/trending.controller.ts`
- `services/core/src/routes/v2/trending.route.ts`

### Modified (4 files):
- `services/ml-service/src/db/mongodb.py` - Added posts collection
- `services/ml-service/src/ml/trending.py` - Implemented stub function
- `services/ml-service/src/tasks/scheduler.py` - Registered periodic task
- `services/core/src/routes/v2/index.ts` - Registered trending route

---

## Testing

### 1. Restart Services

```bash
# Restart ML service to load new Celery task
docker compose restart ml-service

# Restart core service to load new route
docker compose restart core
```

### 2. Verify Celery Beat Schedule

```bash
# Check logs for scheduler confirmation
docker compose logs ml-service | grep "trending"

# Expected output:
# ✅ Scheduled trending posts pre-computation (every 15 minutes)
```

### 3. Manual Trigger (Optional)

Trigger trending computation manually via Python shell:

```bash
docker compose exec ml-service python

>>> from src.tasks.trending_task import precompute_trending_posts
>>> result = precompute_trending_posts.delay('UNILAG')
>>> print(result.get(timeout=30))
```

### 4. Wait for Pre-computation

Wait 15 minutes for first Celery beat execution, OR trigger manually above.

### 5. Check Redis Cache

```bash
docker compose exec redis redis-cli

> KEYS trending:*
# Should show: trending:all:6h, trending:all:24h, trending:all:7d

> GET trending:all:6h
# Shows cached JSON with topics and post_ids
```

### 6. Test API Endpoint

```bash
# Get trending posts (6h window)
curl -X GET "http://localhost:5000/api/v2/trending?timeWindow=6h" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get trending for specific campus
curl -X GET "http://localhost:5000/api/v2/trending?campus=UNILAG&timeWindow=24h&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response format:
{
  "success": true,
  "data": {
    "topics": [
      {
        "topic": "exam preparation",
        "score": 0.87,
        "posts": [...],  // Full post objects with author data
        "hashtags": ["#exams", "#studytips", "#finals"]
      }
    ],
    "total": 25,
    "source": "cache",
    "computed_at": 1732204800,
    "latency_ms": 3
  }
}
```

### 7. Verify Performance

**Expected latencies:**
- First request (cache miss): ~150ms (computation)
- Cached requests: <5ms

**Check NATS connectivity:**
```bash
curl http://localhost:8222/varz | jq '.in_msgs'
```

---

## API Reference

### GET /api/v2/trending

**Query Parameters:**
- `campus` (optional) - Campus identifier (defaults to user's campus)
- `timeWindow` (optional) - `6h`, `24h`, or `7d` (default: `6h`)
- `limit` (optional) - Max topics to return (1-20, default: 10)

**Headers:**
- `Authorization: Bearer {token}` (required)

**Response:**
```typescript
{
  success: boolean;
  data: {
    topics: Array<{
      topic: string;           // Trending keyword/phrase
      score: number;           // TF-IDF score
      posts: Array<Post>;      // Full post objects (enriched)
      hashtags: string[];      // Top 3 hashtags
    }>;
    total: number;             // Total posts across all topics
    source: string;            // 'cache' | 'ml' | 'error'
    computed_at: number;       // Unix timestamp
    latency_ms: number;        // Request latency
  };
}
```

---

## Troubleshooting

### Issue: No trending data returned

**Check:**
1. MongoDB has posts with `type='post'` created within time window
2. Celery beat is running: `docker compose logs ml-service | grep beat`
3. Redis cache is populated: `docker exec -it redis redis-cli KEYS "trending:*"`

**Solution:**
```bash
# Manually trigger computation
docker compose exec ml-service python -c "
from src.tasks.trending_task import precompute_trending_posts
precompute_trending_posts.apply(args=['all'])
"
```

### Issue: NATS timeout error

**Check:**
```bash
# Verify NATS is running
curl http://localhost:8222/varz

# Check ML service NATS connection
docker compose logs ml-service | grep "NATS"
```

**Solution:**
```bash
docker compose restart nats ml-service
```

### Issue: TF-IDF returns no topics

**Reason:** Not enough posts or all posts too similar

**Solution:** Need minimum 2 posts with different content for TF-IDF extraction

---

## Monitoring

### Celery Task Status

```bash
# View Celery worker logs
docker compose logs -f ml-service | grep trending

# Check task history in Redis
docker compose exec redis redis-cli
> KEYS celery-task-meta-*
```

### Cache Hit Rates

```bash
# Monitor Redis operations
docker compose exec redis redis-cli MONITOR | grep trending
```

### NATS Metrics

```bash
# Check message throughput
curl http://localhost:8222/varz | jq '.in_msgs, .out_msgs'
```

---

## Next Steps

**Phase 5: Enhanced User Suggestions**
- User taste profile building (Qdrant user_profiles collection)
- Engagement pattern similarity
- Interest overlap (Jaccard)
- Hybrid FOF + ML merge (70/30 split)

**Phase 6: Optimization & Monitoring**
- Performance tuning
- Load testing
- Monitoring dashboards
