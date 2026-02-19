# Live Calling - Complete Fix Guide

## 🎯 What Was Fixed

The live call functionality had **multiple critical issues**:

### ❌ **Issues Found:**

1. **Wrong API Endpoints**
   - Frontend: `/api/live-call/session` ❌
   - Backend: `/call/start` ✅
   - Frontend: `/api/live-call/ws/{id}` ❌
   - Backend: `/api/call/connect?call_id={id}&role={role}` ✅

2. **Missing Message Handlers**
   - ❌ No handler for `transcription` messages (backend sends this)
   - ❌ No handler for `audio_stream` messages (incoming audio)
   - ❌ No handler for `ai_coaching` messages (AI suggestions)
   - ❌ Used wrong message types (`transcript` vs `transcription`)

3. **No Audio Playback**
   - ❌ Incoming audio from scammer wasn't decoded or played
   - ❌ Missing audio queue system for playback ordering

4. **Missing State Management**
   - ❌ No threat level tracking
   - ❌ No participant connection tracking
   - ❌ No transcription history display

## ✅ **Fixes Applied**

### 1. **Fixed API Endpoints** (`MobileOptimizedLiveCall.jsx` lines 32-49)
```javascript
// BEFORE: POST /api/live-call/session ❌
// AFTER: POST /call/start ✅

// BEFORE: WebSocket /api/live-call/ws/{session_id} ❌  
// AFTER: WebSocket /api/call/connect?call_id={call_id}&role=operator ✅
```

### 2. **Complete Message Handler** (lines 130-176)
Now properly handles:
- ✅ `connected` - Initial connection confirmation
- ✅ `participant_joined` - Scammer joins call
- ✅ `audio_stream` - Incoming audio from other party
- ✅ `transcription` - Speech to text (CORRECT type!)
- ✅ `ai_coaching` - AI suggestions for operator
- ✅ `intelligence_update` - Threat level updates

### 3. **Audio Playback System** (lines 178-217)
- ✅ Queue system for incoming audio chunks
- ✅ Proper base64 → Blob conversion
- ✅ Sequential playback without overlapping
- ✅ Error handling and recovery

### 4. **Enhanced UI** 
- ✅ Transcript history display (last 5 messages)
- ✅ Threat level indicator in operator panel
- ✅ AI suggestions with visual feedback
- ✅ Color-coded messages (scammer/operator/AI/system)

## 🧪 **How to Test**

### **Step 1: Verify Backend is Running**
```powershell
# Check if backend is on port 8000
netstat -ano | findstr :8000
# Should show: LISTENING on 127.0.0.1:8000
```

### **Step 2: Frontend Server Ready**
- ✅ Frontend running at `http://localhost:5173`
- ✅ dist/ folder generated (npm run build completed)
- ✅ Backend at `http://localhost:8000`

### **Step 3: Test Live Call End-to-End**

**Option A: Two Browser Tabs (Desktop Simulation)**

1. **Tab 1 - Operator Console:**
   - Go to: `http://localhost:5173/playground`
   - Click: "Live Call Desktop" button
   - Click: Green "Start Call" button
   - Status should show: "Connected" → "Waiting for scammer..."
   - Copy the call_id from URL or log

2. **Tab 2 - Scammer Simulator:**
   - Go to: `http://localhost:5173/voice-playground`
   - Paste the call_id in "Call ID" field
   - Select: "scammer" role
   - Click: "Call" button
   - Status should show: "In call"

3. **Verify Connection:**
   - Tab 1 should update to: "Call active"
   - Both should have recording buttons enabled
   - Both should have "Connected" status

### **Step 4: Test Audio & Transcription**

1. **Scammer Speaks:**
   - Click "Start Recording" on Tab 2
   - Say something: "Hello, I'm calling about your computer"
   - Click "Stop Recording" on Tab 2

2. **Verify on Operator Console (Tab 1):**
   - ✅ You should see transcription appear in the transcript area
   - ✅ Threat level indicator should appear in operator panel (if enabled)
   - ✅ AI suggestions might appear below transcription
   - ✅ You should hear the audio playing (if speakers enabled)

3. **Operator Responds:**
   - Click "Start Recording" on Tab 1
   - Say something: "What's the problem with my computer?"
   - Stop recording on Tab 1

