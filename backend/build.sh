#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Create media directories
mkdir -p media/evidence
mkdir -p media/reports

# Run database migrations
python manage.py migrate
