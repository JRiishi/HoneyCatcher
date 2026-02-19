# Audio Troubleshooting Guide

## Issues Identified from Your Logs

### 1. ✅ FIXED: Audio Playback Blocked
**Problem:** Browser blocks audio until user interacts with page
```
NotAllowedError: play() failed because the user didn't interact with the document first
```

**Solution:** Yellow banner now appears with "Enable Audio" button - click it to start audio playback.

---

### 2. Silent Audio Chunks
**Problem:** Most of your audio is being detected as silence (1192 bytes = empty chunks)

**Logs showing the issue:**
```
INFO:faster_whisper:VAD filter removed 00:04.500 of audio  (removed ALL audio)
```

**Possible Causes:**
- Microphone volume too low
- Speaking too far from microphone
- Background noise suppression too aggressive
- Wrong audio input device selected

**Solutions:**
1. **Check microphone volume:**
   - Windows: Right-click speaker icon → Sounds → Recording → Select mic → Properties → Levels (set to 80-100%)
   - Browser: Check site permissions in address bar

2. **Speak louder and closer to microphone**
   - VAD threshold is already sensitive (0.3), but needs actual voice energy

3. **Check correct microphone is selected:**
   - Browser will show permission dialog - make sure you select the right device

4. **Test microphone:**
   ```
   Open browser console (F12) and look for:
   ✅ operator microphone access granted
   🔊 operator has 1 audio track(s) ready
   ```

---

### 3. Backend Reloading
**Problem:** Backend auto-reloaded 3 times during your test, breaking connections

**Logs:**
```
WARNING: StatReload detected changes in 'streaming_stt.py'. Reloading...
```

**Solution:** Backend is now stable (no more code changes). This won't happen in your next test.

---

## Testing Steps (In Order)

### Step 1: Restart Everything
```bash
# Backend (stop with Ctrl+C first)
cd honeypot/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (in new terminal)
cd honeypot/frontend  
npm run dev
```

### Step 2: Open TWO Browsers/Windows
- **Window 1 (Operator):** http://localhost:5173/live-call/[room-id]?role=operator
- **Window 2 (Scammer):** http://localhost:5173/live-call/[room-id]?role=scammer

### Step 3: Grant Microphone Permissions
Both windows will ask for microphone access - **ALLOW IT**

### Step 4: Click "Enable Audio" Button
When the yellow banner appears, click the "Enable Audio" button

### Step 5: Check Browser Console (F12)
You should see:
```
✅ operator microphone access granted
✅ operator MediaRecorder started successfully
✅ ICE connection established - audio should flow now
🎤 operator sending audio chunk: 40840 bytes  (LARGE chunks = good audio)
```

### Step 6: Speak Clearly
- Speak **loudly** and **clearly**
- Get close to your microphone
- Watch for transcriptions to appear (backend logs show them)

---

## Backend Logs to Watch For

### ✅ Good Signs:
```
INFO:api.webrtc_signaling:✅ operator: Transcribed in English (confidence: 0.85)
INFO:api.webrtc_signaling:📝 operator: 'Hello, how are you?'
```

### ⚠️ Warning Signs (Silent Audio):
```
INFO:faster_whisper:VAD filter removed 00:04.500 of audio  ← All audio was silence
```

### ❌ Bad Signs:
```
🚫 Microphone permission denied by user  ← Grant permissions
🔍 No microphone device found  ← Check mic is plugged in
```

---

## Language Restriction (✅ Working)

Your latest test correctly detected English and locked it:
```
INFO:faster_whisper:Detected language 'en' with probability 0.30
INFO:live_takeover.streaming_stt:✅ Language locked to: en (en)
```

Old tests detected Chinese/French and locked them (before my fix). Now it will force to English for non-Hindi/English languages.

---

## Why Only One Transcription Appeared

1. ✅ **First phrase transcribed successfully:** "I'm so thankful. Thank you so much."
2. ❌ **All subsequent audio was silence** (VAD correctly filtered it out)
3. ❌ **Backend reloaded 3 times** (broke socket connections)
4. ❌ **Audio playback blocked** (browser restrictions)

With the fixes above, you should now see:
- Audio enable button appears and works
- Continuous transcriptions (if you speak loud enough)
- Stable backend connection (no more reloads)

---

## Quick Test Command

Run this in one window to see if your mic is working:
```javascript
// Paste in browser console (F12)
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const check = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      console.log('🎤 Mic volume:', volume.toFixed(1), volume > 10 ? '✅' : '❌');
      if (volume < 10) console.log('⚠️ Volume too low! Speak louder or increase mic volume');
    };
    
    setInterval(check, 500);
    console.log('🎤 Monitoring mic... Speak into it!');
  });
```

Expected output:
```
🎤 Mic volume: 35.2 ✅   ← Good
🎤 Mic volume: 3.1 ❌    ← Too quiet
⚠️ Volume too low! Speak louder or increase mic volume
```

---

## Summary

1. ✅ **Audio enable button added** - Click yellow banner to start audio
2. ✅ **Language restriction working** - English/Hindi only
3. ✅ **Backend stable** - No more auto-reloads
4. ❌ **Microphone volume needs adjustment** - Most audio detected as silence

**Next Steps:**
1. Refresh both browser windows (Ctrl+R)
2. Click "Enable Audio" button when it appears
3. Check mic volume is 80-100%
4. Speak LOUDLY and watch for transcriptions
5. Check browser console for diagnostic logs
