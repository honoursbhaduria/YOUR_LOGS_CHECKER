#!/bin/bash

# Forensic Log Analysis System - Setup Script

echo "🔍 Forensic Log Analysis System - Setup Script"
echo "=============================================="

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $python_version found"

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node --version 2>&1)
echo "✓ Node.js $node_version found"

# Backend setup
echo ""
echo "Setting up backend..."
cd backend

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env and add your API keys"
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser prompt
echo ""
echo "Would you like to create a superuser? (y/n)"
read -r create_superuser
if [ "$create_superuser" = "y" ]; then
    python manage.py createsuperuser
fi

# Frontend setup
echo ""
echo "Setting up frontend..."
cd ../frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Complete
echo ""
echo "=============================================="
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (Redis):"
echo "  redis-server"
echo ""
echo "Terminal 2 (Backend):"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  python manage.py runserver"
echo ""
echo "Terminal 3 (Celery):"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  celery -A config worker -l info"
echo ""
echo "Terminal 4 (Frontend):"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo "=============================================="
