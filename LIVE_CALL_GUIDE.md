# Live Call System - Real-Time Two-Way Communication

## Overview
The Live Call system enables **real-time two-way voice communication** between a scammer and an operator (you) with AI assistance. Unlike the recorded voice messages system, this allows both parties to speak and hear each other in real-time.

## Architecture

### Dual WebSocket Connection
- **Operator WebSocket**: Connected with full intelligence features
- **Scammer WebSocket**: Simple audio streaming (no intelligence visible)
- **CallManager**: Routes audio between both participants

### Audio Flow
```
Scammer speaks → Audio chunk (1s) → WebSocket → 
  ├─> Route to Operator (hear scammer)
  ├─> Transcribe (STT)
  ├─> Extract Intelligence (entities, tactics, threats)
  └─> Generate AI coaching for operator

Operator speaks → Audio chunk (1s) → WebSocket →
  ├─> Route to Scammer (hear operator)
  └─> Transcribe for record
```

## Features

### For Operator (You)
1. **Real-time Audio Streaming**
   - Hear scammer speaking in real-time
   - Speak back naturally
   - Low latency (~1-2 seconds)

2. **Live Transcription**
   - See what scammer says as text
   - Track conversation flow
   - Review history mid-call

3. **AI Coaching**
   - Get real-time suggestions on what to say
   - AI analyzes scammer's words and suggests responses
   - Manual coaching request with "Get AI Help" button

4. **Intelligence Extraction**
   - **Entities**: Names, phone numbers, addresses, crypto wallets
   - **Threat Level**: 0-100% risk assessment
   - **Tactics**: Urgency, authority, fear tactics detected

5. **Call Controls**
   - Start/stop speaking
   - Request AI coaching
   - End call (generates report)

### For Scammer
- Simple voice call interface
- Speak and hear naturally
- No intelligence features visible
- No indication of AI assistance

## How to Use

### Step 1: Start Call Session
1. Navigate to `/call-starter`
2. Enter your name (operator)
3. Add optional metadata (e.g., scam type, target info)
4. Click "Start Call Session"
5. Receive two links:
   - **Operator Link**: For you
   - **Scammer Link**: To share with target

### Step 2: Join as Operator
1. Click "Join as Operator"
2. Allow microphone permissions
3. Wait for scammer to join
4. Status will show "Waiting for scammer..."

### Step 3: Share Scammer Link
1. Copy the scammer link
2. Share via:
   - Email
   - SMS
   - Social media
   - Messaging apps
3. Scammer joins by clicking link

### Step 4: Conduct Call
1. **Wait for connection**: Both participants must be connected
2. **Start speaking**: Click "🎤 Start Speaking"
3. **Monitor intelligence**: Watch right panel for extracted info
4. **Use AI coaching**: Click "💡 Get AI Help" for suggestions
5. **Speak naturally**: Your audio streams to scammer in real-time

### Step 5: End and Report
1. Click "📵 End Call"
2. Report generated automatically
3. Access report from Dashboard or via API

## API Endpoints

### REST Endpoints

#### Start Call
```http
POST /api/call/start
Content-Type: application/json
x-api-key: your-secret-key

{
  "operator_name": "Agent Smith",
  "metadata": {
    "target": "Tech Support Scam",
    "location": "India"
  }
}
```

**Response:**
```json
{
  "call_id": "call-abc123xyz",
  "operator_link": "/api/call/connect?call_id=call-abc123xyz&role=operator",
  "scammer_link": "/api/call/connect?call_id=call-abc123xyz&role=scammer",
  "status": "ready"
}
```

#### End Call
```http
POST /api/call/end/{call_id}
x-api-key: your-secret-key
```

#### Get Report
```http
GET /api/call/report/{call_id}?format=json
x-api-key: your-secret-key
```

### WebSocket Endpoint

#### Connect to Call
```
ws://localhost:8000/api/call/connect?call_id={call_id}&role={operator|scammer}
```

### Messages from Client

**Audio Chunk:**
```json
{
  "type": "audio_chunk",
  "audio": "<base64-encoded-audio>",
  "format": "webm"
}
```

**Text Message (fallback):**
```json
{
  "type": "text_message",
  "text": "Hello, can you help me?"
}
```

**Request Coaching (operator only):**
```json
{
  "type": "request_coaching"
}
```

### Messages to Operator

**Audio Stream from Scammer:**
```json
{
  "type": "audio_stream",
  "audio": "<base64>",
  "format": "webm",
  "source": "scammer",
  "timestamp": "2026-02-19T10:30:00Z"
}
```

**Live Transcription:**
```json
{
  "type": "transcription",
  "speaker": "scammer",
  "text": "I'm calling from Microsoft support",
  "language": "en",
  "confidence": 0.95,
  "timestamp": "2026-02-19T10:30:05Z"
}
```

**AI Coaching:**
```json
{
  "type": "ai_coaching",
  "suggestions": [
    "Ask for their employee ID number",
    "Question why Microsoft would call unsolicited",
    "Request specific details about the 'security issue'"
  ],
  "recommended_response": "Thank you for calling. Can you provide your Microsoft employee ID so I can verify you're legitimate?",
  "warning": "⚠️ High pressure tactics detected - remain calm",
  "timestamp": "2026-02-19T10:30:10Z"
}
```

