# Scraper Debugging Guide

## Quick Start: Docker Compose Testing

### 1. Start Services

```bash
# From project root
cd infra/docker
docker-compose -f docker-compose.scraper.yml up -d

# View logs (follow real-time)
docker-compose -f docker-compose.scraper.yml logs -f scraper-worker
```

### 2. Monitor Progress

```bash
# Check if worker is running
docker ps | grep scraper

# View worker logs
docker logs campusx-scraper-worker -f

# View beat (scheduler) logs
docker logs campusx-scraper-beat -f

# Check MongoDB for scraped content
docker exec -it campusx-mongo mongo campusx --eval "db.scrapedcontents.find().count()"
```

### 3. Stop Services

```bash
cd infra/docker
docker-compose -f docker-compose.scraper.yml down
```

---

## VSCode Debugging (Local)

### Prerequisites

1. **Install Python extension** (should already be installed)
2. **Install debugpy** (already in requirements.txt)
3. **Activate venv**:
   ```bash
   cd services/scraper
   source venv/bin/activate  # Mac/Linux
   # or venv\Scripts\activate  # Windows
   ```

4. **Install dependencies** (if not done):
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

### Option 1: Debug Manual Test Script

**Fastest way to test scraper with breakpoints**

1. Set breakpoints in:
   - `services/scraper/test_scrape.py` (line 24 or 29)
   - `services/scraper/src/tasks/scraper_task.py` (any line in function)
   - `services/scraper/src/search/gemini_searcher.py` (line 70+)
   - `services/scraper/src/scraper/scraper.py` (line 30+)

2. VSCode: Run > Start Debugging > **"Python: Manual Scrape Test"**

3. Code will stop at your breakpoints
   - Inspect variables
   - Step through (F10, F11)
   - View call stack

### Option 2: Debug Celery Worker

**Debug the actual worker process**

1. Set breakpoints in:
   - `services/scraper/src/tasks/scraper_task.py`
   - `services/scraper/src/scraper/scraper.py`

2. VSCode: Run > Start Debugging > **"Python: Scraper Worker (Celery)"**

3. Worker starts in debug mode

4. Trigger task from another terminal:
   ```python
   # In services/scraper directory
   python
   >>> from src.tasks.scheduler import trigger_scrape_now
   >>> from src.db.mongodb import get_sync_db, COLLECTIONS
   >>> db = get_sync_db()
   >>> bot = db['bots'].find_one({'botType': 'Technology'})
   >>> trigger_scrape_now(str(bot['user_id']), 'Technology')
   ```

5. Breakpoint will hit when task executes

### Option 3: Debug Celery Beat (Scheduler)

**Debug the scheduling logic**

1. Set breakpoints in:
   - `services/scraper/src/tasks/scheduler.py` (line 50+)

2. VSCode: Run > Start Debugging > **"Python: Scraper Beat (Scheduler)"**

3. Will hit breakpoint when reading bot configs

---

## Common Breakpoint Locations

### For Gemini Search Testing
```python
# services/scraper/src/search/gemini_searcher.py

def search(self, interest_category: str, keywords: List[str], limit: int = 10):
    # Set breakpoint here (line ~70)
    prompt = self._build_search_prompt(interest_category, keywords, limit)

    # Or here to see response (line ~75)
    response = self.model.generate_content(prompt)
```

### For Web Scraping Testing
```python
# services/scraper/src/scraper/scraper.py

def _scrape_with_requests(self, url: str):
    # Set breakpoint here (line ~45)
    response = self.session.get(url, timeout=settings.SCRAPER_TIMEOUT)

    # Or here to inspect scraped content (line ~50)
    soup = BeautifulSoup(response.content, "lxml")
```

### For Content Processing Testing
```python
# services/scraper/src/scraper/processor.py

def process(self, scraped_data: Dict) -> Dict:
    # Set breakpoint here (line ~35)
    markdown = self._html_to_markdown(scraped_data["content_html"])

    # Or here to inspect processed data (line ~50)
    return {
        "url": scraped_data["url"],
        "title": scraped_data["title"],
        # ...
    }
```

### For Task Execution Testing
```python
# services/scraper/src/tasks/scraper_task.py

def scrape_by_interest(self, bot_id: str, interest_category: str):
    # Set breakpoint at start (line ~35)
    db = get_sync_db()

    # Or after Gemini search (line ~55)
    search_results = searcher.search(...)

    # Or in the scraping loop (line ~70)
    for result in search_results:
        scraped_data = scraper.scrape(url)
```

---

## Debug Workflow

### Scenario 1: Test Gemini Search Only

