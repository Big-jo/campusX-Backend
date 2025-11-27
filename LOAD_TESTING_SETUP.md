# Load Testing & Storyboard Setup Guide

Complete setup for testing CampusX platform end-to-end with realistic data and load testing.

## Overview

This setup provides:
1. **Storyboard Seed Script** - Creates 50-60 realistic Nigerian university users with posts, follows, and interactions
2. **K6 Load Testing Suite** - Comprehensive load tests for authentication, posts, interactions, and trending features

## Quick Start

### Complete End-to-End Testing (Recommended)

Automated: Seeds data + runs all load tests

```bash
# 1. Start API server (in one terminal)
cd services/core
npm run dev

# 2. Run end-to-end tests (in another terminal)
npm run k6:e2e
```

**That's it!** The E2E script handles everything:
- ✓ Seeds 60 realistic Nigerian university users
- ✓ Creates posts, follows, interactions
- ✓ Runs comprehensive load tests
- ✓ Validates post fanout, trending topics, interest tracking
- ✓ Generates detailed reports

### Manual Testing (Step-by-step)

```bash
# 1. Install dependencies
cd services/core
npm install

# 2. Seed realistic data
npm run seed:storyboard -- --fresh --count=60

# 3. Start API server
npm run dev

# 4. Install k6 (one-time)
brew install k6  # macOS

# 5. Run all load tests
npm run k6
```

## Part 1: Storyboard Seed Script

### What It Creates

- **60 Users** - Nigerian university students with realistic profiles
  - 20% Active users (8-15 posts each)
  - 30% Moderate users (3-7 posts)
  - 50% Lurkers (0-2 posts)
- **~750-850 Follows** - Small-world network with campus clustering
- **~350-450 Posts** - Nigerian campus context (ASUU, mama put, hostel life)
- **~3,500-5,000 Interactions** - Likes, comments, shares with Zipf distribution

### Features

✅ **Nigerian Context**
- Real Nigerian names (Yoruba, Igbo, Hausa)
- Real universities (UNILAG, UI, OAU, UNN, etc.)
- Authentic campus slang and culture
- Email format: `username@university.edu.ng`

✅ **Realistic Social Graph**
- Watts-Strogatz small-world network
- Preferential attachment for influencers
- Campus-based clustering
- 40% mutual follow rate

✅ **Power Law Content Distribution**
- Active users create 80% of content
- Zipf distribution for engagement
- Time decay for recency
- Peak hours: 7-9am, 12-2pm, 6-11pm

### Usage

```bash
# Basic run
npm run seed:storyboard

# Fresh start (clears existing data)
npm run seed:storyboard -- --fresh

# Custom user count
npm run seed:storyboard -- --count=100

# Reproducible seed
npm run seed:storyboard -- --seed=12345

# All options
npm run seed:storyboard -- --fresh --count=80 --seed=42
```

### Files Created

```
services/core/src/seed/storyboard/
├── seed.ts                          # Main orchestrator
├── README.md                        # Documentation
├── generators/
│   ├── user.generator.ts            # User profiles with IUser compliance
│   ├── post.generator.ts            # Nigerian campus posts
│   └── interaction.generator.ts     # Likes, comments, shares
├── utils/
│   ├── distributions.ts             # Zipf, power law, time decay
│   └── social-graph.ts              # Small-world network algorithms
└── data/
    └── nigerian-names.ts            # Nigerian names and campus slang
```

### Key Fixes Applied

✓ **IUser Interface Compliance**
- Proper `userTag` generation (was missing)
- Complete `userProfile` structure matching IUserProfile
- Nigerian phone number format: `+234 ### ### ####`
- Mixed faker + Nigerian names (70% Nigerian, 30% faker)

✓ **Seed.ts Updates**
- Fixed `user.username` → `user.userTag` references
- Removed redundant `userTag` mapping in insertMany
- Proper campus reference via `user.userProfile.university`

## Part 2: K6 Load Testing Suite

### What It Tests

1. **Authentication (`auth.test.js`)**
   - User registration endpoint
   - Login with credentials
   - Token generation
   - Concurrent user creation

2. **Post Fanout (`posts-fanout.test.js`)**
   - Post creation
   - **Feed distribution to followers**
   - Real-time polling for new posts
   - Feed load performance

3. **Interactions (`interactions.test.js`)**
   - Likes, comments, shares
   - **Interest tracking integration**
   - Realistic engagement distribution
   - NATS event publishing

4. **Trending (`trending.test.js`)**
   - **Trending posts endpoint**
   - **Trending topics/hashtags**
   - Proper sorting by engagement
   - Caching behavior

### Installation

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### Usage

```bash
# Run all tests sequentially
npm run k6

# Run specific test
npm run k6:auth
npm run k6:posts
npm run k6:interactions
npm run k6:trending

# Run directly with k6
cd services/core/k6
k6 run -e API_URL=http://localhost:3001 tests/auth.test.js

# Parallel execution
cd k6
PARALLEL=true ./run-all.sh

# Custom user count
USER_COUNT=50 ./run-all.sh
```

