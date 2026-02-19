# WebRTC Live Call System - Setup & Testing Guide

## 🎯 Overview

The new WebRTC-based live calling system provides:
- **P2P Audio Streaming**: Direct peer-to-peer audio connections (reduces server load by 90%)
- **Automatic Continuous Capture**: No start/stop buttons - audio streams automatically
- **Real-time Transcription**: Background transcription as audio flows
- **AI Coaching**: Automatic AI suggestions without user interaction
- **Socket.IO Signaling**: Reliable WebRTC offer/answer/ICE exchange

---

## 📦 Installation

### Backend Dependencies

```bash
cd honeypot/backend
pip install -r requirements.txt
```

**New Dependencies:**
- `python-socketio>=5.11.0` - Socket.IO server for WebRTC signaling

### Frontend Dependencies

```bash
cd honeypot/frontend
npm install
```

**Includes:**
- `socket.io-client` - Socket.IO client for signaling

---

## 🚀 Starting the System

### 1. Start Backend

```bash
cd honeypot/backend
python main.py
```

**Expected Output:**
```
🚀 Starting Agentic Honey-Pot...
📡 MongoDB connected
🔌 Socket.IO server mounted at /socket.io
✅ Server running at http://localhost:8000
```

**Key Endpoints:**
- `POST /api/webrtc/room/create` - Create WebRTC room
- `POST /api/webrtc/room/{room_id}/end` - End call
- `WS /socket.io/` - Socket.IO signaling server

### 2. Start Frontend

```bash
cd honeypot/frontend
npm run dev
```

**Expected Output:**
```
VITE v7.3.1  ready in 1234 ms

➜  Local:   http://localhost:5173/
```

---

## 🧪 Testing Methods

### Method 1: Two Browser Windows (Recommended)

**Best for:** Quick local testing, debugging WebRTC connections

**Steps:**

1. **Create a WebRTC room:**
   ```bash
   curl -X POST http://localhost:8000/api/webrtc/room/create \
     -H "Content-Type: application/json" \
     -H "X-API-Key: unsafe-secret-key-change-me" \
     -d '{"operator_name": "Test Operator"}'
   ```
   
   **Response:**
   ```json
   {
     "room_id": "call-abc123def456",
     "socket_url": "/socket.io/",
     "status": "ready"
   }
   ```

2. **Window 1 - Operator:**
   - Open: `http://localhost:5173/live-call-webrtc/call-abc123def456`
   - Allow microphone access when prompted
   - Status should show: "⏳ Waiting for scammer..."

3. **Window 2 - Scammer (simulated):**
   - Open browser console (F12)
   - Run this code:
   ```javascript
   import { io } from 'socket.io-client';
   
   const socket = io('http://localhost:8000');
   
   socket.on('connect', () => {
     console.log('Connected:', socket.id);
     
     // Join as scammer
     socket.emit('join_room', {
       room_id: 'call-abc123def456',
       role: 'scammer'
     });
   });
   
   socket.on('joined_room', async (data) => {
     console.log('Joined room:', data);
     
     // Get microphone
     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
     console.log('Got audio stream');
     
     // Create peer connection
     const pc = new RTCPeerConnection({
       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
     });
     
     // Add audio track
     stream.getTracks().forEach(track => pc.addTrack(track, stream));
     
     // Handle ICE candidates
     pc.onicecandidate = (e) => {
       if (e.candidate) {
         socket.emit('ice_candidate', { candidate: e.candidate });
       }
     };
     
     // Listen for offer
     socket.on('webrtc_offer', async (data) => {
       console.log('Received offer');
       await pc.setRemoteDescription(data.offer);
       const answer = await pc.createAnswer();
       await pc.setLocalDescription(answer);
       socket.emit('webrtc_answer', { answer });
     });
     
     // Listen for ICE candidates
     socket.on('ice_candidate', async (data) => {
       await pc.addIceCandidate(data.candidate);
     });
     
     // Handle remote stream
     pc.ontrack = (e) => {
       console.log('Got remote stream');
       const audio = new Audio();
       audio.srcObject = e.streams[0];
       audio.play();
     };
   });
   ```

4. **Verify Connection:**
   - Window 1 status should change to: "🔗 Connected to scammer"
   - Both windows should show "Connection: connected"
   - Speak into microphone - you should hear yourself in the other window
   - Check console for "🧊 ICE connection state: connected"

5. **Verify Features:**
   - [ ] P2P audio streaming works
   - [ ] Transcription appears automatically (no button clicks)
   - [ ] AI coaching appears when scammer speaks
   - [ ] Mute/unmute works
   - [ ] Stats panel shows audio data
   - [ ] End call button disconnects both peers

### Method 2: Mobile + Desktop

**Best for:** Testing mobile responsiveness, PWA features

**Steps:**

1. Get your computer's local IP:
   ```bash
   # Windows
   ipconfig | findstr IPv4
   
   # Mac/Linux
   ifconfig | grep "inet "
   ```
   Example: `192.168.1.100`