```python
# services/scraper/test_gemini.py (create this file)
from src.search.gemini_searcher import get_searcher

searcher = get_searcher()
results = searcher.search("Technology", ["AI", "programming"], limit=3)

# Set breakpoint here
for result in results:
    print(f"URL: {result['url']}")
    print(f"Title: {result['title']}")
```

Run with: VSCode > Debug > "Python: Current File"

### Scenario 2: Test Scraper Only

```python
# services/scraper/test_single_scrape.py (create this file)
from src.scraper.scraper import get_scraper

scraper = get_scraper()

# Use a known-good URL
url = "https://example.com/article"

# Set breakpoint here
data = scraper.scrape(url)

print(f"Title: {data['title']}")
print(f"Content length: {len(data['content_html'])}")
```

### Scenario 3: Test Full Pipeline

Use `test_scrape.py` (already created):

1. Set breakpoints throughout pipeline
2. Run: VSCode > Debug > "Python: Manual Scrape Test"
3. Step through entire flow

---

## Debugging Tips

### Watch Variables

In debug mode, hover over variables or add to "Watch" panel:
- `scraped_data` - raw scraped content
- `processed` - after markdown conversion
- `search_results` - Gemini Search URLs
- `quality_score` - content quality

### Conditional Breakpoints

Right-click breakpoint > Edit Breakpoint > Condition:
```python
# Only break when scraping fails
scraped_data is None

# Only break for specific interest
interest_category == "Technology"

# Only break when quality is low
processed["qualityScore"] < 0.5
```

### Debug Console

While paused, execute code in Debug Console:
```python
# Check DB state
db['scrapedcontents'].find_one()

# Test Gemini search
searcher.search("Sports", ["football"], limit=1)

# Inspect scraped HTML
from bs4 import BeautifulSoup
soup = BeautifulSoup(response.content, "lxml")
soup.find('h1')
```

### Logging

Add debug prints:
```python
import logging
logger = logging.getLogger(__name__)

logger.debug(f"Scraped URL: {url}")
logger.info(f"Quality score: {quality_score}")
```

View in terminal when running debugger.

---

## Troubleshooting Debug Setup

### Python interpreter not found

1. VSCode: Cmd+Shift+P > "Python: Select Interpreter"
2. Choose: `./services/scraper/venv/bin/python`

### Module import errors

- Check `PYTHONPATH` in launch.json is correct
- Verify you're in `services/scraper` directory
- Run: `pip install -r requirements.txt`

### Celery worker won't start in debug mode

Use `--pool=solo` flag (already in launch.json):
```json
"args": ["worker", "--pool=solo", "--concurrency=1"]
```

### Breakpoints not hitting

- Check "justMyCode": false in launch.json (already set)
- Verify file paths match
- Try "Step Into" (F11) instead of "Continue"

### Environment variables not loading

- Create `.env` file in `services/scraper/`
- Or set in launch.json `env` section
- Or export in terminal before launching VSCode:
  ```bash
  export GEMINI_API_KEY=your-key
  code .
  ```

---

## Quick Commands

```bash
# Start MongoDB & Redis only (for local debugging)
cd infra/docker
docker-compose -f docker-compose.scraper.yml up mongo redis -d

# Check if services are running
docker ps

# Seed bots (from project root)
yarn seed:bots

# Activate venv
cd services/scraper
source venv/bin/activate

# Run manual test
python test_scrape.py

# Or debug in VSCode: F5 > "Python: Manual Scrape Test"
```

---

## Next Steps After Testing

1. **Verify scraped content**:
   ```bash
   mongo campusx --eval "db.scrapedcontents.find().pretty()"
   ```

2. **Check quality**:
   ```bash
   mongo campusx --eval "
     db.scrapedcontents.aggregate([
       { \$group: {
         _id: '\$status',
         count: { \$sum: 1 },
         avgQuality: { \$avg: '\$qualityScore' }
       }}
     ])
   "
   ```

3. **Test bot distribution** (TypeScript side):
   ```bash
   node -e "require('./dist/jobs/bot-poster.job').handler({}).then(() => process.exit())"
   ```

4. **Tune quality thresholds** in `src/config.py` based on debug findings

---

## Debug Configurations Summary

| Config Name | Use Case | Breakpoint Locations |
|------------|----------|---------------------|
| **Manual Scrape Test** | Quick end-to-end test | test_scrape.py, scraper_task.py |
| **Scraper Worker** | Debug Celery tasks | scraper_task.py, scraper.py |
| **Scraper Beat** | Debug scheduling | scheduler.py |
| **Current File** | Test individual modules | Any .py file |
| **Attach** | Debug running process | Remote debugging |

Happy debugging! 🐛
