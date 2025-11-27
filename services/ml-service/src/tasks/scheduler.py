from celery import signals
from celery.schedules import crontab
from src.celery_app import app
from src.db.mongodb import get_sync_db, COLLECTIONS
from src.tasks.scraper_task import scrape_by_interest
from src.tasks.trending_task import precompute_trending_posts

print("🔧 scheduler.py imported")


def get_cron_schedule(frequency: str):
    """
    Convert posting frequency to Celery crontab

    Args:
        frequency: 'hourly', 'daily', 'weekly'

    Returns:
        crontab schedule
    """
    schedules = {
        "hourly": crontab(minute=0),  # Every hour at :00
        "daily": crontab(hour=8, minute=0),  # Daily at 8:00 AM
        "weekly": crontab(day_of_week=1, hour=8, minute=0),  # Monday 8:00 AM
    }

    return schedules.get(frequency, crontab(hour=8, minute=0))  # Default to daily


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    """
    Dynamic scheduler: Load active bots from MongoDB
    and schedule scraping tasks based on their config

    This runs after Celery app finalization (recommended for embedded beat)
    """
    print("🔧 Setting up periodic scraping tasks...")

    try:
        db = get_sync_db()
        # print(db)
        print(f"✅ MongoDB connected: {db.name}")

        # Find all active bots with auto-posting enabled
        bots = list(db[COLLECTIONS["bots"]].find(
            {"status": "active", "config.autoPostEnabled": True}
        ))

        print(bots)

        print(f"📊 Found {len(bots)} active bots with auto-posting enabled")

        task_count = 0

        for bot in bots:
            try:
                bot_id = str(bot["user_id"])
                interest_category = bot["botType"]
                frequency = bot["config"].get("postingFrequency", "daily")

                # Get cron schedule
                schedule = get_cron_schedule(frequency)

                # Add periodic task
                task_name = f"scrape-{interest_category.lower().replace(' ', '-')}-{bot_id}"

                sender.add_periodic_task(
                    schedule,
                    scrape_by_interest.s(bot_id, interest_category),
                    name=task_name,
                )

                print(
                    f"✅ Scheduled {task_name}: {frequency} scraping for {interest_category}"
                )

                task_count += 1

            except Exception as e:
                print(f"❌ Failed to schedule task for bot {bot.get('_id')}: {e}")
                continue

        if task_count == 0:
            print("⚠️  No periodic tasks scheduled. Check MongoDB for active bots with autoPostEnabled=true")
        else:
            print(f"✅ Successfully scheduled {task_count} periodic scraping tasks")

        # Schedule trending posts pre-computation (every 15 minutes)
        sender.add_periodic_task(
            crontab(minute='*/15'),
            precompute_trending_posts.s('all'),
            name='precompute-trending-all',
        )
        print("✅ Scheduled trending posts pre-computation (every 15 minutes)")

        # Schedule feed validation (daily at 2 AM)
        from src.tasks.pipeline_task import validate_all_feeds_task
        sender.add_periodic_task(
            crontab(hour=2, minute=0),
            validate_all_feeds_task.s(),
            name='validate-feeds-daily',
        )
        print("✅ Scheduled daily feed validation (2:00 AM)")

        # Schedule auto-discovery (weekly on Sunday at 3 AM)
        from src.tasks.pipeline_task import auto_discovery_task
        sender.add_periodic_task(
            crontab(day_of_week=0, hour=3, minute=0),
            auto_discovery_task.s(),
            name='auto-discovery-weekly',
        )
        print("✅ Scheduled weekly auto-discovery (Sunday 3:00 AM)")

        # Schedule content gap analysis (daily at 4 AM)
        from src.tasks.pipeline_task import analyze_content_gaps_task
        sender.add_periodic_task(
            crontab(hour=4, minute=0),
            analyze_content_gaps_task.s(),
            name='analyze-gaps-daily',
        )
        print("✅ Scheduled daily content gap analysis (4:00 AM)")

    except Exception as e:
        print(f"❌ Failed to setup periodic tasks: {e}")


# Manual trigger function (for testing/admin)
def trigger_scrape_now(bot_id: str, interest_category: str):
    """
    Manually trigger scraping task (for testing)

    Args:
        bot_id: Bot user ID
        interest_category: Interest category name

    Returns:
        Task result
    """
    print(f"Manually triggering scrape for {interest_category}")
    task = scrape_by_interest.delay(bot_id, interest_category)
    return task.id
