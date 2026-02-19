# Live Call System - Quick Start Guide

## What is it?
A real-time two-way voice call system where you (operator) and a scammer can talk to each other naturally, with AI helping you extract information.

## Key Differences from Existing Features

| Feature | Voice Upload | Live Takeover Mode | **Live Call (NEW)** |
|---------|--------------|--------------------|--------------------|
| Real-time | ❌ Record → Upload → Wait | ✅ Real-time AI responses | ✅✅ **Both parties talk live** |
| Two people talking | ❌ One-way | ⚠️ AI pretends to be you | ✅ **You actually speak** |
| Scammer hears operator | ❌ No | ✅ AI voice | ✅ **Your real voice** |
| Use case | Testing | AI handles scam call | **Live scam investigation** |

## Quick Start

### 1. Start a Call (5 seconds)
```bash
# Navigate to application
http://localhost:5173/call-starter

# Fill in:
- Your Name: "Agent Smith"
- Click: "Start Call Session"
```

### 2. Join as Operator (10 seconds)
```bash
# Click "Join as Operator" button
# Allow microphone when prompted
# Wait for "Waiting for scammer..." status
```

### 3. Share Scammer Link (30 seconds)
```bash
# Copy scammer link from page
# Share via SMS/Email/Social
# Wait for "Scammer has joined" notification
```

### 4. Conduct Investigation (5-30 minutes)
```bash
# Click "🎤 Start Speaking" 
# Talk naturally with scammer
# Watch AI coaching suggestions appear in right panel
# See real-time intelligence extraction:
  - Phone numbers
  - Names
  - Addresses
  - Payment requests
  - Threat level rising
```

### 5. End and Report (5 seconds)
```bash
# Click "📵 End Call"
# Report automatically generated
# Access from Dashboard
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Live Call System                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐                        ┌─────────────────┐
│   OPERATOR      │                        │    SCAMMER      │
│   (You)         │                        │   (Target)      │
└────────┬────────┘                        └────────┬────────┘
         │                                          │
         │ ┌──────────────────────────────────┐   │
         ├─┤  WebSocket (ws://localhost:8000) ├───┤
         │ └──────────────────────────────────┘   │
         │                                          │
    ┌────▼────┐                              ┌─────▼────┐
    │ Audio   │                              │  Audio   │
    │ Stream  │◄─────────────────────────────┤  Stream  │
    │ (1s)    │                              │  (1s)    │
    └────┬────┘                              └─────┬────┘
         │                                         │
         │        ┌──────────────────┐            │
         └───────►│  CallManager     │◄───────────┘
                  │  - Routes audio  │
                  │  - Manages state │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │  AI Processing   │
                  │  ┌──────────────┐│
                  │  │ Transcribe   ││  Whisper
                  │  ├──────────────┤│
                  │  │ Intelligence ││  Entity extraction
                  │  ├──────────────┤│
                  │  │ AI Coaching  ││  LLM suggestions
                  │  └──────────────┘│
                  └──────────────────┘
                           │
                  ┌────────▼─────────┐
                  │     MongoDB      │
                  │  ┌──────────────┐│
                  │  │ Transcript   ││
                  │  │ Entities     ││
                  │  │ Threat Level ││
                  │  │ Report Data  ││
                  │  └──────────────┘│
                  └──────────────────┘
```

## Audio Flow Detail

```
OPERATOR SPEAKS:
┌─────────────────────────────────────────────────────┐
│ 1. Microphone → MediaRecorder (1s chunks)           │
│ 2. Audio → Base64 encode                            │
│ 3. WebSocket send to backend                        │
│ 4. Backend receives audio                           │
│ 5. Route to scammer's WebSocket                     │
│ 6. Scammer's browser plays audio                    │
│ 7. Background: Transcribe for record                │
└─────────────────────────────────────────────────────┘

SCAMMER SPEAKS:
┌─────────────────────────────────────────────────────┐
│ 1. Microphone → MediaRecorder (1s chunks)           │
│ 2. Audio → Base64 encode                            │
│ 3. WebSocket send to backend                        │
│ 4. Backend receives audio                           │
│ 5. Route to operator's WebSocket                    │
│ 6. Operator's browser plays audio                   │
│ 7. Background: Transcribe → Extract intelligence    │
│ 8. Background: Generate AI coaching for operator    │
│ 9. Send coaching suggestions to operator            │
└─────────────────────────────────────────────────────┘
```