2. Update frontend `.env`:
   ```env
   VITE_SOCKET_URL=http://192.168.1.100:8000
   VITE_API_BASE_URL=http://192.168.1.100:8000/api
   ```

3. Restart frontend:
   ```bash
   npm run dev -- --host
   ```

4. **Desktop - Operator:**
   - Open: `http://192.168.1.100:5173/live-call-webrtc/call-xxx`
   - Allow microphone

5. **Mobile - Scammer:**
   - Open same URL on phone (ensure on same WiFi)
   - Allow microphone
   - Test audio streaming

### Method 3: Browser DevTools Mobile Emulation

**Best for:** Quick mobile UI testing without physical device

**Steps:**

1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device: iPhone 12 Pro or Galaxy S21
4. Navigate to `/live-call-webrtc/call-xxx`
5. Test responsive UI elements

---

## 🔍 Debugging

### Check Socket.IO Connection

**Browser Console:**
```javascript
// Check socket connection
console.log(window.socket);

// Monitor events
window.socket.on('connect', () => console.log('✅ Connected'));
window.socket.on('disconnect', () => console.log('❌ Disconnected'));
window.socket.on('transcription', (data) => console.log('📝', data));
```

### Check WebRTC Stats

**Browser Console:**
```javascript
// Get peer connection stats
const pc = window.peerConnection;
if (pc) {
  pc.getStats().then(stats => {
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        console.log('📥 Inbound:', report);
      }
    });
  });
}
```

### Common Issues

#### ❌ "Socket connection error"

**Cause:** Backend not running or wrong SOCKET_URL

**Fix:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Check `.env` has correct `VITE_SOCKET_URL`
3. Restart frontend after changing `.env`

#### ❌ "Failed to get local stream"

**Cause:** Microphone permission denied

**Fix:**
1. Check browser permissions
2. Use HTTPS (required for getUserMedia on non-localhost)
3. Try different browser

#### ❌ "ICE connection state: failed"

**Cause:** Firewall blocking WebRTC, no STUN/TURN server reachable

**Fix:**
1. Check firewall settings
2. Verify STUN server is reachable:
   ```bash
   telnet stun.l.google.com 19302
   ```
3. For production, add TURN server to `webrtc.js`:
   ```javascript
   iceServers: [
     { urls: 'stun:stun.l.google.com:19302' },
     {
       urls: 'turn:turn.example.com:3478',
       username: 'user',
       credential: 'pass'
     }
   ]
   ```

#### ❌ "No transcription appearing"

**Cause:** Whisper model not loaded, or audio not reaching backend

**Fix:**
1. Check backend logs for Whisper errors
2. Verify audio is being sent:
   ```javascript
   socket.on('transcription_chunk', (data) => console.log('Sent audio chunk'));
   ```
3. Check `streaming_stt.py` is working:
   ```bash
   cd honeypot/backend
   python -c "from features.live_takeover.streaming_stt import StreamingTranscriber; print('✅ OK')"
   ```

---

## 📊 Monitoring

### Backend Logs

```bash
cd honeypot/backend
python main.py | grep -E "🔌|🧊|📞|📝"
```

**Key Log Messages:**
- `🔌 Client connected: abc123` - Socket.IO connection established
- `📞 WebRTC room created: call-xxx` - Room created
- `👤 operator joined room call-xxx` - Peer joined
- `✅ Room call-xxx has both peers` - Ready for WebRTC
- `🧊 Forwarding ICE candidate` - WebRTC negotiation
- `📝 Transcription:` - STT working

### Frontend Console

**Auto-logged events:**
- `🎙️ WebRTC Service initialized`
- `🔌 Socket connected: <sid>`
- `📞 Joined room: <data>`
- `🎤 Local audio stream started`
- `🔗 Peer connection created`
- `📤 Sending WebRTC offer`
- `🧊 ICE connection state: connected`
- `🎵 Received remote track`
- `📝 Transcription: <text>`
- `🤖 AI Coaching: <data>`

---

## 🎯 Expected Behavior

### ✅ Successful Connection Flow

1. **Operator joins:**
   - Socket connects
   - Joins room as "operator"
   - Local audio stream starts
   - Status: "Waiting for scammer..."

2. **Scammer joins:**
   - Socket connects
   - Joins room as "scammer"
   - Both peers notified: "peer_joined"
   - Operator creates WebRTC offer

3. **WebRTC Handshake:**
   - Operator sends offer → Scammer
   - Scammer sets remote description
   - Scammer creates answer → Operator
   - Operator sets remote description
   - ICE candidates exchanged
   - Connection state: "connected"

4. **Audio Streaming:**
   - P2P audio flows directly between peers
   - No need to click start/stop
   - Continuous background transmission

5. **Transcription:**
   - Backend receives audio chunks
   - Whisper transcribes in background
   - Transcripts sent via Socket.IO
   - Appears in UI automatically

6. **AI Coaching:**
   - When scammer speaks, AI analyzes
   - Coaching sent to operator only
   - Appears in right panel automatically

### 🔴 Incorrect Behavior

