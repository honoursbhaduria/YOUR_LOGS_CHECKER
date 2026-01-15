# Google OAuth Integration - Quick Start

## What Was Added

Google OAuth login has been successfully integrated into your Forensic Log Analysis System. Users can now sign in with their Google accounts alongside the traditional username/password method.

## Files Modified

### Backend
- [backend/requirements.txt](backend/requirements.txt) - Added OAuth packages
- [backend/config/settings.py](backend/config/settings.py) - Configured allauth and Google OAuth
- [backend/config/urls.py](backend/config/urls.py) - Added OAuth URL routes
- [backend/core/urls.py](backend/core/urls.py) - Added Google login endpoint
- [backend/core/google_auth.py](backend/core/google_auth.py) - New Google OAuth handler
- [backend/.env.example](backend/.env.example) - Added Google OAuth variables

### Frontend
- [frontend/src/pages/Login.tsx](frontend/src/pages/Login.tsx) - Added Google Sign-In button
- [frontend/src/api/client.ts](frontend/src/api/client.ts) - Added googleLogin method
- [frontend/.env.example](frontend/.env.example) - Added Google Client ID variable

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 Client ID credentials
5. Add authorized origins: `http://localhost:3000`, `http://localhost:8000`
6. Add redirect URI: `http://localhost:8000/accounts/google/login/callback/`
7. Copy the **Client ID** and **Client Secret**

### 2. Configure Backend

Create or update `backend/.env`:
```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```

### 3. Configure Frontend

Create or update `frontend/.env`:
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Important:** Use the same Client ID in both files.

### 4. Install Backend Packages

```bash
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

### 5. Start Servers

```bash
# Backend
cd backend
source ../venv/bin/activate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm start
```

### 6. Test Google Login

1. Navigate to http://localhost:3000/login
2. Click "Continue with Google" button
3. Sign in with a Google account
4. You'll be redirected to the dashboard

## How It Works

1. User clicks "Continue with Google"
2. Google authentication popup appears
3. User signs in and authorizes the app
4. Frontend receives ID token from Google
5. Frontend sends token to `/api/auth/google/`
6. Backend verifies token with Google
7. Backend creates/retrieves user account
8. Backend returns JWT tokens
9. User is logged in and redirected

## API Endpoint

### POST `/api/auth/google/`

**Request:**
```json
{
  "token": "google_id_token_here"
}
```

**Response:**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "john.doe",
    "email": "john.doe@gmail.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

## Features

- ✅ One-click Google login
- ✅ Automatic user account creation
- ✅ JWT token generation
- ✅ Traditional login still available
- ✅ Secure token verification
- ✅ User profile auto-populated from Google

## Troubleshooting

**Button doesn't appear:** Check `REACT_APP_GOOGLE_CLIENT_ID` is set and restart frontend

**"Google OAuth is not configured":** Set backend environment variables

**"redirect_uri_mismatch":** Add exact redirect URI to Google Cloud Console

**CORS errors:** Verify `CORS_ALLOWED_ORIGINS` includes frontend URL

## Documentation

For detailed setup instructions, see:
- [docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md)

## Notes

- OAuth users have no password set (Google-only authentication)
- Email from Google is automatically verified
- Username is derived from email address
- Existing traditional login remains unchanged