## Features for Operator

### Real-time Display
- **Live Transcript**: See what scammer says as text
- **AI Coaching Panel**: Get suggestions on what to say next
- **Intelligence Extraction**: Names, phones, addresses appear automatically
- **Threat Level**: Visual meter shows risk assessment
- **Tactics Detected**: Tags like "urgency", "authority", "fear"

### AI Coaching Example
```
Scammer: "Your computer has been hacked! You need to act NOW!"

AI Coaching Panel shows:
┌────────────────────────────────────────────────┐
│ 💡 AI Coaching                                  │
├────────────────────────────────────────────────┤
│ Suggestions:                                    │
│ 1. Ask for their employee ID number            │
│ 2. Request a callback number to verify         │
│ 3. Question why this is so urgent              │
│ 4. Ask for specific computer issues            │
│                                                 │
│ Recommended Response:                           │
│ "Oh no! Can you give me your employee ID       │
│  so I can verify you're from Microsoft?"       │
│                                                 │
│ ⚠️ Warning: High pressure urgency detected     │
└────────────────────────────────────────────────┘
```

### Intelligence Panel Example
```
┌────────────────────────────────────────────────┐
│ 🎯 Extracted Info                               │
├────────────────────────────────────────────────┤
│ • phone_number: +1-800-SCAMMER                 │
│ • name: "John Smith"                           │
│ • company: "Microsoft Support"                 │
│ • payment_method: "Gift cards"                 │
│ • amount: "$500"                               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ ⚠️ Threat Level                                 │
├────────────────────────────────────────────────┤
│ ████████████████░░░░ 82%                       │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 🎭 Tactics Detected                             │
├────────────────────────────────────────────────┤
│ • Urgency    • Authority    • Fear             │
│ • Fake Legitimacy                              │
└────────────────────────────────────────────────┘
```

## Controls

### Operator Controls
- **🎤 Start Speaking**: Begin transmitting audio to scammer
- **🔴 Stop**: Mute your microphone
- **💡 Get AI Help**: Request coaching suggestions immediately
- **📵 End Call**: Terminate call and generate report

### Call States
- `Connecting...` - WebSocket establishing connection
- `Waiting for scammer...` - Share link, waiting for target
- `Call active` - Both participants connected
- `Recording (Call active)` - Your mic is transmitting
- `Call ended` - Session terminated

## Testing Locally

### Test with Two Browser Windows

**Terminal 1: Backend**
```bash
cd backend
python main.py
# Should see: "🚀 Starting Agentic Honey-Pot..."
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Should see: "http://localhost:5173"
```

**Browser Window 1: Operator**
1. Go to http://localhost:5173/call-starter
2. Fill name, click "Start Call Session"
3. Click "Join as Operator"
4. Allow microphone

**Browser Window 2: Scammer (Test)**
1. Copy the scammer link from Window 1
2. Open in incognito/private window
3. Paste URL
4. Allow microphone

**Now Talk!**
- Speak in Window 2 (scammer) → Hear in Window 1 (operator)
- Speak in Window 1 (operator) → Hear in Window 2 (scammer)
- Watch transcript and intelligence appear in Window 1

## Database Records

