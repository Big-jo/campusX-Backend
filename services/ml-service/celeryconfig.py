import os
from celery.schedules import crontab

# Redis broker (separate DB from TypeScript BullMQ)
broker_url = os.getenv("REDIS_URL", "redis://localhost:6379/1")
result_backend = broker_url

# Serialization
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

# Timezone
timezone = "UTC"
enable_utc = True

# Task routing
task_routes = {
    "src.tasks.scraper_task.*": {"queue": "scraper"},
}

# Worker settings
worker_prefetch_multiplier = 1
worker_max_tasks_per_child = 100

# Beat schedule (dynamic loading from DB in scheduler.py)
beat_schedule = {}
