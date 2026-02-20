# 🚀 Deployment Guide - Render.com

## Quick Fix for 404 Errors

### Problem
Getting `404 Not Found` errors when calling API endpoints in production.

### Root Cause
Frontend is using localhost URLs instead of production URLs.

### Solution

#### 1. Configure Environment Variables on Render

**Frontend Service** (Render Dashboard → Environment):
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_WS_BASE_URL=wss://your-backend.onrender.com/api
VITE_API_SECRET_KEY=your-secret-key-here
```

**Backend Service** (Render Dashboard → Environment):
```bash
API_SECRET_KEY=your-secret-key-here  # MUST match frontend!
CORS_ORIGINS=https://your-frontend.onrender.com
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET_KEY=your-jwt-secret
```

⚠️ **CRITICAL**: 
- Replace all `your-*` placeholders with actual values
- `API_SECRET_KEY` on backend MUST match `VITE_API_SECRET_KEY` on frontend
- Never commit real secrets to git!

#### 2. Rebuild Services

1. Push code to GitHub
2. Render will auto-deploy, OR
3. Manually deploy: Dashboard → Service → "Manual Deploy" → "Clear build cache & deploy"

#### 3. Verify

```javascript
// In browser console on deployed app
console.log(import.meta.env.VITE_API_BASE_URL);
// Should show production URL, NOT localhost!
```

## Environment Files

- `.env.production` - Production config (update with your URLs)
- `.env.development` - Local development config
- `.env` - Current environment (don't commit secrets!)

## Deployment Scripts

- `backend/build.sh` - Backend build script
- `backend/start.sh` - Backend start script

## Next Steps

1. Update `.env.production` with your actual backend URL
2. Configure environment variables on Render (see above)
3. Deploy both frontend and backend
4. Test and verify

## Security Notes

⚠️ **NEVER** commit these to git:
- Real API keys
- Database credentials  
- JWT secrets
- Production passwords

Always use environment variables for secrets!

## Need Help?

Check:
- Render Dashboard → Logs
- Browser Console (F12)
- Network Tab (for API calls)

Common issues:
- CORS errors → Set CORS_ORIGINS on backend
- 401/403 errors → Check API_SECRET_KEY matches
- 404 errors → Verify VITE_API_BASE_URL is correct