After call, check MongoDB:
```javascript
// MongoDB shell
use honeypot_db

// View call
db.live_calls.findOne({call_id: "call-abc123xyz"})

// Output:
{
  "_id": ObjectId("..."),
  "call_id": "call-abc123xyz",
  "operator_name": "Agent Smith",
  "status": "ended",
  "start_time": ISODate("2026-02-19T10:30:00Z"),
  "end_time": ISODate("2026-02-19T10:45:00Z"),
  "transcript": [
    {
      "speaker": "scammer",
      "text": "Hello, I'm calling from Microsoft...",
      "timestamp": "2026-02-19T10:30:05Z"
    },
    {
      "speaker": "operator",
      "text": "Oh really? What's your employee ID?",
      "timestamp": "2026-02-19T10:30:10Z"
    }
  ],
  "entities": [
    {"type": "phone_number", "value": "+1-800-123-4567"},
    {"type": "name", "value": "John Smith"}
  ],
  "threat_level": 0.82,
  "tactics": ["urgency", "authority", "fear"]
}
```

## API Testing

### Start call via API
```bash
curl -X POST http://localhost:8000/api/call/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: unsafe-secret-key-change-me" \
  -d '{
    "operator_name": "Test Operator",
    "metadata": {"type": "tech_support"}
  }'

# Response:
{
  "call_id": "call-abc123xyz",
  "operator_link": "/api/call/connect?call_id=call-abc123xyz&role=operator",
  "scammer_link": "/api/call/connect?call_id=call-abc123xyz&role=scammer",
  "status": "ready"
}
```

### End call via API
```bash
curl -X POST http://localhost:8000/api/call/end/call-abc123xyz \
  -H "x-api-key: unsafe-secret-key-change-me"
```

### Get report via API
```bash
# JSON report
curl http://localhost:8000/api/call/report/call-abc123xyz \
  -H "x-api-key: unsafe-secret-key-change-me"

# PDF report
curl http://localhost:8000/api/call/report/call-abc123xyz?format=pdf \
  -H "x-api-key: unsafe-secret-key-change-me" \
  --output report.pdf
```

## Troubleshooting

### "WebSocket connection failed"
```bash
# Check backend is running
netstat -an | findstr :8000

# Check environment variable
echo $VITE_WS_BASE_URL  # Should be ws://localhost:8000
```

### "Microphone not accessible"
- Chrome: Settings → Privacy → Microphone → Allow
- Edge: Settings → Cookies and site permissions → Microphone
- Check browser address bar for blocked icon

### "No audio heard"
- Check speaker volume (Task bar → Sound)
- Test in browser: chrome://settings/content/sound
- Verify other participant is speaking and connected

### "AI coaching not appearing"
- Only visible to operator (not scammer)
- Scammer must speak first for AI to analyze
- Click "💡 Get AI Help" manually if needed
- Check browser console for errors (F12)

## Performance Tips

- **Use Chrome/Edge**: Better WebRTC support than Firefox
- **Wired internet**: WiFi can cause latency spikes
- **Close other tabs**: Reduce browser resource usage
- **Check latency**: Should be 1-2 seconds audio delay

## Security Notes

- **Never share operator link**: Only you should access
- **Scammer link is safe**: No intelligence features exposed
- **Call IDs random**: 12-character hex (not guessable)
- **API key required**: All endpoints protected
- **Use HTTPS/WSS in production**: TLS encryption

## Next Steps

1. ✅ **Test locally**: Two browser windows
2. ✅ **Real scammer**: Share link via email/SMS
3. ✅ **Review report**: After call ends
4. ✅ **Improve tactics**: Learn from AI suggestions
5. ✅ **Scale**: Deploy to production

## Related Documentation

- [LIVE_CALL_GUIDE.md](./LIVE_CALL_GUIDE.md) - Full technical documentation
- [VOICE_WORKFLOW.md](./VOICE_WORKFLOW.md) - Voice upload system
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment

## Support

Questions? Check:
- Backend logs: Console output
- Frontend errors: Browser console (F12)
- WebSocket: Network tab → WS
- Database: MongoDB Compass

---

**🎯 Mission**: Extract maximum intelligence from scammers to shut down operations and protect victims.
