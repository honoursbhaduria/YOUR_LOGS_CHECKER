# Quick Setup Guide

## 🚀 5-Minute Setup

### Prerequisites Check
```bash
python3 --version  # Need 3.9+
node --version     # Need 16+
redis-cli ping     # Should return PONG
```

### Step 1: Backend Setup (2 minutes)
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Setup database
python manage.py migrate
python manage.py createsuperuser
```

### Step 2: Frontend Setup (1 minute)
```bash
cd frontend
npm install
```

### Step 3: Start Services (3 terminals)

**Terminal 1: Redis**
```bash
redis-server
```

**Terminal 2: Backend + Celery**
```bash
cd backend
source ../venv/bin/activate
python manage.py runserver &
celery -A config worker --loglevel=info
```

**Terminal 3: Frontend**
```bash
cd frontend
npm start
```

### Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin

---

## 📝 Common Commands

### Backend
```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
cd backend && python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start Django
python manage.py runserver

# Start Celery
celery -A config worker --loglevel=info

# Run tests
python manage.py test
```

### Frontend
```bash
# Install dependencies
cd frontend && npm install

# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test
```

---

## 🧪 Quick Test

```bash
# 1. Login and get token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | jq -r '.access'

# Save token
export TOKEN="your_access_token_here"

# 2. Create a case
curl -X POST http://localhost:8000/api/cases/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Case","description":"Testing","status":"OPEN"}'

# 3. Upload evidence
curl -X POST http://localhost:8000/api/evidence/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@botsv3_events.csv" \
  -F "case=1"

# 4. Check parsed events
curl http://localhost:8000/api/parsed-events/ \
  -H "Authorization: Bearer $TOKEN" | jq '.count'
```

---

## 🐛 Quick Fixes

### Port Already in Use
```bash
# Backend (8000)
lsof -ti :8000 | xargs kill -9

# Frontend (3000)
lsof -ti :3000 | xargs kill -9

# Redis (6379)
redis-cli shutdown
```

### Reset Database
```bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Clear Celery Queue
```bash
celery -A config purge
```

### Frontend Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📊 System Status Check

```bash
# Check all services
echo "=== Django ===" && curl -s http://localhost:8000/api/ > /dev/null && echo "✅ Running" || echo "❌ Down"
echo "=== React ===" && curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "❌ Down"
echo "=== Redis ===" && redis-cli ping > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Down"
echo "=== Celery ===" && ps aux | grep -q "celery.*worker" && echo "✅ Running" || echo "❌ Down"
```

---

## 🔑 Default Credentials

After running `python manage.py createsuperuser`, use:
- Username: (what you entered)
- Password: (what you entered)

For testing, you can create:
- Username: `admin`
- Password: `admin123`
- Email: `admin@test.com`

⚠️ **Change these in production!**

---

## 📁 Sample Files

Test with these files in the root directory:
- `botsv3_events.csv` - 231 events with brute force attack
- `test_small.csv` - 4 events for quick testing

---

## 🎯 Next Steps

1. ✅ Complete setup
2. ✅ Test with sample data
3. 📖 Read [README.md](README.md) for full documentation
4. 📚 Check [API_REFERENCE.md](API_REFERENCE.md) for API details
5. 🧪 Review [FINAL_BOTSV3_TEST_REPORT.md](FINAL_BOTSV3_TEST_REPORT.md) for expected results

---

**Need Help?** See full [README.md](README.md) or open an issue on GitHub.
