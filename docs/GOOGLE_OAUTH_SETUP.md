# Google OAuth Setup Guide

## Overview
Google OAuth login has been added to the Forensic Log Analysis System. Users can now sign in using their Google accounts in addition to the traditional username/password method.

## Backend Setup

### 1. Install Required Packages
The following packages have been added to `requirements.txt`:
- `django-allauth==0.57.0` - Social authentication framework
- `dj-rest-auth==5.0.2` - REST API authentication
- `google-auth==2.23.4` - Google authentication library

Install them:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Database Migrations
Apply the new database migrations for allauth and sites:
```bash
python manage.py migrate
```

### 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or Google Identity Services)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. For Application Type, select **Web application**
7. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:8000`
   - Add your production URLs
8. Add authorized redirect URIs:
   - `http://localhost:8000/accounts/google/login/callback/`
   - Add your production callback URLs
9. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Create or update your `.env` file in the backend directory:

```bash
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
```

### 5. Update Django Admin (Optional)

You can also configure the Google OAuth provider through Django admin:

1. Start the server: `python manage.py runserver`
2. Go to `http://localhost:8000/admin/`
3. Navigate to **Sites** → Update the site domain to your actual domain
4. Navigate to **Social applications** → Add a new application:
   - Provider: Google
   - Name: Google OAuth
   - Client ID: Your Google Client ID
   - Secret key: Your Google Client Secret
   - Sites: Select your site

## Frontend Setup

### 1. Configure Environment Variable

Create or update `.env` file in the frontend directory:

```bash
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

**Important:** Use the same Client ID from Google Cloud Console.

### 2. Restart the Development Server

After adding the environment variable, restart your React development server:

```bash
cd frontend
npm start
```

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"** on the login page
2. Google Sign-In popup appears (handled by Google's JavaScript library)
3. User authenticates with Google and approves the app
4. Google returns an ID token to the frontend
5. Frontend sends the token to the backend API endpoint `/api/auth/google/`
6. Backend verifies the token with Google
7. Backend creates or retrieves the user account
8. Backend generates JWT tokens (access and refresh)
9. Frontend stores the tokens and redirects to the dashboard

### User Account Creation

- If the user doesn't exist, a new account is created automatically
- Username is derived from the email address
- User's first name and last name are populated from Google profile
- No password is set (OAuth-only authentication)

### Security Features

- Token verification is performed server-side with Google
- JWT tokens are used for subsequent API requests
- Tokens are stored securely in localStorage
- CORS is properly configured for OAuth redirects

## Testing

### Test Google Login

1. Start both backend and frontend servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   python manage.py runserver
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

2. Navigate to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Sign in with a Google account
5. You should be redirected to the dashboard

### Troubleshooting

**Issue:** Google button doesn't appear
- **Solution:** Check that `REACT_APP_GOOGLE_CLIENT_ID` is set in `.env`
- Make sure the frontend server was restarted after adding the variable

**Issue:** "Google OAuth is not configured" error
- **Solution:** Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in backend `.env`
- Verify they match your Google Cloud Console credentials

**Issue:** "redirect_uri_mismatch" error
- **Solution:** Add the exact redirect URI to authorized redirect URIs in Google Cloud Console
- Format: `http://localhost:8000/accounts/google/login/callback/`

**Issue:** "Invalid token" error
- **Solution:** Ensure Client ID matches between frontend and backend
- Check that the token hasn't expired (generate a new one)

**Issue:** CORS errors
- **Solution:** Verify `CORS_ALLOWED_ORIGINS` in `settings.py` includes your frontend URL
- Check that `CORS_ALLOW_CREDENTIALS = True` is set

## API Endpoints

### Google Login
```
POST /api/auth/google/
Body: {
  "token": "google_id_token_here"
}
Response: {
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "john.doe",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Traditional Login (Still Available)
```
POST /api/auth/login/
Body: {
  "username": "john.doe",
  "password": "password123"
}
```

## Production Deployment

### Additional Steps for Production

1. **Update Google OAuth Settings:**
   - Add production domain to authorized JavaScript origins
   - Add production callback URL to authorized redirect URIs

2. **Update Environment Variables:**
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_production_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_production_client_secret
   ALLOWED_HOSTS=your-domain.com
   CORS_ALLOWED_ORIGINS=https://your-domain.com
   ```

3. **Update Site Domain in Django Admin:**
   - Change from `localhost:8000` to your actual domain
   - Example: `your-domain.com`

4. **SSL Certificate:**
   - Google requires HTTPS for production OAuth
   - Ensure your domain has a valid SSL certificate

## Notes

- Users who sign up with Google will not have a password set
- They can only authenticate via Google (or you can add password reset functionality)
- Existing users can still use traditional login
- Email addresses from Google are automatically verified

## Support

For issues or questions:
- Check Django logs: `backend/` directory
- Check browser console for frontend errors
- Review Google Cloud Console error messages
- Ensure all environment variables are properly set
