# 🚀 Quick Start Guide

Get your forensic analysis system running in under 5 minutes!

## Option 1: Automated Setup (Recommended)

```bash
# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh

# Follow the prompts to:
# - Install Python dependencies
# - Install Node.js dependencies  
# - Run database migrations
# - Create superuser (optional)
```

Then start the services:

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Django Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 3: Celery Worker
cd backend
source venv/bin/activate
celery -A config worker -l info

# Terminal 4: React Frontend
cd frontend
npm start
```

Open http://localhost:3000 in your browser!

---

## Option 2: Docker (One Command)

```bash
# Build and start everything
docker-compose up -d

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# View logs
docker-compose logs -f
```

Access at http://localhost:3000

---

## Option 3: Manual Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis server
- (Optional) PostgreSQL

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env and add:
# - DJANGO_SECRET_KEY (generate new one)
# - OPENAI_API_KEY or ANTHROPIC_API_KEY
# - Other settings as needed

# Initialize database
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Start Redis & Celery

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Celery
cd backend
source venv/bin/activate
celery -A config worker -l info
```

---

## 🔑 First Login

1. Open http://localhost:3000
2. Login with superuser credentials
3. Create your first case
4. Upload sample log file (see `sample_data/security_logs_sample.csv`)
5. Watch the magic happen! 🎉

---

## 🧪 Testing the System

### 1. Create a Test Case
- Click "New Case"
- Name: "Test Incident 001"
- Status: Open

### 2. Upload Sample Logs
- Use provided sample file: `sample_data/security_logs_sample.csv`
- Drag & drop onto the case detail page
- Wait for parsing (a few seconds)

### 3. View Evidence Table
- Click "Evidence Table"
- See parsed events with confidence scores
- Adjust threshold slider to filter events

### 4. Generate Attack Story
- Click "Story View"
- Click "Generate Story"
- Wait for LLM to synthesize narrative (requires API key)
- View plain-English attack explanation

### 5. Export Report
- Click "Generate Report" on case detail
- Wait for PDF generation
- Download and view forensic report

---

## 🔧 Configuration

### Backend (.env)
```bash
# Security
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (optional - defaults to SQLite)
# DATABASE_URL=postgresql://user:pass@localhost/dbname

# LLM Configuration
OPENAI_API_KEY=sk-...        # For GPT-4
ANTHROPIC_API_KEY=sk-ant-... # For Claude
DEFAULT_LLM_PROVIDER=openai  # or 'anthropic'
DEFAULT_LLM_MODEL=gpt-4      # or 'gpt-3.5-turbo' or 'claude-2'

# ML Settings
ML_CONFIDENCE_THRESHOLD=0.7

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS (for development)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 📊 System Health Check

```bash
# Check Django
cd backend
python manage.py check

# Check Celery connection
celery -A config inspect ping

# Check Redis
redis-cli ping

# Run tests
python manage.py test
```

---

## 🐛 Troubleshooting

### "No module named 'config'"
```bash
# Make sure you're in the backend directory
cd backend
# Activate virtual environment
source venv/bin/activate
```

### "Connection refused (Redis)"
```bash
# Start Redis server
redis-server
# Or install Redis:
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
```

### "Database locked" (SQLite)
```bash
# Stop all Django/Celery processes
# Delete db.sqlite3
# Re-run migrations
python manage.py migrate
```

### "Module not found" (React)
```bash
cd frontend
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### LLM Inference Not Working
```bash
# Check API key in .env
echo $OPENAI_API_KEY  # Should print your key

# Test API manually
cd backend
source venv/bin/activate
python -c "import openai; openai.api_key='YOUR_KEY'; print('OK')"
```

---

## 📚 Next Steps

Once running:

1. **Explore the Dashboard** - View summary statistics
2. **Create Cases** - Organize investigations
3. **Upload Evidence** - Test with sample logs
4. **Adjust Thresholds** - Fine-tune confidence filtering
5. **Generate Stories** - See attack narratives
6. **Export Reports** - Create PDF documentation

---

## 🆘 Getting Help

- **Documentation**: See [README.md](README.md) for full docs
- **API Reference**: See [API_REFERENCE.md](API_REFERENCE.md)
- **Project Summary**: See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Sample Data**: Check `sample_data/` directory
- **Issues**: Check Django logs and browser console

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Backend
python manage.py runserver          # Start Django
python manage.py migrate            # Run migrations
python manage.py createsuperuser    # Create admin
python manage.py shell              # Django shell
celery -A config worker -l info     # Start Celery

# Frontend
npm start                           # Start React dev server
npm run build                       # Build for production
npm test                            # Run tests

# Docker
docker-compose up -d                # Start all services
docker-compose down                 # Stop all services
docker-compose logs -f backend      # View backend logs
docker-compose exec backend bash    # Shell into backend
```

---

**🎉 You're all set! Start investigating! 🔍**