### Load Test Profiles

**Standard Load:**
- Ramp up: 30s → 10 VUs
- Steady: 2m @ 30 VUs
- Peak: 1m @ 50 VUs
- Ramp down: 30s → 0 VUs

**Thresholds:**
- ✓ p95 < 500ms
- ✓ p99 < 1000ms
- ✓ Error rate < 1%
- ✓ Min 10 req/s

### Files Created

```
services/core/k6/
├── README.md                # Comprehensive documentation
├── config.js                # Load test configuration
├── utils.js                 # Helper functions & metrics (reuses storyboard generators!)
├── run-all.sh              # K6 tests only orchestrator
├── run-e2e.sh              # Full E2E: Seed + K6 tests
└── tests/
    ├── auth.test.js        # Registration & login
    ├── posts-fanout.test.js # Post creation & feed distribution
    ├── interactions.test.js # Likes, comments, shares
    └── trending.test.js    # Trending posts & topics
```

**Note:** `utils.js` now reuses the actual storyboard data and generators for consistency!

### Custom Metrics

- `post_creation_duration` - Post creation time
- `feed_load_duration` - Newsfeed load time
- `interaction_duration` - Interaction response time
- `posts_created` - Counter for posts created
- `interactions_made` - Counter for interactions

### Results

Results saved in `k6/results/`:
```
results/
├── auth.json
├── posts-fanout.json
├── interactions.json
└── trending.json
```

**Analyze:**
```bash
# View metrics
cat k6/results/auth.json | jq '.metrics'

# Check error rate
cat k6/results/auth.json | jq '.metrics.http_req_failed'

# Response times
cat k6/results/auth.json | jq '.metrics.http_req_duration'
```

## End-to-End Testing Flow

### Automated E2E (Recommended)

Single command integration testing:

```bash
# Terminal 1: Start API
cd services/core
npm run dev

# Terminal 2: Run E2E tests
npm run k6:e2e
```

**What happens:**
1. ✓ Checks prerequisites (API, k6, MongoDB)
2. ✓ Seeds 60 Nigerian university users with storyboard
3. ✓ Validates seed data accessibility
4. ✓ Runs post fanout load tests
5. ✓ Runs interaction simulation tests
6. ✓ Runs trending topics validation
7. ✓ Generates comprehensive reports

**Customization:**
```bash
# More users
USER_COUNT=100 npm run k6:e2e

# Skip seeding (use existing data)
SKIP_SEED=true npm run k6:e2e

# Deterministic seed
SEED_SEED=12345 npm run k6:e2e

# Fresh start
SEED_FRESH=true npm run k6:e2e
```

### Manual Testing (Step-by-step)

```bash
# Step 1: Seed realistic data
cd services/core
npm run seed:storyboard -- --fresh --count=60

# Step 2: Start services
npm run dev

# Step 3: Run load tests
npm run k6

# Step 4: Validate features
# ✓ Posts created → Check fanout to followers' feeds
# ✓ Interactions → Check interest graph updates in ML service
# ✓ Trending → Verify trending topics calculated correctly
```

### What Gets Validated

✅ **Post Fanout**
- Create post → Appears in followers' newsfeed
- Real-time polling detects new posts
- Feed pagination works under load
- Performance: p95 < 500ms

✅ **Interest Tracking**
- User likes post → NATS event `user.interaction.like`
- ML service receives event
- User interests updated in Qdrant vector store
- Interest weights calculated correctly

✅ **Trending Topics**
- Posts accumulate engagement (likes, comments, shares)
- Trending algorithm sorts by engagement score
- Hashtags detected and counted
- Cache improves performance on repeated requests
- Response time < 1s

✅ **System Performance**
- Handles 50+ concurrent users
- Error rate < 1%
- Database queries optimized
- NATS message delivery reliable

## Configuration

### Storyboard Options

