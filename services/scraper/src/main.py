from celery import Celery
from celery.signals import worker_shutdown
from src.db.mongodb import close_sync_db

# Create Celery app
app = Celery("campusx-scraper")

# Load config from celeryconfig.py
app.config_from_object("celeryconfig")

# Auto-discover tasks
app.autodiscover_tasks(["src.tasks"])


@worker_shutdown.connect
def cleanup_connections(**kwargs):
    """Clean up MongoDB connections on worker shutdown"""
    close_sync_db()


if __name__ == "__main__":
    app.start()
