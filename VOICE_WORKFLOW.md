# Voice Call Workflow Documentation

## Overview
The voice workflow handles complete audio conversations between scammers and the AI agent. It processes incoming voice, generates responses, and synthesizes output audio in real-time.

---

## Complete Voice Call Flow

### 1. **Frontend Audio Capture** (VoiceRecorder.jsx)
```
User speaks into microphone
  ↓
Browser captures audio via MediaRecorder API (WebM format)
  ↓
POST /api/voice/upload with audio blob + sessionId
```

**Data sent:**
- `audio`: WebM audio file
- `sessionId`: Conversation session ID
- `mode`: "ai_speaks" | "ai_suggests" (determines if audio is synthesized)
- `x-api-key`: API authentication header

---

## 2. **Voice Upload Endpoint** (`/api/voice/upload`)
📍 **File:** `honeypot/backend/api/voice.py`

### Step 2.1: Session Management
```python
session_data = await db.sessions.find_one({"session_id": sessionId})
```
- **Purpose:** Fetch existing session or create new one
- **Database:** MongoDB
- **Fields Updated:** 
  - `voice_enabled: True`
  - `voice_mode: "ai_speaks" | "ai_suggests"`
  - `status` (check if session is "terminated")

### Step 2.2: Message History Retrieval
```python
current_history = await db.messages.find({"session_id": sessionId}).sort("timestamp", 1)
formatted_history = [{"role": m["sender"], "content": m["content"]} for m in current_history]
```
- **Purpose:** Fetch conversation context (last 20 messages)
- **Formatted as:** `[{"role": "scammer|agent", "content": "..."}, ...]`
- **Use:** Passed to agent for context-aware responses

### Step 2.3: Voice Adapter Invocation
```python
result = await voice_adapter.run_voice_turn(
    session_id=sessionId,
    audio_data=audio_content,
    history=formatted_history,
    mode=mode,
    format=audio.filename.split('.')[-1]  # "webm"
)
```
⬇️ **Delegates to VoiceAdapter for heavy processing**

---

## 3. **Voice Adapter Processing** (`VoiceAdapter.run_voice_turn()`)
📍 **File:** `honeypot/backend/agents/voice_adapter.py`

### Step 3.1: Audio Normalization
**Service:** `AudioProcessor.normalize_audio()`

```
Raw Audio (WebM)
  ↓ Audio Processor
  ├─ Load audio from bytes
  ├─ Convert to mono (1 channel)
  ├─ Resample to 16kHz (Whisper's requirement)
  ├─ Export as WAV (8-bit PCM)
  ↓
Normalized Audio (WAV, 16kHz, mono)
+ Metadata: sample_rate, channels, duration, format
```

**Services Used:**
- `pydub.AudioSegment` - Audio format conversion
- `soundfile` - WAV encoding

**Output Metadata Example:**
```json
{
  "sample_rate": 16000,
  "channels": 1,
  "duration": 13.14,
  "original_format": "webm",
  "normalized_format": "wav"
}
```

---

### Step 3.2: Speech-to-Text (Transcription)
**Service:** `STTService.transcribe_bytes()`

```
Normalized Audio (WAV)
  ↓ Whisper (faster-whisper)
  ├─ Load model (tiny, base, small, medium, large)
  ├─ Voice Activity Detection (VAD) - removes silence
  ├─ Language Identification (auto-detect or specified)
  ├─ Transcribe audio to text
  ↓
Transcription Result
```

**Models Used:**
- **tiny** (39M) - Fastest, lower accuracy
- **base** (74M) - Balanced
- **small** (244M) - Higher accuracy
- **medium** (769M) - Very high accuracy
- **large** (3.1B) - Best accuracy

**Library:** `faster-whisper` (optimized Whisper implementation)

**Output Example:**
```json
{
  "text": "I am calling about your bank account verification",
  "language": "en",
  "confidence": 0.95,
  "duration": 13.14
}
```

**Language Detection:**
- Auto-detects from 99 languages
- Maps language codes: `en` → "English", `hi` → "Hindi", etc.
- Confidence score included