Edit [seed.ts:19-23](services/core/src/seed/storyboard/seed.ts#L19-L23):
```typescript
interface SeedOptions {
  userCount?: number;  // Default: 60
  fresh?: boolean;     // Default: false
  seed?: number;       // Random seed for reproducibility
}
```

### K6 Options

Edit [config.js](services/core/k6/config.js):
```javascript
export const config = {
  baseUrl: 'http://localhost:3001',
  testUsers: { count: 60, password: 'Test@123' },
  stages: {
    rampUp: { duration: '30s', target: 10 },
    steady: { duration: '2m', target: 30 },
    peak: { duration: '1m', target: 50 },
    rampDown: { duration: '30s', target: 0 }
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01']
  }
};
```

## Troubleshooting

### Storyboard Issues

**Error: MONGO_URI not found**
```bash
# Add to .env
MONGO_URI=mongodb://localhost:27017/campusx
```

**Slow execution**
```bash
# Use smaller count
npm run seed:storyboard -- --count=20
```

**Duplicate usernames**
```bash
# Use --fresh flag
npm run seed:storyboard -- --fresh
```

### K6 Issues

**k6 command not found**
```bash
brew install k6  # macOS
```

**No users available in tests**
```bash
# Run seed script first
npm run seed:storyboard -- --fresh
```

**API connection refused**
```bash
# Start API server
npm run dev
```

**Tests failing**
```bash
# Check API health
curl http://localhost:3001/health

# Verify seed data
# Connect to MongoDB and check users/posts collections
```

## Advanced Usage

### Custom Test Scenarios

Create new test in `k6/tests/`:
```javascript
import http from 'k6/http';
import { config } from '../config.js';
import { authenticatedRequest } from '../utils.js';

export let options = {
  stages: [
    { duration: '1m', target: 20 }
  ]
};

export default function() {
  // Your test logic
}
```

### Integration with CI/CD

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2

      - name: Install k6
        run: |
          curl -L https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xvz
          sudo mv k6-v0.45.0-linux-amd64/k6 /usr/local/bin/

      - name: Seed Data
        run: |
          cd services/core
          npm install
          npm run seed:storyboard -- --fresh --count=20

      - name: Run Load Tests
        run: |
          cd services/core
          npm run k6
```

### Monitoring Integration

Connect k6 to Prometheus/Grafana:
```bash
k6 run --out statsd tests/auth.test.js
```

## Performance Benchmarks

### Expected Results (60 users)

**Seed Script:**
- Execution time: ~10-15 seconds
- Database size: ~300-400KB
- Users: 60
- Posts: ~350-450
- Follows: ~750-850
- Interactions: ~3,500-5,000

**Load Tests (50 VUs peak):**
- Post creation: p95 < 300ms
- Feed load: p95 < 400ms
- Interactions: p95 < 200ms
- Trending: p95 < 800ms
- Error rate: < 0.5%
- Throughput: > 50 req/s

## Next Steps

1. ✅ **Baseline Tests** - Establish performance metrics
2. **Monitoring** - Integrate with Prometheus/Grafana
3. **More Scenarios** - Add search, notifications, recommendations tests
4. **Smoke Tests** - Quick validation tests for deployments
5. **Automated Runs** - Daily load tests in CI/CD

## Documentation

- [Storyboard README](services/core/src/seed/storyboard/README.md)
- [K6 README](services/core/k6/README.md)
- [Storyboard Implementation Details](STORYBOARD_IMPLEMENTATION.md)

## Package.json Scripts

```json
{
  "seed:storyboard": "tsx -r dotenv/config src/seed/storyboard/seed.ts",
  "seed:storyboard:fresh": "tsx -r dotenv/config src/seed/storyboard/seed.ts --fresh",
  "k6": "cd k6 && ./run-all.sh",
  "k6:e2e": "cd k6 && ./run-e2e.sh",
  "k6:auth": "k6 run -e API_URL=http://localhost:3001 k6/tests/auth.test.js",
  "k6:posts": "k6 run -e API_URL=http://localhost:3001 k6/tests/posts-fanout.test.js",
  "k6:interactions": "k6 run -e API_URL=http://localhost:3001 k6/tests/interactions.test.js",
  "k6:trending": "k6 run -e API_URL=http://localhost:3001 k6/tests/trending.test.js"
}
```

### Usage

```bash
# End-to-end: Seed + Load tests (Recommended!)
npm run k6:e2e

# Individual components
npm run seed:storyboard -- --fresh  # Seed data only
npm run k6                           # Load tests only (requires seed data)

# Specific tests
npm run k6:posts                     # Post fanout test
npm run k6:interactions              # Interactions test
npm run k6:trending                  # Trending topics test
```

---

**Status:** ✅ Complete and ready for use
**Author:** Claude Code
**Date:** 2025-11-27

## Summary

You now have:
1. **Storyboard seed script** - Generates realistic Nigerian university social platform data
2. **K6 load testing suite** - Comprehensive tests validating all key features
3. **E2E integration** - Single command (`npm run k6:e2e`) runs complete flow
4. **Shared generators** - K6 utils reuse storyboard data for consistency
5. **IUser compliance** - Proper TypeScript interface matching
6. **Full validation** - Post fanout, interest tracking, trending topics, performance

### Key Features

✅ **Storyboard Integration**
- K6 utils reuse Nigerian names, post templates, comment data
- Consistent content generation across seed and load tests
- Realistic engagement distributions (Zipf's law)

✅ **End-to-End Automation**
- `run-e2e.sh` script handles seeding + testing
- Automatic prerequisite checks
- Timestamped results with detailed logs
- Metric extraction and analysis

✅ **Comprehensive Testing**
- Post creation & fanout validation
- User interactions (60% view, 25% like, 10% comment, 5% share)
- Trending algorithm validation
- Performance benchmarks (p95 < 500ms)

### Quick Commands

```bash
# Complete E2E (seed + tests)
npm run k6:e2e

# Seed only
npm run seed:storyboard -- --fresh --count=60

# Tests only
npm run k6

# Specific test
npm run k6:trending
```
