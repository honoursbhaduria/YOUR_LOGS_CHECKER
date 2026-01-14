# Forensic Log Analysis System

A comprehensive security log analysis platform that combines machine learning, automated parsing, and AI-powered narrative generation for cybersecurity investigations.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![Django](https://img.shields.io/badge/django-5.0-green.svg)
![React](https://img.shields.io/badge/react-18.0-blue.svg)

## 🚀 Features

- **Automated Log Parsing**: CSV, JSON, and Syslog format support with intelligent column mapping
- **ML Confidence Scoring**: Machine learning models score event risk levels (0.0-1.0)
- **Attack Story Synthesis**: AI-generated narratives mapped to MITRE ATT&CK framework
- **Real-time Processing**: Celery-based asynchronous task processing
- **Interactive Dashboard**: React-based UI with timeline visualizations and event exploration
- **Multi-format Reports**: Export findings as PDF or CSV

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Required
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Python**: 3.9 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **PostgreSQL**: 13 or higher (optional, SQLite works for development)
- **Redis**: 6.x or higher (for Celery task queue)

### Recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **CPU**: 2+ cores

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
cd AI_logs_Checking

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Start services (3 terminals needed)

# Terminal 1: Redis
redis-server

# Terminal 2: Backend + Celery
cd backend
source ../venv/bin/activate
python manage.py runserver &
celery -A config worker --loglevel=info

# Terminal 3: Frontend
cd frontend
npm start
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

---

## 🔧 Detailed Setup

### 1. Backend Setup

#### Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Python Dependencies
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

#### Configure Database
```bash
# Option A: SQLite (Development - Default)
# No configuration needed, db.sqlite3 will be created automatically

# Option B: PostgreSQL (Production - Recommended)
# 1. Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib  # Ubuntu/Debian

# 2. Create database
sudo -u postgres psql
CREATE DATABASE forensic_logs;
CREATE USER forensic_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE forensic_logs TO forensic_user;
\q

# 3. Update backend/config/settings.py
# Replace DATABASES section with:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'forensic_logs',
        'USER': 'forensic_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

#### Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

#### Create Superuser
```bash
python manage.py createsuperuser
# Follow prompts to set username, email, and password
```

#### Install Redis (Required for Celery)
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS
brew install redis
brew services start redis

# Windows (WSL2)
sudo apt-get install redis-server
sudo service redis-server start
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Verify installation
npm list react react-dom
```

#### Environment Configuration (Optional)
Create `frontend/.env` file:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_VERSION=1.0.0
```

---

## 🚀 Running the Application

### Development Mode

#### Method 1: Manual (3 Terminals)

**Terminal 1: Redis**
```bash
redis-server
```

**Terminal 2: Django + Celery**
```bash
cd backend
source ../venv/bin/activate

# Start Django development server
python manage.py runserver 0.0.0.0:8000 &

# Start Celery worker
celery -A config worker --loglevel=info --concurrency=4
```

**Terminal 3: React Frontend**
```bash
cd frontend
BROWSER=none npm start
```

### Production Mode

#### Backend (using Gunicorn)
```bash
cd backend
source ../venv/bin/activate

# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
```

#### Frontend (Build for Production)
```bash
cd frontend

# Create optimized production build
npm run build

# Serve using Nginx or Apache
```

---

## 🧪 Testing

### Quick Test with Sample Data
```bash
# Test with provided CSV file
cd backend
source ../venv/bin/activate

# Get JWT token and upload botsv3_events.csv
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.access')

# Upload file
curl -X POST http://localhost:8000/api/evidence/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@../botsv3_events.csv" \
  -F "case=1"
```

### Expected Results
- **File Size**: 33.6 KB (231 events)
- **Parse Time**: ~5 seconds
- **Events Detected**: 462 (including duplicates)
- **Attack Pattern**: Brute force attack from IP 45.142.212.61 (20 failed login attempts)
- **Critical Events**: 10+
- **High Risk Events**: 50+

See [FINAL_BOTSV3_TEST_REPORT.md](FINAL_BOTSV3_TEST_REPORT.md) for detailed test results.

---

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  React Frontend │────────▶│  Django Backend │────────▶│   PostgreSQL    │
│   (Port 3000)   │  REST   │   (Port 8000)   │   ORM   │    Database     │
└─────────────────┘  API    └─────────────────┘         └─────────────────┘
                                     │
                                     │ Tasks
                                     ▼
                            ┌─────────────────┐
                            │  Celery Workers │
                            │  (Async Jobs)   │
                            └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   Redis Queue   │
                            └─────────────────┘
```

### Processing Pipeline (Forensic Funnel)
```
1. UPLOAD → User uploads CSV/JSON/Syslog files via API
2. PARSE → Auto-detect format and extract events
3. SCORE → ML model scores each event (0.0-1.0)
4. CORRELATE → Group related events by time/user/IP
5. SYNTHESIZE → LLM generates narrative stories
6. REPORT → Generate PDF/CSV reports
```

### Directory Structure
```
AI_logs_Checking/
├── backend/                    # Django backend
│   ├── config/                 # Django settings & URLs
│   ├── core/                   # Main application
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views
│   │   ├── tasks.py           # Celery tasks
│   │   └── services/          # Business logic
│   │       ├── parsers/       # Log parsers
│   │       ├── ml_scoring.py  # ML scoring
│   │       └── story_synthesis.py
│   ├── media/                 # Uploaded files
│   └── requirements.txt       # Python deps
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   └── api/               # API client
│   └── package.json           # Node deps
├── botsv3_events.csv          # Sample data (231 events)
├── setup.sh                   # Quick setup script
└── README.md                  # This file
```

---

## 📚 API Documentation

### Authentication Endpoints
```bash
# Register
POST /api/auth/register/
{
  "username": "analyst1",
  "email": "analyst@company.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!"
}

# Login
POST /api/auth/login/
{
  "username": "analyst1",
  "password": "SecurePass123!"
}
# Returns: {"access": "JWT_TOKEN", "refresh": "REFRESH_TOKEN"}
```

### Case Management
```bash
# Create Case
POST /api/cases/
Headers: Authorization: Bearer JWT_TOKEN
{
  "name": "Incident 2026-001",
  "description": "Suspected brute force attack",
  "status": "OPEN"
}

# List Cases
GET /api/cases/
Headers: Authorization: Bearer JWT_TOKEN
```

### Evidence Upload
```bash
# Upload File
POST /api/evidence/
Headers: Authorization: Bearer JWT_TOKEN
Form Data:
  - file: [CSV/JSON/Syslog file]
  - case: [case_id]
```

### Event Retrieval
```bash
# Get All Events
GET /api/parsed-events/
Headers: Authorization: Bearer JWT_TOKEN

# Search Events
GET /api/parsed-events/?search=failed+login

# Filter by Evidence File
GET /api/parsed-events/?evidence_file=5
```

**Full API Reference**: See [API_REFERENCE.md](API_REFERENCE.md)

---

## 🐛 Troubleshooting

### Backend Issues

**"ModuleNotFoundError: No module named 'core'"**
```bash
cd backend
source ../venv/bin/activate
python manage.py runserver
```

**"django.db.utils.OperationalError: no such table"**
```bash
python manage.py migrate
```

**"Celery worker not processing tasks"**
```bash
# Check Redis
redis-cli ping  # Should return "PONG"

# Restart Celery
celery -A config worker --loglevel=debug
```

**"Port 8000 already in use"**
```bash
lsof -i :8000
kill -9 <PID>
```

### Frontend Issues

**"npm ERR! code ELIFECYCLE"**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**"Port 3000 already in use"**
```bash
lsof -ti :3000 | xargs kill -9
```

### Parsing Issues

**"No events parsed from file"**
1. Check file format (CSV headers required)
2. Verify timestamp column exists
3. Review Celery logs for errors

---

## 🔐 Security Notes

### Production Deployment
- Change `SECRET_KEY` in settings.py
- Set `DEBUG = False`
- Configure `ALLOWED_HOSTS`
- Use PostgreSQL (not SQLite)
- Enable HTTPS/SSL
- Set up CORS properly
- Use environment variables for secrets

---

## 📖 Additional Documentation

- [API Reference](API_REFERENCE.md) - Complete API docs
- [Feature Matrix](FEATURE_MATRIX.md) - Feature details
- [Integration Test Report](INTEGRATION_TEST_REPORT.md) - Test results
- [Final Test Report](FINAL_BOTSV3_TEST_REPORT.md) - botsv3 attack analysis

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check documentation in the docs/ directory

---

**Last Updated**: January 14, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅

### Frontend Setup

---

**Last Updated**: January 14, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
```
POST   /api/report/generate/
GET    /api/report/{id}/download/
```

### Dashboard
```
GET    /api/dashboard/summary/
GET    /api/dashboard/timeline/
GET    /api/dashboard/confidence-distribution/
```

## 🔧 Configuration

### Backend (.env)
```
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4

ML_CONFIDENCE_THRESHOLD=0.7

CELERY_BROKER_URL=redis://localhost:6379/0
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
```

## 🛠 Development

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Code Structure

```
backend/
├── config/          # Django settings
├── core/
│   ├── models/      # Database models
│   ├── services/    # Business logic
│   │   ├── parsers/ # Log parsers
│   │   ├── hashing.py
│   │   ├── ml_scoring.py
│   │   ├── llm_row_inference.py
│   │   ├── story_synthesis.py
│   │   └── report_generator.py
│   ├── tasks.py     # Celery tasks
│   ├── views.py     # API endpoints
│   └── serializers.py

frontend/
├── src/
│   ├── api/         # API client
│   ├── components/  # Reusable components
│   ├── pages/       # Page components
│   └── types/       # TypeScript types
```

## 🎓 Use Cases

1. **Incident Response** - Rapid triage of security events
2. **Forensic Investigation** - Court-ready evidence analysis
3. **Threat Hunting** - Pattern discovery in logs
4. **Compliance Auditing** - Automated evidence collection
5. **Security Research** - Attack technique analysis

## 🚦 Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure production settings in `.env`
3. Run migrations: `python manage.py migrate`
4. Collect static files: `python manage.py collectstatic`
5. Deploy with Gunicorn + Nginx
6. Set up Celery workers as systemd services
7. Build React frontend: `npm run build`
8. Serve frontend with Nginx

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## 📧 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/forensic-analysis/issues)
- Email: support@forensic-analysis.com

## 🎯 Roadmap

- [ ] Phase 1: Core MVP (Current)
- [ ] Phase 2: Advanced ML models
- [ ] Phase 3: Multi-tenant support
- [ ] Phase 4: Real-time log streaming
- [ ] Phase 5: Integration with SIEM platforms

---

**Built for the AI Logs Checking Honours Project**
