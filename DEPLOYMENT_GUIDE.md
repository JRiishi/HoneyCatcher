# Deploying HoneyBadger: GUVI Hackathon Edition

Follow these steps to deploy your API so it's ready for the evaluation platform.

## 1. Environment Configuration

Ensure your `.env` file in `honeypot/backend/` has the following production-ready values:

```env
MONGODB_URI=your_mongodb_cluster_uri
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
API_SECRET_KEY=YOUR_SECRET_API_KEY_FOR_GUVI
GUVI_CALLBACK_URL=https://hackathon.guvi.in/api/updateHoneyPotFinalResult
```

## 2. Option A: Deployment via Render (Recommended/Free)

1.  **Push to GitHub**: (We already did this in the previous step).
2.  **Create New Web Service**: Log in to [Render](https://render.com) and connect your GitHub repo.
3.  **Root Directory**: `honeypot/backend`
4.  **Runtime**: `Python 3`
5.  **Build Command**: `pip install -r requirements.txt`
6.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
7.  **Environment Variables**: Add all keys from your `.env` file in the Render "Environment" tab.

## 3. Option B: Deployment via Railway (Fastest)

1.  Install the Railway CLI or connect via GitHub.
2.  Select your repo.
3.  Railway automatically detects the `requirements.txt` and starts the FastAPI server.
4.  Ensure the port is set to `8000` or `10000` in the service settings.

## 4. Option C: Frontend Deployment via Render (Static Site)

1.  **Create New Static Site**: Connect your GitHub repo.
2.  **Root Directory**: `honeypot/frontend`
3.  **Build Command**: `npm install && npm run build`
4.  **Publish Directory**: `dist`
5.  **Environment Variables**: Add these in the "Environment" tab:
    *   `VITE_API_BASE_URL`: `https://honeycatcher.onrender.com/api`
    *   `VITE_API_SECRET_KEY`: `YOUR_SECRET_API_KEY` (Must match backend)

## 5. Testing Your Deployment

Once deployed, you will get two URLs:
- **Backend**: `https://honeycatcher.onrender.com`
- **Frontend**: `https://honey-catcher-frontend.onrender.com`

### Test Request (Start of Conversation)
Use Postman or Curl to send this precisely to your **Backend**:

**URL**: `https://honeycatcher.onrender.com/api/message`  
**Headers**:
- `x-api-key`: `YOUR_SECRET_API_KEY`
- `Content-Type`: `application/json`

**Body (JSON)**:
```json
{
  "sessionId": "eval-session-001",
  "message": {
    "sender": "scammer",
    "text": "Your bank account will be blocked today. Verify immediately.",
    "timestamp": 1770005528731
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "SMS",
    "language": "English",
    "locale": "IN"
  }
}
```

### Expected Response (Strict)
```json
{
  "status": "success",
  "reply": "Wait, what? Why would my account be blocked? I haven't done anything wrong."
}
```

## 6. Evaluation Workflow
- The platform will send requests to your `/api/message` endpoint.
- Your system will automatically engage and extract intel.
- **IMPORTANT**: My code will automatically trigger the `POST` to GUVI's evaluation endpoint once 5 messages have been exchanged. You can monitor this in your server logs.

---
**Status**: DEPLOYMENT READY 🚀
**Backend**: `https://honeycatcher.onrender.com`
**Format**: 100% GUVI Compliant