---

### Step 3.3: Agent Decision (LLM)
**Service:** `HoneyPotAgent.run()` via `agent_system` (LangGraph)

```
Conversation History + New Message
  ↓ Agent Graph (LangGraph + LangChain)
  ├─ System: State machine for scam engagement
  ├─ Intent Node: Analyze scammer's intent
  ├─ Emotion Node: Detect emotional state
  ├─ Strategy Node: Choose response strategy
  ├─ Response Planner: Draft response
  ├─ Humanizer: Make response natural
  ↓
Agent Decision
```

**LLM Models (Cascading):**
1. **Primary:** `llama-3.3-70b-versatile` (Groq) - Fast, free tier
2. **Fallback:** `gemini-1.5-flash` (Google) - If Groq fails

**Flow (From agent/graph.py):**
```python
# 1. Intent Analysis
intent = llm(history) → "phishing" | "tech_fraud" | "romance" | ...

# 2. Emotion Detection
emotion = llm(history) → "anxious" | "suspicious" | "curious" | ...

# 3. Strategy Selection
strategy = llm(intent, emotion) → "deflect" | "probe" | "agree" | ...

# 4. Response Planning
draft_response = llm(strategy, context) → "I understand your concern..."

# 5. Humanization
final_response = llm(draft_response) → "Yeah, I get it. My account is..."
```

**Output Example:**
```json
{
  "reply": "I understand. Let me verify the account details with you.",
  "intent": "phishing",
  "emotion": "suspicious",
  "strategy": "probe",
  "notes": "Attempting credential extraction"
}
```

---

### Step 3.4: Speech Naturalization (LLM)
**Service:** `SpeechNaturalizer.naturalize()`

```
Agent Reply Text
  ↓ LangChain + Groq/Gemini
  ├─ Read prompt: "Convert this to natural spoken language..."
  ├─ Add filler words: "uh", "um", "you know"
  ├─ Add conversational phrases
  ├─ Adjust punctuation for speech
  ↓
Naturalized Text (ready for TTS)
```

**Example Transformation:**
```
Original:  "I am happy to assist you."
Naturalized: "Uh, you know, I'm like, happy to, uh, help you out."
```

**Uses:** Same LLMs as agent (Groq primary, Gemini fallback)

---

### Step 3.5: Text-to-Speech (Audio Synthesis)
**Service:** `TTSService.synthesize()`

```
Naturalized Text
  ↓ TTS Engine Selection
  
  Option 1: pyttsx3 (Offline, free, lower quality)
    └─ eSpeak backend (system dependent)
  
  Option 2: gTTS (Online Google Translate TTS, high quality)
    ├─ Requires internet
    └─ Supports 173+ languages
  
  Option 3: Piper TTS (Offline, medium quality, supports many languages)
    └─ Neural TTS models
  
  ↓
Audio File (WAV)
+ Duration metadata
```

**Language Mapping:**
```python
{
  'en': 'en_US-lessac-medium',    # English (US)
  'hi': 'hi_IN-medium',            # Hindi
  'ta': 'ta_IN-medium',            # Tamil
  'te': 'te_IN-medium',            # Telugu
  'ml': 'ml_IN-medium',            # Malayalam
  'bn': 'bn_IN-medium',            # Bengali
}
```

**Storage:**
```
storage/audio/synthesized/{session_id}/tts_{language}_{hash}.wav
```

**Output Example:**
```json
{
  "audio_path": "storage/audio/synthesized/voice-session-abc123/tts_en_6f0cd01e.wav",
  "duration": 4.32,
  "naturalized_text": "Uh, you know, I'm like, happy to help you out.",
  "original_text": "I am happy to assist you."
}
```

---

## 4. **Database Operations**

### Step 4.1: Save Messages
**Collection:** `messages`

