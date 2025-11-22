#!/bin/bash
# Startup script for ML Service
# Runs both Celery worker (for scraping tasks) and NATS ML service

set -e

echo "Starting ML Service..."

# Start Celery worker in background
echo "Starting Celery worker for scraping tasks..."
celery -A src.celery_app worker --beat --loglevel=info --concurrency=2 -Q scraper &
CELERY_PID=$!

# Give Celery a moment to start
sleep 2

# Start NATS ML service in foreground
echo "Starting NATS ML service..."
python -m src.main &
NATS_PID=$!

# Trap signals and forward to both processes
trap 'kill -TERM $CELERY_PID $NATS_PID; wait' SIGTERM SIGINT

echo "✅ ML Service running (Celery: $CELERY_PID, NATS: $NATS_PID)"

# Wait for both processes
wait
