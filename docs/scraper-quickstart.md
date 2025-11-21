# Content Scraper - Quick Start

## What Was Built

**Phase 1: Basic Scraper + Bot Distribution System**

### Components

1. **Python Scraper Service** (`services/scraper/`)
   - Gemini Search integration
   - Web scraper (BeautifulSoup4 + Playwright)
   - Content processor (HTML→Markdown, GCS uploads)
   - Celery tasks + scheduler

2. **TypeScript Integration**
   - ScrapedContent MongoDB model
   - Bot seeding script (10 bots)
   - BotPoster service (timeline injection)
   - BullMQ job (polls DB every 30min)

3. **Infrastructure**
   - Docker Compose setup
   - MongoDB communication layer
   - Redis (separate DBs for Celery/BullMQ)

## Quick Start

### 1. Setup Environment

```bash
# Copy and edit .env
cp .env.example .env
# Add: GEMINI_API_KEY, GCS credentials
```

### 2. Seed Bots

```bash
yarn seed:bots
```

Creates 10 bots for:
- Fashion & Beauty 👗
- Animals 🐶
- Transportation 🚗
- Technology 💻
- Academics 📚
- Sports & Fitness ⚽
- Entertainment 🎬
- Food & Cooking 🍕
- Travel & Adventure ✈️
- Arts & Creativity 🎨

### 3. Start Services

```bash
# Option A: Docker (easiest)
docker-compose -f docker-compose.scraper.yml up -d

# Option B: Local (for development)
# Terminal 1: TypeScript backend
yarn dev

# Terminal 2: TypeScript worker
node -r dotenv/config dist/worker.js

# Terminal 3: Python Celery worker
cd services/scraper && celery -A src.main worker --loglevel=info

# Terminal 4: Python Celery beat
cd services/scraper && celery -A src.main beat --loglevel=info
```

### 4. Verify

```bash
# Check scraped content
mongo campusx --eval "db.scrapedcontents.find({status: 'pending'}).count()"

# Check bot posts
mongo campusx --eval "db.posts.find({author: {$in: <bot_ids>}}).count()"
```

## How It Works

### Data Flow

```
1. Celery Beat (reads bot configs from DB)
   ↓
2. Schedules scraping tasks (daily/hourly per bot)
   ↓
3. Celery Worker executes:
   - Gemini Search (finds URLs)
   - Web Scraper (scrapes content)
   - Processor (markdown + GCS upload)
   - Writes to MongoDB (status='pending')
   ↓
4. TypeScript BullMQ (polls DB every 30min)
   ↓
5. BotPoster service:
   - Fetches pending content
   - Creates Post (by bot user)
   - Finds users with matching interests
   - Injects directly to their timelines (Redis)
   - Updates content (status='posted')
   ↓
6. Users see bot posts in their feeds
```

### Timeline Injection (Direct)

Bots don't follow users. Instead, posts are injected directly into timelines of users with matching interests:

```typescript
// Find users with interest "Technology"
users = await User.find({ interests: "Technology" })

// Inject post into each user's timeline
for (user of users) {
  redis.zadd(`v2:newsfeed:timeline:${user._id}`, timestamp, postId)
}
```

## Commands

### Seed Bots

```bash
yarn seed:bots           # Create bots
yarn seed:bots:fresh     # Recreate (deletes existing)
```

### Docker

```bash
docker-compose -f docker-compose.scraper.yml up -d       # Start
docker-compose -f docker-compose.scraper.yml logs -f     # Logs
docker-compose -f docker-compose.scraper.yml down        # Stop
```

### Monitoring

```bash
# MongoDB stats
mongo campusx --eval "
  db.scrapedcontents.aggregate([
    { \$group: { _id: '\$status', count: { \$sum: 1 } } }
  ])
"

# Bot stats
mongo campusx --eval "
  db.bots.find({}, {botType: 1, 'stats.totalPosts': 1})
"

# Redis timeline check
redis-cli ZCARD v2:newsfeed:timeline:<user_id>
```

## Configuration

### Bot Posting Frequency

```javascript
// In MongoDB
db.bots.updateOne(
  {botType: "Technology"},
  {$set: {"config.postingFrequency": "hourly"}}  // daily, hourly, weekly
)
// Restart Celery Beat
```

### Quality Filters

Edit `services/scraper/src/config.py`:

```python
MIN_WORD_COUNT = 100        # Minimum article length
MIN_QUALITY_SCORE = 0.5     # Quality threshold (0-1)
GEMINI_SEARCH_MAX_RESULTS = 10  # URLs per search
SCRAPER_RATE_LIMIT_DELAY = 5.0  # Seconds between requests
```

### Distribution Interval

Edit `src/jobs/cron.job.ts`:

```typescript
// Current: every 30 minutes
botPosterQueue.add('distribute-content', null, {
  repeat: { cron: '*/30 * * * *' }  // Change to '*/15 * * * *' for 15min
});
```

## Troubleshooting

### No content scraped

- Check GEMINI_API_KEY is set
- Check Celery worker logs
- Verify bots exist: `db.bots.find().count()`

### Content not in timelines

- Check users have matching interests: `db.users.find({interests: "Technology"})`
- Check bot-poster job is running
- Check Redis: `redis-cli ZRANGE v2:newsfeed:timeline:<user_id> 0 -1`

### Celery connection errors

- Verify MONGO_URI and REDIS_URL
- Check services are running
- Test connection: `mongo $MONGO_URI --eval "db.runCommand({ping: 1})"`

## Next Steps

- [ ] Test end-to-end flow
- [ ] Monitor first scraping cycle
- [ ] Verify posts in user feeds
- [ ] Adjust quality thresholds
- [ ] Add content moderation
- [ ] Implement Phase 2 (recursive scraping)

## Files Created

### Python Service
```
services/scraper/
├── src/
│   ├── main.py                    # Celery app
│   ├── config.py                  # Settings
│   ├── db/
│   │   ├── mongodb.py             # DB connection
│   │   └── models.py              # Pydantic models
│   ├── search/
│   │   └── gemini_searcher.py     # Gemini Search
│   ├── scraper/
│   │   ├── scraper.py             # Web scraper
│   │   └── processor.py           # Content processor
│   └── tasks/
│       ├── scraper_task.py        # Celery task
│       └── scheduler.py           # Dynamic scheduler
├── Dockerfile
├── requirements.txt
├── celeryconfig.py
└── README.md
```

### TypeScript Integration
```
src/
├── models/
│   └── ScrapedContent.model.ts    # MongoDB model
├── services/v2/
│   └── bot-poster.service.ts      # Timeline injection
├── jobs/
│   └── bot-poster.job.ts          # BullMQ job
├── seed/bots/
│   ├── data.ts                    # Bot configs
│   └── seed.ts                    # Seeding script
└── worker.ts                      # Updated with bot-poster

.local/
├── content-scraper-system.md      # Full spec
└── scraper-setup.md               # Setup guide

docker-compose.scraper.yml         # Docker setup
SCRAPER_QUICK_START.md            # This file
```

## Support

See detailed docs:
- Python: `services/scraper/README.md`
- Setup: `.local/scraper-setup.md`
- Architecture: `.local/content-scraper-system.md`