```python
# Scammer Message
{
  "session_id": "voice-session-abc123",
  "sender": "scammer",
  "content": "I am calling about your bank account",
  "is_voice": True,
  "timestamp": 2026-02-19T10:30:00Z,
  "metadata": {
    "confidence": 0.95,
    "language": "en"
  }
}

# Agent Message
{
  "session_id": "voice-session-abc123",
  "sender": "agent",
  "content": "I understand. Let me verify account details.",
  "is_voice": True,
  "speech_naturalized": True,
  "audio_file_path": "storage/audio/synthesized/voice-session-abc123/tts_en_6f0cd01e.wav",
  "timestamp": 2026-02-19T10:30:03Z,
  "metadata": {
    "naturalized": "Uh, you know, I understand. Let me verify...",
    "intent": "phishing"
  }
}
```

### Step 4.2: Update Session Metrics
**Collection:** `sessions`

```python
{
  "$inc": {
    "message_count": 2,           # Both scammer and agent
    "audio_chunk_count": 1
  },
  "$set": {
    "last_updated": datetime.utcnow(),
    "detected_language": "en"
  }
}
```

---

## 5. **Background Intelligence Extraction**
📍 **File:** `honeypot/backend/api/voice.py` - `process_voice_background_tasks()`

```
Scammer Transcription
  ↓ Background Task (async, non-blocking)
  ├─ Intelligence Extraction
  │  ├─ Extract entities: phone numbers, account details, names
  │  ├─ Detect scam tactics: urgency, authority, social engineering
  │  └─ Update scam findings
  │
  └─ Lifecycle Check
     ├─ Check if session should terminate
     ├─ Evaluate engagement metrics
     └─ Send termination callback if needed
```

**Services Invoked:**
- `IntelligenceExtractor.extract()` - Extracts sensitive information
- `LifecycleManager.check_termination()` - Determines if scam is "complete"

---

## 6. **Response to Frontend**
📍 **File:** `honeypot/backend/api/voice.py` - Return VoiceResponse

```python
{
  "status": "success",
  "sessionId": "voice-session-abc123",
  "transcription": "I am calling about your bank account",     # What scammer said
  "reply": "I understand. Let me verify...",                  # What agent decided
  "naturalizedReply": "Uh, you know, I understand...",       # How agent will speak it
  "audioUrl": "/api/voice/audio/voice-session-abc123/tts_en_6f0cd01e.wav",  # Link to audio
  "mode": "ai_speaks"
}
```

---

## 7. **Audio Playback**
📍 **File:** `honeypot/backend/api/voice.py` - `get_audio_file()`

```
Frontend requests: GET /api/voice/audio/{session_id}/{filename}
  ↓
Backend serves WAV file from disk
  ↓
VoicePlayer component plays audio via <audio> tag
```

---

## Service Call Summary

| Service | Purpose | Input | Output | Error Handling |
|---------|---------|-------|--------|-----------------|
| **AudioProcessor** | Normalize audio to 16kHz mono WAV | WebM audio bytes | WAV bytes + metadata | Logs errors, continues |
| **STTService** | Transcribe audio to text | WAV audio bytes | Text, language, confidence | Returns empty text on error |
| **HoneyPotAgent** | Generate response using LangGraph | Message history | Decision dict (reply, intent, emotion, strategy) | Fallback response if error |
| **SpeechNaturalizer** | Convert text to natural spoken language | Plain text | Conversational text with fillers | Returns original text if error |
| **TTSService** | Convert text to audio | Text + language | WAV file + path + duration | Cascades to fallback engines |
| **MongoDB** | Store messages and session state | Message/Session docs | Write acknowledgment | Logs errors |
| **IntelligenceExtractor** | Extract sensitive info (background task) | Transcription text | Entities + findings | Logged asynchronously |
| **LifecycleManager** | Determine if session should end (background task) | Session metrics | Termination decision | Non-blocking |

---

## Performance Characteristics

### Latency (per voice turn):
- **Audio Normalization:** 100-500ms (depends on audio length)
- **Speech-to-Text (Whisper tiny):** 2-5s (for 10s audio)
- **Agent LLM Decision:** 1-3s (API call to Groq)
- **Speech Naturalization:** 500ms-1s (LLM call)
- **Text-to-Speech:** 1-3s (depending on TTS engine)
- **Database Operations:** 100-200ms (MongoDB round trips)
- **Total Round Trip:** ~5-13 seconds

