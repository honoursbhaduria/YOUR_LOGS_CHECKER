# Google OAuth Configuration Guide

## Overview

Your application uses Google OAuth 2.0 for:
1. **User Authentication** - Sign in with Google
2. **AI Analysis** - Gemini AI for attack story generation and event analysis

## Current Status

✅ **GOOGLE_API_KEY** - Configured (for Gemini AI)  
⚠️ **GOOGLE_OAUTH_CLIENT_ID** - Placeholder (needs your actual credentials)  
⚠️ **GOOGLE_OAUTH_CLIENT_SECRET** - Placeholder (needs your actual credentials)

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name: `YourLogsChecker` (or any name)
4. Click **Create**

---

## Step 2: Enable Required APIs

1. In your project, go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google+ API** (for OAuth login)
   - **People API** (for user profile)

---

## Step 3: Create OAuth 2.0 Credentials

### Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Fill in required fields:
   - **App name**: `Your Logs Checker`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - Select: `userinfo.email`
   - Select: `userinfo.profile`
6. Click **Save and Continue**
7. **Test users** (for testing mode):
   - Add your email and any test user emails
8. Click **Save and Continue** → **Back to Dashboard**

### Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `YourLogsChecker Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://logscanner-ver.vercel.app
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://logscanner-ver.vercel.app/auth/callback
   https://your-logs-checker.onrender.com/api/auth/google/callback/
   ```
7. Click **Create**
8. **Save these credentials** (shown once):
   - Client ID: `123456789-abcdef.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ`

---

## Step 4: Update Environment Variables

### Backend (Render)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service: `your-logs-checker`
3. Go to **Environment** tab
4. Update these variables:

```env
GOOGLE_OAUTH_CLIENT_ID=<your-actual-client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-<your-actual-secret>
```

5. Click **Save Changes** (service will auto-deploy)

### Frontend (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `logscanner-ver`
3. Go to **Settings** → **Environment Variables**
4. Add variable:

```env
REACT_APP_GOOGLE_CLIENT_ID=<your-actual-client-id>.apps.googleusercontent.com
```

5. Click **Save**
6. Redeploy: **Deployments** → **Redeploy**

---

## Step 5: Test Google OAuth Login

### Local Testing

1. Start backend:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Visit `http://localhost:3000/login`
4. Click **Sign in with Google**
5. Select your Google account
6. Grant permissions
7. You should be redirected back and logged in

### Production Testing

1. Visit `https://logscanner-ver.vercel.app/login`
2. Click **Sign in with Google**
3. Complete OAuth flow

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your request doesn't match what's configured in Google Cloud Console.

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add the exact redirect URI shown in the error
4. Save changes

### Error: "access_denied"

**Cause**: User denied permission or app not verified.

**Fix**:
1. Make sure OAuth consent screen is configured
2. Add test users if app is in testing mode
3. For production, submit app for verification (optional)

### Error: "invalid_client"

**Cause**: Client ID or Secret is incorrect.

**Fix**:
1. Double-check environment variables
2. Make sure no extra spaces or quotes
3. Regenerate credentials if needed

---

## Security Best Practices

### ✅ DO:
- Keep Client Secret confidential (never commit to git)
- Use environment variables for all sensitive data
- Rotate secrets periodically
- Use HTTPS in production
- Limit OAuth scopes to minimum required

### ❌ DON'T:
- Commit `.env` files to version control
- Share Client Secret publicly
- Use production credentials in development
- Hardcode credentials in source code

---

## Current Environment Variables Reference

### Backend (.env or Render)
```env
# Database
DATABASE_URL=postgresql://...

# Django
SECRET_KEY=your-django-secret
DEBUG=False
ALLOWED_HOSTS=your-logs-checker.onrender.com
CORS_ALLOWED_ORIGINS=https://logscanner-ver.vercel.app

# Google Services
GOOGLE_API_KEY=AIzaSyBeNOS_d11TDg8ZMSTjFQu5ybzI-_TQ7s0
GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# AI Configuration
DEFAULT_LLM_MODEL=gemini-2.5-flash
DEFAULT_LLM_PROVIDER=google

# ML Configuration
ML_CONFIDENCE_THRESHOLD=0.7
```

### Frontend (.env.local or Vercel)
```env
REACT_APP_API_URL=https://your-logs-checker.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

---

## Testing OAuth Integration

### Quick Test Script

```bash
# Test Google OAuth endpoint
curl -X POST https://your-logs-checker.onrender.com/api/auth/google/login/ \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token"}'
```

Expected: Should return error about invalid token (proves endpoint exists)

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Debugging Tool](https://developers.google.com/oauthplayground/)

---

## Summary

1. ✅ **Gemini AI works** - GOOGLE_API_KEY is configured
2. ⚠️ **OAuth needs setup** - Follow steps above to get real credentials
3. 🔧 **Alternative**: You can use regular username/password auth (already working)

**Note**: Google OAuth is optional. Your app already supports standard authentication (username/password). OAuth just provides "Sign in with Google" functionality for convenience.
