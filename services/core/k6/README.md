# K6 Load Testing Suite

Comprehensive load testing infrastructure for CampusX platform using k6.

## Quick Start

### End-to-End Test (Recommended)

Complete integration: Seeds data + runs load tests

```bash
# From services/core
npm run k6:e2e

# Or directly
cd services/core/k6
./run-e2e.sh
```

### Individual Tests

```bash
# Install k6
brew install k6  # macOS
# OR
sudo apt-get install k6  # Linux
# OR
choco install k6  # Windows

# Run all k6 tests (without seeding)
cd services/core/k6
./run-all.sh

# Run specific test
k6 run -e API_URL=http://localhost:3001 tests/auth.test.js
```

## Prerequisites

### For End-to-End Testing

1. **k6 installed** - [Installation Guide](https://k6.io/docs/getting-started/installation/)
2. **API server running** - Start core service:
   ```bash
   cd services/core
   npm run dev
   ```
3. **MongoDB running** - Ensure MongoDB is accessible

**Note:** E2E script handles seeding automatically!

### For Individual Tests

1. **k6 installed**
2. **Storyboard seed data** - Run seed script first:
   ```bash
   cd services/core
   npm run seed:storyboard -- --fresh --count=60
   ```
3. **API server running**

## End-to-End Test Flow

The `run-e2e.sh` script provides complete integration testing:

### What It Does

1. **Prerequisites Check**
   - Verifies API is running
   - Checks k6 installation
   - Validates MongoDB connection

2. **Storyboard Seeding**
   - Seeds 60 realistic Nigerian university users
   - Creates posts, follows, interactions
   - Uses actual storyboard generator for consistency

3. **Validation**
   - Attempts login with test user
   - Ensures seed data is accessible

4. **Load Tests** (in sequence)
   - Post creation & fanout
   - User interactions (likes, comments, shares)
   - Trending topics validation

5. **Analysis**
   - Summarizes test results
   - Extracts key metrics (p95, error rate)
   - Saves detailed logs

### Usage

```bash
# Basic E2E run
npm run k6:e2e

# Custom configuration
USER_COUNT=100 SEED_FRESH=true npm run k6:e2e

# Skip seeding (use existing data)
SKIP_SEED=true npm run k6:e2e

# Reproducible seed
SEED_SEED=12345 npm run k6:e2e
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3001` | API base URL |
| `USER_COUNT` | `60` | Number of users to seed |
| `SEED_FRESH` | `true` | Clear existing data before seeding |
| `SEED_SEED` | (random) | Deterministic seed for reproducibility |
| `SKIP_SEED` | `false` | Skip seeding phase |

### Results

Results saved in timestamped directory:
```
k6/results/e2e-20250127-143022/
├── seed.log               # Storyboard seed output
├── posts-fanout.json     # Post creation metrics
├── posts-fanout.log      # Detailed log
├── interactions.json     # Interaction metrics
├── interactions.log      # Detailed log
├── trending.json         # Trending metrics
└── trending.log          # Detailed log
```

## Test Suites

### 1. Authentication Test (`auth.test.js`)
Tests user registration and login endpoints.

**What it tests:**
- User registration flow
- Login with credentials
- Token generation
- Concurrent user creation

**Run:**
```bash
k6 run -e API_URL=http://localhost:3001 tests/auth.test.js
```

### 2. Post Fanout Test (`posts-fanout.test.js`)
Tests post creation and feed distribution to followers.

**What it tests:**
- Post creation endpoint
- Newsfeed generation
- Post fanout to followers
- Real-time polling for new posts
- Feed load performance

**Run:**
```bash
k6 run -e API_URL=http://localhost:3001 -e USER_COUNT=10 tests/posts-fanout.test.js
```

### 3. Interactions Test (`interactions.test.js`)
Simulates realistic user interactions with content.

**What it tests:**
- Like/unlike posts
- Comment on posts
- Share posts
- View posts
- Interest tracking integration
- Realistic engagement distribution (Zipf's law)

**Distribution:**
- 60% views only
- 25% likes
- 10% comments
- 5% shares

**Run:**
```bash
k6 run -e API_URL=http://localhost:3001 -e USER_COUNT=10 tests/interactions.test.js
```

### 4. Trending Test (`trending.test.js`)
Validates trending posts and topics endpoints.

**What it tests:**
- Trending posts endpoint
- Trending topics/hashtags
- Proper sorting by engagement
- Caching behavior
- Response times
- Topic discovery

**Run:**
```bash
k6 run -e API_URL=http://localhost:3001 -e USER_COUNT=10 tests/trending.test.js
```

## Configuration

Edit `config.js` to customize:

```javascript
export const config = {
  baseUrl: 'http://localhost:3001',
  testUsers: {
    count: 60,
    password: 'Test@123'
  },
  stages: {
    rampUp: { duration: '30s', target: 10 },
    steady: { duration: '2m', target: 30 },
    peak: { duration: '1m', target: 50 },
    rampDown: { duration: '30s', target: 0 }
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>10']
  }
};
```

## Load Test Profiles

### Standard Load Test
```bash
./run-all.sh
```
- Ramp up: 30s to 10 VUs
- Steady: 2m at 30 VUs
- Peak: 1m at 50 VUs
- Ramp down: 30s to 0 VUs

### Spike Test
```bash
k6 run --config spike.json tests/interactions.test.js
```
- Sudden spike to 100 VUs
- Tests system resilience

### Stress Test
```bash
k6 run --config stress.json tests/posts-fanout.test.js
```
- Gradually increase to 150 VUs
- Find breaking point

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3001` | Base API URL |
| `USER_COUNT` | `10` | Number of test users |
| `PARALLEL` | `false` | Run tests in parallel |

**Examples:**
```bash
# Custom API URL
API_URL=http://staging.campusx.com ./run-all.sh

# More users
USER_COUNT=50 ./run-all.sh

# Parallel execution
PARALLEL=true ./run-all.sh
```

## Metrics & Thresholds

### Custom Metrics
- `post_creation_duration` - Time to create post
- `feed_load_duration` - Time to load newsfeed
- `interaction_duration` - Time for like/comment/share
- `posts_created` - Total posts created
- `interactions_made` - Total interactions

### Default Thresholds
- ✓ 95% of requests < 500ms
- ✓ 99% of requests < 1s
- ✓ Error rate < 1%
- ✓ Min 10 req/s

## Results

Results are saved in `./results/` as JSON files:
```
results/
├── auth.json
├── posts-fanout.json
├── interactions.json
└── trending.json
```

### Analyze Results

```bash
# View summary
cat results/auth.json | jq '.metrics'

# Check error rate
cat results/auth.json | jq '.metrics.http_req_failed'

# View response times
cat results/auth.json | jq '.metrics.http_req_duration'
```

## Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Run Load Tests
  run: |
    cd services/core/k6
    ./run-all.sh
  env:
    API_URL: ${{ secrets.STAGING_API_URL }}
    USER_COUNT: 20
```

## Troubleshooting

**Issue: k6 not found**
```bash
# Install k6
brew install k6  # macOS
```

**Issue: No users available**
```bash
# Run seed script first
cd services/core
npm run seed:storyboard -- --fresh
```

**Issue: Connection refused**
```bash
# Start API server
cd services/core
npm run dev
```

**Issue: Tests failing**
```bash
# Check API is running
curl http://localhost:3001/health

# Check seed data exists
# Connect to MongoDB and verify users/posts collections
```

## Best Practices

1. **Run seed script first** - Ensure test data exists
2. **Start with small user counts** - Gradually increase
3. **Monitor system resources** - CPU, memory, DB connections
4. **Run sequentially first** - Then try parallel for comparison
5. **Check error logs** - Investigate any failures
6. **Adjust thresholds** - Based on your system capabilities

## End-to-End Test Flow

```bash
# 1. Seed data
cd services/core
npm run seed:storyboard -- --fresh --count=60

# 2. Start services
npm run dev

# 3. Run load tests
cd k6
./run-all.sh

# 4. Validate features
# - Posts created → Check fanout to followers' feeds
# - Interactions → Check interest graph updates in ML service
# - Trending → Check trending topics calculated correctly
```

## What Gets Tested End-to-End

✓ **Post Fanout**
- Create post → Appears in followers' feeds
- Real-time polling detects new posts
- Feed pagination works under load

✓ **Interest Tracking**
- Likes/comments → NATS events published
- ML service receives interactions
- User interests updated in vector store

✓ **Trending Topics**
- Engagement accumulates correctly
- Trending posts sorted by score
- Hashtags detected and counted
- Cache improves performance

✓ **Performance**
- Response times within thresholds
- Error rates < 1%
- System handles 50+ concurrent users
- Database queries optimized

## Next Steps

1. Run baseline tests to establish performance metrics
2. Integrate with monitoring (Prometheus, Grafana)
3. Add more test scenarios (search, notifications)
4. Create smoke tests for quick validation
5. Set up automated daily load tests

---

**Status:** ✅ Ready for use
**Author:** Claude Code
**Date:** 2025-11-27
