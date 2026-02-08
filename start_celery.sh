#!/bin/bash
# Script to start Celery worker for background task processing

# Activate virtual environment if not already active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source /home/honours/YOUR_LOGS_CHECKER/.venv/bin/activate
fi

# Change to backend directory
cd /home/honours/YOUR_LOGS_CHECKER/backend

echo "Installing Celery and dependencies (if needed)..."
pip install celery redis

echo "Starting Celery worker..."
celery -A config worker --loglevel=info --pool=solo

