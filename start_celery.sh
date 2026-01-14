#!/bin/bash
# Script to start Celery worker for background task processing

cd /home/honours/AI_logs_Checking/backend

echo "Installing Celery and dependencies..."
pip3 install --user celery redis

echo "Starting Celery worker..."
python3 -m celery -A config worker --loglevel=info

