# CampusX Content Scraper Service

Python microservice for autonomous content scraping and distribution to bot timelines.

## Architecture

**Flow**: Celery Beat → Scraping Task → Gemini Search → Web Scraper → Content Processor → MongoDB → TypeScript Bot Poster → User Timelines

**Components**:
- **Celery Beat**: Reads bot configs from MongoDB, schedules scraping tasks
- **Celery Worker**: Executes scraping, processes content, writes to DB
- **Gemini Search**: Finds quality sources based on interest keywords
- **Web Scraper**: BeautifulSoup4 + Playwright for static/JS sites
- **Content Processor**: HTML→Markdown, image upload (GCS), keyword extraction
- **MongoDB**: Communication layer (writes ScrapedContent with status='pending')

## Setup

### Prerequisites
- Python 3.11+
- MongoDB running
- Redis running
- Gemini API key
- GCS service account (for image uploads)

### Installation

```bash
cd services/scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
```

### Environment Variables

```env
# MongoDB (shared with TypeScript backend)
MONGO_URI=mongodb://localhost:27017/campusx

# Redis (DB 1 for Celery, DB 0 for TypeScript BullMQ)
REDIS_URL=redis://localhost:6379/1

# Gemini API
GEMINI_API_KEY=your-api-key

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET=campusx-storage
GCS_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
GCS_PUBLIC_URL=https://storage.googleapis.com/campusx-storage
```

## Usage

### Run Celery Worker

```bash
celery -A src.main worker --loglevel=info --concurrency=2
```

### Run Celery Beat (Scheduler)

```bash
celery -A src.main beat --loglevel=info
```

### Manual Trigger (for testing)

```python
from src.tasks.scheduler import trigger_scrape_now

# Trigger scraping for specific bot
task_id = trigger_scrape_now(
    bot_id="<bot_user_id>",
    interest_category="Technology"
)
```

## Docker

### Build

```bash
docker build -t campusx-scraper:latest .
```

### Run with Docker Compose

```bash
# From project root
docker-compose -f docker-compose.scraper.yml up -d

# View logs
docker-compose -f docker-compose.scraper.yml logs -f scraper-worker
docker-compose -f docker-compose.scraper.yml logs -f scraper-beat
```

## Monitoring

### Celery Flower (optional)

```bash
pip install flower
celery -A src.main flower --port=5555
```

Visit: http://localhost:5555

## Testing

### Unit Tests

```bash
pytest src/tests/
```

### Manual Test Scrape

```python
from src.search.gemini_searcher import get_searcher
from src.scraper.scraper import get_scraper
from src.scraper.processor import get_processor

# 1. Search
searcher = get_searcher()
results = searcher.search("Technology", ["AI", "programming"], limit=3)

# 2. Scrape
scraper = get_scraper()
data = scraper.scrape(results[0]["url"])

# 3. Process
processor = get_processor()
processed = processor.process(data)

print(processed["title"])
print(f"Quality: {processed['qualityScore']}")
print(f"Keywords: {processed['keywords']}")
```

## Database Schema

### ScrapedContent Collection

```javascript
{
  _id: ObjectId,
  url: String (unique),
  title: String,
  content: String (markdown),
  images: [String],  // GCS URLs
  keywords: [String],
  sourceDomain: String,
  interestCategory: String,
  scrapedAt: Date,
  qualityScore: Number,
  status: "pending" | "posted" | "rejected",
  usedByBots: [ObjectId],
  metadata: {
    author: String,
    publishedAt: Date,
    wordCount: Number
  }
}
```

## Troubleshooting

### Playwright errors

```bash
# Reinstall browsers
playwright install chromium --force
```

### GCS upload errors

- Verify service account has Storage Object Admin role
- Check GCS_SERVICE_ACCOUNT_KEY path is correct

### Gemini API errors

- Verify API key is valid
- Check quota limits

## Configuration

### Bot Posting Frequency

Configured in MongoDB `bots` collection:

```javascript
{
  user_id: ObjectId,
  botType: "Technology",
  config: {
    postingFrequency: "daily",  // 'hourly', 'daily', 'weekly'
    maxPostsPerDay: 3,
    autoPostEnabled: true,
    keywords: ["AI", "programming", "tech"]
  }
}
```

### Quality Thresholds

In `src/config.py`:

```python
MIN_WORD_COUNT = 100
MIN_QUALITY_SCORE = 0.5
GEMINI_SEARCH_MAX_RESULTS = 10
SCRAPER_RATE_LIMIT_DELAY = 5.0  # seconds
```

## Contributing

1. Add new scrapers in `src/scraper/`
2. Add new search providers in `src/search/`
3. Update tests in `src/tests/`

## License

MIT