### Concurrent Processing:
- Multiple voice streams handled independently per session
- Background tasks don't block response
- Database writes optimized with batching

---

## Error Handling Flow

```
Voice Upload Error
  ├─ Audio Processing Fails → Return error message
  ├─ Transcription Fails → Skip to error response
  ├─ Agent Decision Fails → Use fallback response
  ├─ Speech Naturalization Fails → Use original text
  ├─ TTS Fails → Skip audio synthesis
  └─ Database Error → Log and return partial response

All errors logged with traceback for debugging
```

---

## Configuration Parameters

From `config.py`:
```python
GROQ_API_KEY          # Primary LLM provider
GEMINI_API_KEY        # Fallback LLM provider
WHISPER_MODEL         # "tiny", "base", "small", "medium", "large"
TTS_ENGINE            # "piper", "system", "gtts"
AUDIO_STORAGE_PATH    # Directory for synthesized audio
ELEVENLABS_API_KEY    # Optional: for voice cloning (advanced feature)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────┐
│  Frontend (VoiceRecorder.jsx)           │
│  - Capture WebM audio                   │
│  - Send to POST /api/voice/upload       │
└────────────┬────────────────────────────┘
             │ WebM + sessionId + mode
             ▼
┌────────────────────────────────────────────────────────┐
│  API Endpoint (/api/voice/upload)                       │
│  - Validate session                                     │
│  - Fetch message history from MongoDB                   │
│  - Invoke VoiceAdapter                                  │
└────────────┬─────────────────────────────────────────┬──┘
             │                                         │
             │                                         │ Background Task
             │                                         ▼ (async)
             ▼                            ┌──────────────────────────┐
    ┌─────────────────────────────────┐  │ Intelligence Extraction  │
    │ VoiceAdapter.run_voice_turn()   │  │ + Lifecycle Check        │
    │                                  │  └──────────────────────┬───┘
    │ 1. process_scammer_audio()      │                         │
    │    └─ normalize_audio()         │                         │
    │       ├─ AudioProcessor         │              (non-blocking)
    │       └─ Output: WAV metadata   │
    │                                  │
    │ 2. stt_service.transcribe_bytes()
    │    ├─ Whisper (faster-whisper)  │
    │    └─ Output: text, language    │
    │                                  │
    │ 3. agent_system.run()           │
    │    ├─ LangGraph + LangChain     │
    │    ├─ LLM: Groq / Gemini        │
    │    └─ Output: reply, intent     │
    │                                  │
    │ 4. generate_agent_voice()       │
    │    ├─ speech_naturalizer.       │
    │    │  naturalize()              │
    │    │  └─ LLM: Groq/Gemini       │
    │    │                             │
    │    └─ tts_service.synthesize()  │
    │       ├─ pyttsx3 / gTTS         │
    │       └─ Output: WAV file       │
    │                                  │
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │ Database Operations (MongoDB)     │
    │ - Insert scammer message          │
    │ - Insert agent message + audio    │
    │ - Update session metrics          │
    └──────────┬───────────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ API Response             │
    │ {                        │
    │   status,                │
    │   transcription,         │
    │   reply,                 │
    │   naturalizedReply,      │
    │   audioUrl,              │
    │   mode                   │
    │ }                        │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Frontend (VoicePlayer.jsx)    │
    │ - Display transcription       │
    │ - Show reply text             │
    │ - Play audio from audioUrl    │
    └──────────────────────────────┘
```

---

## Key Takeaways

1. **Modular Design:** Each service is independent and can be swapped
2. **Cascading LLMs:** Groq first, Gemini as fallback ensures robustness
3. **Async Processing:** Background intelligence extraction non-blocking
4. **Multi-language Support:** Language detection + dedicated models for each language
5. **Error Resilience:** Multiple fallback TTS engines, graceful degradation
6. **Real-time:** Complete voice turn completed in 5-13 seconds