**Intelligence Update:**
```json
{
  "type": "intelligence_update",
  "entities": [
    {"type": "phone_number", "value": "+1-800-123-4567", "confidence": 0.9},
    {"type": "name", "value": "John Smith", "confidence": 0.85}
  ],
  "threat_level": 0.75,
  "tactics": ["urgency", "authority", "fear"],
  "timestamp": "2026-02-19T10:30:15Z"
}
```

### Messages to Scammer

**Audio Stream from Operator:**
```json
{
  "type": "audio_stream",
  "audio": "<base64>",
  "format": "webm",
  "source": "operator",
  "timestamp": "2026-02-19T10:30:20Z"
}
```

## Technical Details

### Audio Processing
- **Capture**: MediaRecorder API (browser)
- **Encoding**: WebM Opus codec (128kbps)
- **Chunk Size**: 1 second intervals
- **Streaming**: Base64 encoded over WebSocket
- **Playback**: Audio queue with sequential playback

### Transcription
- **Engine**: Whisper (faster-whisper tiny model)
- **Language**: Auto-detected (multilingual support)
- **Latency**: ~500ms per chunk
- **Buffer**: 2-3 seconds for context

### Intelligence Extraction
- **Pipeline**: intelligence_pipeline.py
- **Entity Types**: Names, phones, emails, addresses, crypto, bank accounts, IPs, URLs
- **Tactic Detection**: Urgency, authority, fear, scarcity, social proof
- **Threat Scoring**: ML-based risk assessment (0.0-1.0)

### AI Coaching
- **Model**: LLM (Groq llama-3.3-70b or Gemini)
- **Context**: Last 10 conversation turns
- **Input**: Transcript + entities + tactics + threat level
- **Output**: Suggestions, recommended response, warnings
- **Trigger**: Automatic after scammer speaks, or manual request

## Database Schema

### live_calls Collection
```javascript
{
  call_id: "call-abc123xyz",
  operator_name: "Agent Smith",
  metadata: { target: "Tech Support", location: "India" },
  status: "active" | "ended",
  start_time: ISODate("2026-02-19T10:30:00Z"),
  end_time: ISODate("2026-02-19T10:45:00Z"),
  transcript: [
    {
      speaker: "scammer",
      text: "Hello, I'm from Microsoft",
      language: "en",
      confidence: 0.95,
      timestamp: ISODate("2026-02-19T10:30:05Z")
    },
    ...
  ],
  entities: [
    { type: "phone_number", value: "+1-800-123-4567", confidence: 0.9 },
    ...
  ],
  threat_level: 0.75,
  tactics: ["urgency", "authority"]
}
```

## Performance Metrics

- **Audio Latency**: 1-2 seconds (network + processing)
- **Transcription**: ~500ms per 1s chunk
- **Intelligence Extraction**: ~200ms per message
- **AI Coaching**: ~1-2 seconds (LLM generation)
- **WebSocket Bandwidth**: ~16 KB/s per participant (128kbps audio)

## Security Considerations

1. **API Key Required**: All endpoints protected
2. **Call ID**: Random 12-character hex (not guessable)
3. **Role Separation**: Operator sees intelligence, scammer doesn't
4. **Audio Privacy**: Audio not stored by default (only transcript)
5. **HTTPS/WSS**: Use TLS in production

## Comparison: Live Call vs Voice Upload

| Feature | Voice Upload | Live Call |
|---------|-------------|-----------|
| Real-time | ❌ No | ✅ Yes |
| Two-way conversation | ❌ No | ✅ Yes |
| Scammer hears you | ❌ No | ✅ Yes |
| AI coaching | ❌ After response | ✅ During call |
| Use case | Async scam baiting | Real scam calls |
| Latency | N/A | 1-2 seconds |
| Setup | Simple upload | Need to share link |

## Example Use Cases

### 1. Tech Support Scam
- Scammer calls claiming to be from Microsoft
- You join call with AI assistance
- AI extracts: phone number, fake employee ID, payment request
- AI suggests: "Ask about specific error codes, question legitimacy"
- Generate evidence report for authorities

### 2. Romance Scam
- Scammer video call or voice call
- Long conversation with emotional manipulation
- AI extracts: crypto wallet, money requests, location hints
- AI detects: urgency tactics, emotional manipulation
- Document patterns for investigation

### 3. Phishing Call
- Scammer impersonates bank
- Requests account details, passwords
- AI extracts: spoofed caller ID, account numbers mentioned
- AI warns: "Never share passwords over phone"
- Report to fraud department

## Troubleshooting

### "Microphone not accessible"
- Grant browser microphone permissions
- Check system privacy settings
- Try different browser (Chrome/Edge recommended)

### "WebSocket connection failed"
- Check backend is running (localhost:8000)
- Verify VITE_WS_BASE_URL in .env
- Check firewall settings

### "No audio heard"
- Check speaker volume
- Verify other participant is speaking
- Check browser audio permissions

### "AI coaching not appearing"
- Scammer must speak first
- Click "Get AI Help" manually
- Check operator role (not available for scammer)

## Future Enhancements

- [ ] Video streaming support
- [ ] Screen sharing (scammer desktop)
- [ ] Multi-language real-time translation
- [ ] Voice stress analysis
- [ ] Background noise detection (call center sounds)
- [ ] Geographic location from audio metadata
- [ ] Sentiment analysis (anger, nervousness)
- [ ] Call recording export (with consent)

## Support

For issues or questions:
- Check DEPLOYMENT_GUIDE.md
- Review VOICE_WORKFLOW.md for audio pipeline
- Check logs: `backend/logs/`
- Frontend console for WebSocket errors