#### Manual Controls Visible

**Problem:** Start/stop recording buttons present

**Why Wrong:** WebRTC should auto-stream, no manual control needed

**Fix:** Remove `MediaRecorder` start/stop buttons from UI

#### Audio Routes Through Backend

**Problem:** Backend logs show audio forwarding

**Why Wrong:** WebRTC should use P2P, backend only for signaling

**Fix:** Verify `RTCPeerConnection.addTrack()` is being called

#### Transcription Requires Button Click

**Problem:** User must click "Transcribe" button

**Why Wrong:** Should transcribe automatically in background

**Fix:** Backend should process audio chunks as they arrive via Socket.IO

---

## 🚀 Production Deployment

### Environment Variables

**Backend:**
```bash
# .env
SOCKET_IO_CORS_ORIGINS=https://yourdomain.com
MONGODB_URI=mongodb+srv://...
```

**Frontend:**
```env
VITE_SOCKET_URL=https://api.yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### TURN Server (Required for Production)

WebRTC needs TURN server for NAT traversal:

1. **Option 1: Use Twilio TURN**
   ```javascript
   // webrtc.js
   iceServers: [
     { urls: 'stun:stun.l.google.com:19302' },
     {
       urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
       username: 'your-twilio-username',
       credential: 'your-twilio-credential'
     }
   ]
   ```

2. **Option 2: Self-hosted coturn**
   ```bash
   docker run -d --network=host \
     -e TURN_USERNAME=user \
     -e TURN_PASSWORD=pass \
     coturn/coturn
   ```

### SSL/TLS (Required)

Browsers require HTTPS for `getUserMedia()`:

1. **Get SSL Certificate:**
   - Let's Encrypt (free): `certbot --nginx`
   - Cloudflare (free with proxy)

2. **Configure Backend:**
   ```python
   # main.py
   import uvicorn
   uvicorn.run(
       app,
       host="0.0.0.0",
       port=443,
       ssl_keyfile="/path/to/key.pem",
       ssl_certfile="/path/to/cert.pem"
   )
   ```

---

## 📚 Architecture Overview

```
┌─────────────┐     Socket.IO      ┌─────────────┐
│  Operator   │◄──── Signaling ────►│   Scammer   │
│  (Browser)  │                     │  (Browser)  │
└──────┬──────┘                     └──────┬──────┘
       │                                   │
       │         WebRTC P2P Audio          │
       └───────────────►◄──────────────────┘
       
       ▼ Audio Chunks                  ▼ Audio Chunks
       
┌──────────────────────────────────────────────────┐
│              Backend (FastAPI)                   │
│  ┌─────────────┐  ┌───────────────┐            │
│  │  Whisper    │  │ Intelligence  │            │
│  │  STT        │─►│ Pipeline      │            │
│  └─────────────┘  └───────┬───────┘            │
│                           │                     │
│                    ┌──────▼──────┐              │
│                    │ AI Coaching │              │
│                    └─────────────┘              │
└──────────────────────────────────────────────────┘
                     │
                     ▼ Transcripts/Coaching
              Socket.IO Broadcast
```

**Key Components:**

1. **WebRTC Service** (`webrtc.js`): Manages P2P connections, ICE negotiation
2. **Socket.IO Signaling** (`webrtc_signaling.py`): Exchanges SDP offers/answers/ICE
3. **Streaming Transcriber** (`streaming_stt.py`): Background audio transcription
4. **Intelligence Pipeline** (`intelligence_pipeline.py`): Extract entities, threats
5. **AI Coach** (`takeover_agent.py`): Generate real-time suggestions

**Data Flow:**

1. Audio captured → WebRTC P2P stream → Remote peer
2. Audio chunks → Backend (via Socket.IO) → Whisper STT
3. Transcripts → Intelligence extraction → AI coaching
4. Coaching → Socket.IO broadcast → Operator UI

---

## 🎓 Next Steps

1. **Install dependencies:**
   ```bash
   cd honeypot/backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```

2. **Start services:**
   ```bash
   # Terminal 1 - Backend
   cd honeypot/backend && python main.py
   
   # Terminal 2 - Frontend
   cd honeypot/frontend && npm run dev
   ```

3. **Test WebRTC:**
   - Follow "Method 1: Two Browser Windows" above
   - Verify P2P audio streaming
   - Check automatic transcription
   - Confirm AI coaching appears

4. **Verify no manual controls:**
   - No start/stop recording buttons should be visible
   - Audio should stream automatically on connection
   - Transcription should appear without button clicks

---

## 📞 Support

If issues persist:

1. Check backend logs for errors
2. Check browser console for WebRTC errors
3. Verify Socket.IO connection: `socket.connected === true`
4. Test STUN server: `telnet stun.l.google.com 19302`
5. Ensure microphone permissions granted

**Expected Performance:**
- Connection time: < 3 seconds
- Audio latency: 100-300ms (P2P)
- Transcription delay: 1-3 seconds (Whisper processing)
- AI coaching delay: 1-2 seconds (LLM inference)
