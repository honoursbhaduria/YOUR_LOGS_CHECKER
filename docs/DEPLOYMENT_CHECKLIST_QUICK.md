# 🚀 Quick Deployment Checklist

## Before Deployment

### Backend Preparation
- [ ] Push latest code to GitHub
- [ ] Verify `render.yaml` is in `backend/` folder
- [ ] Verify `Dockerfile` and `entrypoint.sh` are present
- [ ] Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in settings
- [ ] Get API keys (Google AI recommended for free tier)

### Frontend Preparation  
- [ ] Push latest code to GitHub
- [ ] Verify `vercel.json` is in `frontend/` folder
- [ ] Test build locally: `cd frontend && npm run build`
- [ ] Verify API client uses `REACT_APP_API_URL` env variable

---

## Render Deployment (Backend)

### Step 1: Create Services
- [ ] Create PostgreSQL database
- [ ] Create Redis instance
- [ ] Create Web Service (main backend)
- [ ] Create Worker Service (Celery)

### Step 2: Configure Environment Variables
- [ ] `DJANGO_SECRET_KEY` (auto-generated)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` (add your .onrender.com URL)
- [ ] `DATABASE_URL` (link to PostgreSQL)
- [ ] `CELERY_BROKER_URL` (link to Redis)
- [ ] `CELERY_RESULT_BACKEND` (link to Redis)
- [ ] `CORS_ALLOWED_ORIGINS` (will add Vercel URL later)
- [ ] `GOOGLE_API_KEY` (get from Google AI Studio)
- [ ] `DEFAULT_LLM_PROVIDER=google`
- [ ] `DEFAULT_LLM_MODEL=gemini-2.0-flash-exp`

### Step 3: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build (5-10 minutes)
- [ ] Check logs for errors
- [ ] Test: Visit `https://your-app.onrender.com/api/health/`
- [ ] Should see: `{"status": "healthy"}`

---

## Vercel Deployment (Frontend)

### Step 1: Import Project
- [ ] Go to Vercel dashboard
- [ ] Click "Add New Project"
- [ ] Import from GitHub
- [ ] Select your repository

### Step 2: Configure
- [ ] Framework: Create React App
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`

### Step 3: Environment Variables
- [ ] Add `REACT_APP_API_URL` = `https://your-app.onrender.com/api`
  (Replace with your actual Render URL)

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build (2-5 minutes)
- [ ] Copy your Vercel URL: `https://your-app.vercel.app`

---

## Post-Deployment

### Update Backend CORS
- [ ] Go to Render dashboard
- [ ] Open your web service
- [ ] Edit `CORS_ALLOWED_ORIGINS` environment variable
- [ ] Add your Vercel URL: `https://your-app.vercel.app`
- [ ] Save (service will auto-redeploy)

### Test Everything
- [ ] Visit your Vercel URL
- [ ] Register a new account
- [ ] Login successfully
- [ ] Create a new investigation/case
- [ ] Upload a log file (test with sample CSV)
- [ ] Wait for parsing (check Celery worker logs on Render)
- [ ] View parsed events
- [ ] Generate a report
- [ ] Download PDF report

---

## URLs to Save

Backend (Render):
- Web Service: `https://_______________.onrender.com`
- Admin Panel: `https://_______________.onrender.com/admin/`
- API Docs: `https://_______________.onrender.com/api/`
- Health Check: `https://_______________.onrender.com/api/health/`

Frontend (Vercel):
- Production: `https://_______________.vercel.app`

Database:
- PostgreSQL: `postgresql://forensic_user:****@****:5432/forensic_db`
- Redis: `redis://****:6379/0`

---

## Troubleshooting

### Backend Issues
```bash
# View logs on Render
Dashboard → Your Service → Logs

# Common fixes:
- Check all environment variables are set
- Verify DATABASE_URL format is correct
- Ensure migrations ran successfully
- Check Celery worker is running
```

### Frontend Issues
```bash
# View logs on Vercel
Dashboard → Your Project → Deployments → View Logs

# Common fixes:
- Verify REACT_APP_API_URL points to Render backend
- Check CORS settings on backend
- Look for 404/500 errors in browser console
```

### CORS Errors
```bash
# Symptoms:
- "No 'Access-Control-Allow-Origin' header"
- API requests fail from frontend

# Fix:
1. Backend: Update CORS_ALLOWED_ORIGINS to include Vercel URL
2. No trailing slash: ✅ https://app.vercel.app
3. With trailing slash: ❌ https://app.vercel.app/
```

---

## Free Tier Limitations

**Render (Free Tier):**
- ✅ PostgreSQL: 1 GB storage
- ✅ Redis: 25 MB storage
- ⚠️ Web service sleeps after 15 minutes of inactivity
- ⚠️ First request after sleep: 30-60 seconds to wake up
- 💡 Upgrade to $7/mo Starter plan to keep always-on

**Vercel (Free Tier):**
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Perfect for frontend hosting

---

## Getting API Keys

### Google AI (Recommended - Free Tier)
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza`)
4. Add to Render: `GOOGLE_API_KEY=AIza****`
5. Free tier: 1,500 requests/day

### OpenAI (Optional)
1. Visit: https://platform.openai.com/api-keys
2. Create new secret key
3. Starts with `sk-`
4. Pay-as-you-go pricing

### Anthropic (Optional)
1. Visit: https://console.anthropic.com/
2. Create API key
3. Starts with `sk-ant-`
4. Free $5 credit

---

## 🎉 Done!

Your forensic analysis platform is now live:
- ✅ Backend deployed on Render
- ✅ Frontend deployed on Vercel
- ✅ Database & Redis configured
- ✅ Celery worker processing tasks
- ✅ HTTPS enabled automatically

Share your Vercel URL with users! 🚀
