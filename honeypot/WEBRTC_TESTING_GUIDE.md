# WebRTC Live Call Testing Guide

## ✅ What Was Fixed

### 1. **VAD Filter Too Aggressive** ❌ → ✅
- **Problem**: Voice Activity Detection was removing ALL audio (100%)
- **Fix**: Reduced `min_silence_duration_ms` from 500 to 100ms, added `threshold=0.3` for more sensitive detection
- **File**: `backend/services/stt_service.py`

### 2. **Audio Playback Not Working** ❌ → ✅
- **Problem**: Same-device testing requires echo cancellation to be OFF
- **Fix**: Disabled echo cancellation and noise suppression in audio constraints
- **Fix**: Added VISIBLE audio player controls at top-right of screen
- **File**: `frontend/src/services/webrtc.js`, `frontend/src/pages/LiveCallWebRTC.jsx`

### 3. **Transcriptions Not Showing** ❌ → ✅
- **Problem**: Transcriptions were only sent to operator, not to both users
- **Fix**: Changed `sio.emit('transcription', ..., room=room.operator_sid)` to `room=room.room_id` (sends to whole room)
- **Fix**: Added extensive logging to track transcription flow
- **File**: `backend/api/webrtc_signaling.py`, `frontend/src/hooks/useWebRTC.js`

### 4. **No AI Coaching** ❌ → ✅
- **Problem**: AI coaching only triggers when scammer speaks AND transcription is successful
- **Fix**: Now transcriptions are more reliable (VAD fix), so AI coaching should work
- **Note**: AI coaching appears in operator view only

---

## 🧪 How to Test (Same Device)

### Step 1: Start Backend
```bash
cd honeypot/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Start Frontend
```bash
cd honeypot/frontend
npm run dev
```

### Step 3: Open Two Chrome Windows
1. **Window 1 (Operator)**: Go to call starter, create room, click "Join as Operator"
2. **Window 2 (Scammer)**: Copy scammer link, open in new window

### Step 4: Grant Microphone Permissions
- Both windows will ask for microphone access
- Click "Allow" on both

### Step 5: Test Audio
- **Look for audio player controls at TOP-RIGHT of each window**
- Make sure the audio player is NOT muted
- Speak into your microphone in Window 1
- You should hear your voice in Window 2 (slight delay is normal)

### Step 6: Check Transcriptions
- Speak clearly for 3-4 seconds
- Wait 2-3 seconds for processing
- Transcriptions should appear in the "Transcript" panel

---

## 🔍 Debugging Checklist

### Backend Console Should Show:
```
✅ Room call-xxxx has both peers - ready for WebRTC
✅ Forwarding WebRTC offer
✅ Forwarding WebRTC answer
✅ Processing audio with duration 00:02.340
✅ Detected language 'en'
✅ Transcription from scammer: Hello this is a test...
✅ Sent transcription to room call-xxxx
```

### Browser Console Should Show:
```
✅ Socket.IO connected
✅ Joined room
✅ Peer connection created
✅ Local audio stream started (echo cancellation OFF for testing)
✅ Added track to peer connection: audio enabled: true
✅ ICE connection state: connected
✅ Remote audio playing successfully
✅ Transcription received in hook: {speaker: "scammer", text: "Hello"}
```

### If You DON'T See "Remote audio playing successfully":
1. Check if audio element appeared at top-right corner
2. Click the audio player's play button manually
3. Make sure volume is turned up
4. Check browser's audio settings (not muted globally)

### If You DON'T See Transcriptions:
1. Check backend logs - is Whisper processing audio?
2. Check if "VAD filter removed" shows 100% removal → Audio too quiet
3. Speak LOUDER and CLEARER
4. Wait 3-5 seconds between speaking and checking
5. Check browser console for "Transcription received" logs

### If Audio Quality is Poor:
- This is EXPECTED on same device (acoustic echo)
- For production, use:
  - Different devices
  - Headphones
  - TURN server for NAT traversal

---

## 🎯 Expected Behavior

### ✅ Operator Window:
- See ALL transcripts (operator + scammer)
- See AI coaching when scammer speaks
- See intelligence panel (entities, threat level, tactics)
- Hear scammer's voice via audio player

### ✅ Scammer Window:
- See ALL transcripts (operator + scammer)
- See simple "Call Status" panel
- Hear operator's voice via audio player
- NO AI coaching or intelligence (security)

---

## 🚨 Common Issues

### Issue: "No audio after 10 seconds"
- **Cause**: ICE connection failed (firewall/NAT)
- **Solution**: Check ICE connection logs, use TURN server

### Issue: "Transcriptions delayed by 5+ seconds"
- **Cause**: Whisper is slow on CPU
- **Solution**: Normal for CPU-based inference. Use GPU or smaller model (`tiny`)

### Issue: "Hearing echo/feedback"
- **Cause**: Same device testing without headphones
- **Solution**: Use headphones OR ignore (expected behavior)

### Issue: "VAD removing all audio"
- **Cause**: Background noise too high or voice too quiet
- **Solution**: Speak louder, reduce background noise, or disable VAD in `stt_service.py`:
  ```python
  vad_filter=False  # Disable VAD completely
  ```

---

## 📊 Performance Tips

### For Faster Transcription:
1. Use smaller Whisper model:
   ```python
   # In backend/services/stt_service.py
   self.model_size = 'tiny'  # Instead of 'base' or 'small'
   ```

2. Reduce beam size:
   ```python
   beam_size=1  # Already set in code
   ```

3. Use GPU (if available):
   ```python
   self.device = "cuda"
   self.compute_type = "float16"
   ```

### For Better Audio Quality:
1. Use headphones (eliminates echo)
2. Test on different devices
3. Enable echo cancellation in production:
   ```javascript
   // In frontend/src/services/webrtc.js
   echoCancellation: true,
   noiseSuppression: true,
   ```

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Both users can hear each other
- ✅ Transcripts appear within 3-5 seconds
- ✅ Operator sees AI coaching suggestions
- ✅ Intelligence panel shows extracted entities
- ✅ No console errors

---

## 🆘 Still Not Working?

1. **Check all console logs** (backend + both browser windows)
2. **Look for specific error messages** in this guide
3. **Try the WebRTC Test page**: `/webrtc-test` (if added to routes)
4. **Restart backend** after making changes
5. **Clear browser cache** and reload

---

## 📝 Technical Details

### Audio Flow:
1. User speaks → Microphone captures
2. MediaRecorder creates chunks (every 2.5s)
3. Chunks sent to backend via Socket.IO
4. Backend normalizes to WAV → Whisper transcribes
5. Backend emits transcription back to room
6. Frontend receives and displays

### WebRTC P2P Flow:
1. Operator joins → creates peer connection
2. Scammer joins → both exchange SDP offers/answers
3. ICE candidates exchanged for NAT traversal
4. Direct P2P audio stream established
5. Audio flows without going through backend

Both flows run **in parallel** - WebRTC for real-time audio, Socket.IO for transcription.