4. **Verify on Scammer Side (Tab 2):**
   - ✅ Audio plays (sound from operator)
   - ✅ Chat transcript shows operator's speech (if implemented)

### **Step 5: Check Browser Console**

Open DevTools (F12) → Console tab. You should see:
```
✅ WebSocket connected
🟢 Operator connected to call: call-abc123
📱 Scammer connected to call: call-abc123
Audio chunk sent: webm format
Transcription received: "hello i'm calling..."
```

❌ **If you see errors like:**
- `TypeError: wsRef.current.send is not a function`
- `Cannot read property 'text' of undefined`
- `WebSocket connection failed`

### **Step 6: Mobile Testing (Optional)**

1. **PWA Installation:**
   - Open DevTools → Application tab
   - Click "Install" button (if visible)
   - Home screen should have app icon

2. **Mobile UI Testing:**
   - Rotate to portrait mode
   - Buttons should be touch-friendly (48px)
   - Try "Live Call Mobile" from Playground
   - Same call flow should work

## 📊 **Expected Backend Responses**

### `POST /call/start` response:
```json
{
  "call_id": "call-abcd1234efgh",
  "operator_link": "/api/call/connect?call_id=call-abcd1234efgh&role=operator",
  "scammer_link": "/api/call/connect?call_id=call-abcd1234efgh&role=scammer",
  "status": "ready"
}
```

### WebSocket messages from backend:

**Connection established:**
```json
{"type": "connected", "role": "operator", "waiting_for_scammer": true}
```

**Scammer joins:**
```json
{"type": "participant_joined", "role": "scammer"}
```

**Transcription received:**
```json
{
  "type": "transcription",
  "speaker": "scammer",
  "text": "hello i'm calling about your computer",
  "language": "en",
  "confidence": 0.95,
  "timestamp": "2026-02-19T10:30:00.000Z"
}
```

**AI coaching suggestion:**
```json
{
  "type": "ai_coaching",
  "suggestions": ["Ask for more details", "Confirm their phone number"],
  "recommended_response": "Can you tell me more about the issue?",
  "warning": "High threat level detected"
}
```

**Audio stream from other party:**
```json
{
  "type": "audio_stream",
  "audio": "//NExAAh...(base64)",
  "format": "webm",
  "source": "scammer"
}
```

## 🔧 **If Something Still Doesn't Work**

### **Check 1: Verify Backend Routes**
```bash
cd honeypot/backend
python -c "from api.live_call import router; print([r.path for r in router.routes])"
```
Should include: `/call/start`, `/call/connect` (websocket), `/call/end/{call_id}`

### **Check 2: Test Backend Call Creation**
```bash
curl -X POST http://localhost:8000/api/call/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: unsafe-secret-key-change-me" \
  -d '{"operator_name": "test"}'
```
Should return: `{"call_id": "...", "operator_link": "...", ...}`

### **Check 3: WebSocket Connection**
Use browser console:
```javascript
const ws = new WebSocket('ws://localhost:8000/api/call/connect?call_id=test&role=operator');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### **Check 4: Audio Format**
When sending audio from frontend:
```javascript
wsRef.current.send(JSON.stringify({
  type: 'audio_chunk',
  audio: base64String,  // ← Must be base64 encoded
  format: 'webm'        // ← Must be 'webm' or 'wav'
}));
```

## 📝 **Key Code Changes Summary**

| Component | Changes | Status |
|-----------|---------|--------|
| `MobileOptimizedLiveCall.jsx` | Endpoints fixed, message handlers added, audio playback implemented | ✅ Complete |
| `LiveCall.jsx` | No changes needed (already correct) | ✅ Working |
| Backend | No changes (already correct) | ✅ Working |
| Frontend build | Rebuilt and verified | ✅ Success |

## 🚀 **Next Steps**

1. ✅ Verify tests pass above
2. ✅ Check browser console for any errors
3. ✅ Test on actual mobile device if possible
4. ✅ Monitor backend logs for transcription errors
5. Deploy to production with proper HTTPS

---

**Build Status**: ✅ All 1932 modules transformed successfully
**Deployed**: `http://localhost:5173` (frontend) + `http://localhost:8000` (backend)
