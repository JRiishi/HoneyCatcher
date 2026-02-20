# HoneyBadger - Complete System Architecture

> **Last Updated:** February 20, 2026  
> **Version:** 2.1 (Groq Whisper + WebRTC Audio Fix)  
> **Status:** Production-Ready Core + Experimental Features

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Core Architecture](#core-architecture)
5. [Component Deep Dive](#component-deep-dive)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Feature Implementation Status](#feature-implementation-status)
10. [Security & Authentication](#security--authentication)
11. [Deployment Architecture](#deployment-architecture)
12. [Integration Points](#integration-points)
13. [Future Roadmap](#future-roadmap)

---

## 1. Executive Summary

**HoneyBadger** is an AI-powered honeypot system designed to engage with scammers, extract intelligence, and provide real-time operator assistance during live takeover operations. The system employs multi-modal AI agents, WebRTC P2P communication, voice cloning, and forensic intelligence extraction.

### Key Capabilities

- **Autonomous AI Agent**: LangGraph-powered conversational AI that impersonates vulnerable targets
- **Voice Interaction**: Real-time speech-to-text (Whisper), text-to-speech (ElevenLabs), and voice cloning
- **Live Takeover**: WebRTC-based P2P audio streaming with operator-in-the-loop AI coaching
- **Intelligence Extraction**: Automated extraction of bank accounts, phone numbers, UPI IDs, URLs, scam tactics
- **Security Analysis**: URL scanning (VirusTotal), scam pattern detection, threat scoring
- **Mobile PWA**: Progressive Web App with offline capabilities and native wrappers (Capacitor)

### Problem Statement

Scammers operate with impunity, targeting millions daily through phone calls, messages, and social engineering. Traditional detection methods are reactive and ineffective. HoneyBadger provides:

1. **Proactive Engagement**: AI agents waste scammer time and resources
2. **Evidence Collection**: Automated forensic intelligence gathering for law enforcement
3. **Real-time Assistance**: AI-powered coaching for human operators during live takeovers
4. **Scalability**: Can handle unlimited concurrent scam sessions

---

## 2. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐          │
│  │  Web App   │  │  Mobile PWA  │  │ Native Apps   │          │
│  │  (React)   │  │  (Vite+SW)   │  │ (Capacitor)   │          │
│  └──────┬─────┘  └──────┬───────┘  └───────┬───────┘          │
└─────────┼────────────────┼──────────────────┼──────────────────┘
          │                │                  │
          └────────────────┴──────────────────┘
                          │
          ┌───────────────▼────────────────┐
          │      API GATEWAY (FastAPI)      │
          │  - CORS, Auth, Rate Limiting    │
          └───────────────┬────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───▼──────┐    ┌─────────▼────────┐    ┌─────▼──────┐
│ REST API │    │ WebSocket Server │    │ Socket.IO  │
│ Routers  │    │ (Live Takeover)  │    │ (WebRTC)   │
└───┬──────┘    └─────────┬────────┘    └─────┬──────┘
    │                     │                    │
    └─────────────────────┼────────────────────┘
                          │
          ┌───────────────▼────────────────┐
          │     SERVICE LAYER               │
          │  ┌──────────────────────────┐  │
          │  │ AI Agent (LangGraph)     │  │
          │  │ - Intent Analysis        │  │
          │  │ - Response Planning      │  │
          │  │ - Humanization           │  │
          │  └──────────┬───────────────┘  │
          │             │                   │
          │  ┌──────────▼───────────────┐  │
          │  │ Intelligence Pipeline    │  │
          │  │ - Entity Extraction      │  │
          │  │ - Pattern Detection      │  │
          │  │ - Threat Scoring         │  │
          │  └──────────┬───────────────┘  │
          │             │                   │
          │  ┌──────────▼───────────────┐  │
          │  │ Audio Processing         │  │
          │  │ - STT (Whisper)          │  │
          │  │ - TTS (ElevenLabs)       │  │
          │  │ - Voice Cloning          │  │
          │  │ - Audio Normalization    │  │
          │  └──────────┬───────────────┘  │
          │             │                   │
          │  ┌──────────▼───────────────┐  │
          │  │ WebRTC Service           │  │
          │  │ - Signaling Server       │  │
          │  │ - P2P Audio Routing      │  │
          │  │ - ICE Negotiation        │  │
          │  └──────────────────────────┘  │
          └─────────────┬──────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │   DATA LAYER               │
          │  ┌──────────────────────┐  │
          │  │  MongoDB             │  │
          │  │  - Sessions          │  │
          │  │  - Messages          │  │
          │  │  - Intelligence      │  │
          │  │  - Live Calls        │  │
          │  │  - Voice Samples     │  │
          │  └──────────────────────┘  │
          │                            │
          │  ┌──────────────────────┐  │
          │  │  File Storage        │  │
          │  │  - Audio Files       │  │
          │  │  - Voice Clones      │  │
          │  └──────────────────────┘  │
          └────────────────────────────┘

          ┌────────────────────────────┐
          │  EXTERNAL INTEGRATIONS     │
          │  - Groq API (Llama 3.3)   │
          │  - Gemini (Fallback)      │
          │  - ElevenLabs (Voice)     │
          │  - VirusTotal (URLs)      │
          │  - GUVI Callback          │
          └────────────────────────────┘
```

---

## 3. Technology Stack

### Backend Stack

| Layer | Technology | Purpose | Status |
|-------|-----------|---------|--------|
| **Runtime** | Python 3.11+ | Core language | ✅ Implemented |
| **API Framework** | FastAPI 0.110.0 | REST + WebSocket server | ✅ Implemented |
| **AI Framework** | LangChain + LangGraph | Agent orchestration | ✅ Implemented |
| **LLM Provider** | Groq (Llama 3.3-70B) | Primary reasoning engine | ✅ Implemented |
| **LLM Fallback** | Google Gemini 1.5 Flash | Backup LLM | ✅ Implemented |
| **Database** | MongoDB 7.0+ | Document store | ✅ Implemented |
| **ODM** | Motor (async) + Pydantic | MongoDB async client | ✅ Implemented |
| **Speech-to-Text (AI Agent)** | Faster-Whisper (local) | Audio transcription for AI-only calls | ✅ Implemented |
| **Speech-to-Text (Live Calls)** | Groq Whisper API (`whisper-large-v3-turbo`) | Real-time transcription during live takeover / WebRTC calls | ✅ Implemented |
| **Text-to-Speech** | ElevenLabs API | Voice synthesis | ✅ Implemented |
| **Voice Cloning** | ElevenLabs Voice Design | Agent voice cloning | ✅ Implemented |
| **Audio Processing** | pydub, ffmpeg | Audio manipulation | ✅ Implemented |
| **WebRTC Signaling** | python-socketio 5.11.0 | WebRTC signaling server | ✅ Implemented |
| **WebSocket** | FastAPI WebSockets | Real-time communication | ✅ Implemented |
| **Security** | VirusTotal API | URL scanning | ✅ Implemented |

### Frontend Stack

| Layer | Technology | Purpose | Status |
|-------|-----------|---------|--------|
| **Framework** | React 18.3.1 | UI library | ✅ Implemented |
| **Build Tool** | Vite 7.3.1 | Dev server + bundler | ✅ Implemented |
| **Routing** | React Router 7.1.2 | Client-side routing | ✅ Implemented |
| **Styling** | Tailwind CSS 4.0.3 | Utility-first CSS | ✅ Implemented |
| **Animations** | Framer Motion 12.23.12 | UI animations | ✅ Implemented |
| **Charts** | Recharts 2.15.1 | Data visualization | ✅ Implemented |
| **Maps** | React Leaflet 5.0.0 | Geolocation mapping | ✅ Implemented |
| **WebRTC** | Native WebRTC APIs + Socket.IO Client | P2P audio streaming | ✅ Implemented |
| **PWA** | Service Worker + Manifest | Offline capabilities | ✅ Implemented |
| **Native Wrapper** | Capacitor 6.2.0 | iOS/Android apps | ✅ Implemented |
| **State Management** | React Hooks (useState, useEffect) | Local state | ✅ Implemented |

### Infrastructure

| Component | Technology | Purpose | Status |
|-----------|-----------|---------|--------|
| **Hosting** | Render.com / Vercel | Cloud deployment | 🔄 Configured |
| **Database** | MongoDB Atlas | Cloud MongoDB | 🔄 Configured |
| **Storage** | Local File System → S3 | Audio file storage | ⏳ Partial (local only) |
| **CDN** | Cloudflare | Static asset delivery | ⏳ Not Started |
| **Monitoring** | Logs (stdout) → Sentry | Error tracking | ⏳ Not Started |
| **Analytics** | Custom dashboard | Session metrics | ✅ Implemented |

---

## 4. Core Architecture

### 4.1 Multi-Layer Architecture

The system follows a **layered architecture** pattern:

```
┌────────────────────────────────────────┐
│         PRESENTATION LAYER             │  React Components
│  (UI, User Interaction, Visualization) │  - Pages, Components
└────────────────┬───────────────────────┘  - Hooks, Services
                 │
┌────────────────▼───────────────────────┐
│         APPLICATION LAYER              │  FastAPI Routers
│  (Business Logic, API Endpoints)       │  - REST Endpoints
└────────────────┬───────────────────────┘  - WebSocket Handlers
                 │
┌────────────────▼───────────────────────┐
│         SERVICE LAYER                  │  Python Services
│  (Core Features, AI Processing)        │  - AI Agents
└────────────────┬───────────────────────┘  - Intelligence
                 │                           - Audio Processing
┌────────────────▼───────────────────────┐
│         DATA ACCESS LAYER              │  MongoDB ODM
│  (Database Operations, File I/O)       │  - Models
└────────────────┬───────────────────────┘  - CRUD Operations
                 │
┌────────────────▼───────────────────────┐
│         INFRASTRUCTURE LAYER           │  External Services
│  (Database, Storage, External APIs)    │  - MongoDB
└────────────────────────────────────────┘  - ElevenLabs, Groq
```

### 4.2 Microservices Architecture (Service Layer)

The service layer is composed of **loosely-coupled microservices**:

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE MESH                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  AI Agent    │  │  Intelligence│  │  Audio       │    │
│  │  Service     │  │  Pipeline    │  │  Processor   │    │
│  │              │  │              │  │              │    │
│  │ - LangGraph  │  │ - Extractor  │  │ - STT        │    │
│  │ - Persona    │  │ - Scam Score │  │ - TTS        │    │
│  │ - Memory     │  │ - URL Scan   │  │ - Voice Clone│    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │            │
│         └─────────────────┼──────────────────┘            │
│                           │                               │
│  ┌────────────────────────▼───────────────────────────┐  │
│  │           Event Bus / Message Queue                 │  │
│  │  (Async Task Queue for Background Processing)      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Service Communication:**
- **Synchronous**: Direct function calls (same process)
- **Asynchronous**: Background tasks (asyncio.create_task)
- **Event-Driven**: WebSocket broadcasts, Socket.IO events

### 4.3 AI Agent Architecture (LangGraph)

The AI agent uses **LangGraph** for stateful graph-based workflows:

```
╔═══════════════════════════════════════════════════════════╗
║              LANGGRAPH STATE MACHINE                       ║
╚═══════════════════════════════════════════════════════════╝

    ┌────────────────────────────────────────┐
    │  Scammer Message Received              │
    └────────────────┬───────────────────────┘
                     │
         ┌───────────▼──────────┐
         │   INTENT ANALYZER    │  (LLM Node)
         │  - Classify intent   │
         │  - Detect emotion    │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │  RESPONSE PLANNER    │  (LLM Node)
         │  - Strategy select   │
         │  - Draft response    │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │  HUMANIZER           │  (LLM Node)
         │  - Add personality   │
         │  - Natural language  │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │  SPEECH NATURALIZER  │  (Optional)
         │  - Convert for TTS   │
         │  - Add hesitations   │
         └───────────┬──────────┘
                     │
    ┌────────────────▼───────────────────────┐
    │  Agent Response Sent                   │
    └────────────────────────────────────────┘

**State Schema:**
{
  messages: [HumanMessage, AIMessage, ...],
  intent: "phishing" | "verification" | "payment",
  emotion: "fearful" | "confused" | "compliant",
  strategy: "delay" | "gather_info" | "escalate",
  draft_response: "...",
  final_response: "...",
  turn_count: 5
}
```

**Node Types:**
1. **Intent Analyzer**: Classifies scammer's intent (phishing, verification, payment demand)
2. **Response Planner**: Selects strategy based on intent (delay, gather info, escalate)
3. **Humanizer**: Transforms draft into natural, personality-infused response
4. **Speech Naturalizer**: Converts text for TTS (adds pauses, hesitations)

---

## 5. Component Deep Dive

### 5.1 Backend Components

#### 5.1.1 API Layer (`honeypot/backend/api/`)

| File | Purpose | Endpoints | Status |
|------|---------|-----------|--------|
| **message.py** | Text-based conversation API | `POST /message`, `GET /message/history/{id}` | ✅ Implemented |
| **sessions.py** | Session management | `POST /session/start`, `GET /session/{id}`, `GET /sessions` | ✅ Implemented |
| **voice.py** | Voice interaction API | `POST /voice/transcribe`, `POST /voice/synthesize` | ✅ Implemented |
| **live_takeover.py** | Live takeover WebSocket | `WS /live`, `POST /live/start`, `POST /live/end` | ✅ Implemented |
| **live_call.py** | WebSocket-based live calling | `WS /api/call/connect?call_id={id}&role={role}` | ✅ Implemented |
| **webrtc_signaling.py** | WebRTC signaling server | `POST /webrtc/room/create`, `WS /socket.io/` | ✅ Implemented |
| **voice_clone.py** | Voice cloning endpoints | `POST /voice-clone/create`, `GET /voice-clone/list` | ✅ Implemented |

**Key Features:**
- **CORS Middleware**: Allows cross-origin requests (configure in production)
- **Authentication**: `X-API-Key` header verification via `core.auth.verify_api_key`
- **WebSocket Manager**: Maintains active connections, handles broadcasts
- **Socket.IO Server**: Manages WebRTC signaling (offer/answer/ICE)

#### 5.1.2 Agent Layer (`honeypot/backend/agents/`)

| File | Purpose | Key Components | Status |
|------|---------|----------------|--------|
| **graph.py** | LangGraph agent orchestration | `HoneyPotAgent`, `AgentState`, workflow graph | ✅ Implemented |
| **persona.py** | Character profiles | `PERSONAS` dict (Elderly, Student, etc.) | ✅ Implemented |
| **prompts.py** | LLM prompt templates | System, Intent, Planner, Humanizer prompts | ✅ Implemented |
| **memory.py** | Conversation memory | Short-term buffer, long-term summaries | ✅ Implemented |
| **voice_adapter.py** | Voice persona adaptation | Voice-specific response adjustments | ✅ Implemented |
| **speech_naturalizer.py** | TTS optimization | Converts text to natural speech patterns | ✅ Implemented |

**Agent Workflow (LangGraph):**

```python
workflow = StateGraph(AgentState)
workflow.add_node("intent_analysis", self._intent_analysis)
workflow.add_node("response_planner", self._response_planner)
workflow.add_node("humanizer", self._humanizer)

workflow.set_entry_point("intent_analysis")
workflow.add_edge("intent_analysis", "response_planner")
workflow.add_edge("response_planner", "humanizer")
workflow.add_edge("humanizer", END)

agent = workflow.compile()
```

**Persona System:**

```python
PERSONAS = {
    "elderly_confused": {
        "name": "Mrs. Sharma",
        "age": 68,
        "traits": ["tech_illiterate", "trusting", "fearful_of_authority"],
        "speech_patterns": ["beta", "please help me", "I don't understand"],
        "backstory": "Retired teacher, recently widowed..."
    }
}
```

#### 5.1.3 Service Layer (`honeypot/backend/services/`)

| Service | File | Purpose | Dependencies | Status |
|---------|------|---------|--------------|--------|
| **Intelligence Extractor** | `intelligence_extractor.py` | Extract bank accounts, UPIs, phones, URLs | Groq LLM, Regex | ✅ Implemented |
| **Scam Detector** | `scam_detector.py` | Pattern matching, threat scoring, sentiment analysis | Groq LLM | ✅ Implemented |
| **STT Service** | `stt_service.py` | Speech-to-text for AI-agent calls | Faster-Whisper (local) — **not used for live calls** | ✅ Implemented |
| **Streaming STT (Live)** | `streaming_stt.py` | Real-time streaming STT for live/WebRTC calls | Groq Whisper API — avoids RAM issues on Render.com | ✅ Implemented |
| **TTS Service** | `tts_service.py` | Text-to-speech synthesis | ElevenLabs API | ✅ Implemented |
| **Audio Processor** | `audio_processor.py` | Audio format conversion, validation | pydub, ffmpeg | ✅ Implemented |
| **Callback Service** | `callback.py` | External webhook notifications | GUVI API | ✅ Implemented |

**Intelligence Extractor:**

```python
class IntelligenceExtractor:
    async def extract(self, session_id, message, history):
        # Step 1: Regex extraction (initial pass)
        extracted = self._regex_extract(message)
        
        # Step 2: LLM extraction (disambiguation)
        if self.llm:
            llm_result = await self._llm_extract(message, history)
            extracted = self._merge(extracted, llm_result)
        
        # Step 3: Save to database (atomic update with dedup)
        await self._save_to_db(session_id, extracted)
```

**Scam Detector:**

```python
class ScamDetector:
    async def analyze(self, text, history):
        # Pattern matching
        urgency = self._detect_urgency(text)
        authority = self._detect_authority_impersonation(text)
        
        # LLM analysis
        sentiment = await self._analyze_sentiment(text)
        tactics = await self._detect_tactics(text, history)
        
        # Threat scoring
        score = self._calculate_threat_score(urgency, authority, tactics)
        
        return {
            "scam_score": score,
            "is_confirmed_scam": score > 0.8,
            "tactics": tactics,
            "sentiment": sentiment
        }
```

#### 5.1.4 Database Models (`honeypot/backend/db/models.py`)

**Core Models:**

```python
class Message(BaseDoc):
    message_id: str
    session_id: str
    sender: str  # "scammer" | "agent"
    content: str
    timestamp: datetime
    is_voice: bool
    audio_file_path: Optional[str]
    transcription_confidence: Optional[float]

class Intelligence(BaseDoc):
    bank_accounts: List[str]
    upi_ids: List[str]
    phone_numbers: List[str]
    urls: List[str]
    scam_keywords: List[str]
    behavioral_tactics: List[str]

class Session(BaseDoc):
    session_id: str
    start_time: datetime
    status: str  # "active" | "terminated" | "reported"
    scam_score: float
    is_confirmed_scam: bool
    extracted_intelligence: Intelligence
    agent_state: AgentState
    voice_enabled: bool
    voice_mode: str  # "text" | "ai_speaks" | "ai_suggests"

class VoiceChunk(BaseDoc):
    chunk_id: str
    session_id: str
    file_path: str
    format: str  # "wav" | "mp3" | "webm"
    duration: float
    transcription: Optional[str]
```

#### 5.1.5 Live Takeover Features (`honeypot/backend/features/live_takeover/`)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| **Session Manager** | `session_manager.py` | Manages live session state, mode switching | ✅ Implemented |
| **Intelligence Pipeline** | `intelligence_pipeline.py` | Real-time intel extraction during live calls | ✅ Implemented |
| **Takeover Agent** | `takeover_agent.py` | AI coaching for human operators | ✅ Implemented |
| **Streaming STT** | `streaming_stt.py` | Real-time audio transcription via **Groq Whisper API** (`whisper-large-v3-turbo`), buffers chunks and transcribes at 2.5 s threshold | ✅ Implemented |
| **Voice Clone Service** | `voice_clone_service.py` | ElevenLabs voice cloning integration | ✅ Implemented |
| **URL Scanner** | `url_scanner.py` | VirusTotal API integration for URL analysis | ✅ Implemented |
| **Report Generator** | `report_generator.py` | PDF/JSON reports for law enforcement | ✅ Implemented |

**Session State Machine:**

```python
class SessionStatus(Enum):
    WAITING = "waiting"
    CONNECTED = "connected"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"

class TakeoverMode(Enum):
    AI_ONLY = "ai_only"          # AI handles everything
    AI_SUGGESTS = "ai_suggests"  # AI provides suggestions, operator decides
    OPERATOR_ONLY = "operator"   # Operator speaks, AI silent
```

---

### 5.2 Frontend Components

#### 5.2.1 Pages (`honeypot/frontend/src/pages/`)

| Page | File | Purpose | Features | Status |
|------|------|---------|----------|--------|
| **Landing Page** | `LandingPage.jsx` | Home page, product showcase | Hero, features, CTA | ✅ Implemented |
| **Dashboard** | `Dashboard.jsx` | Session overview, analytics | Session list, filters, charts | ✅ Implemented |
| **Playground** | `Playground.jsx` | Text chat interface | Message history, send messages | ✅ Implemented |
| **Voice Playground** | `VoicePlayground.jsx` | Voice chat interface | Audio recording, playback, transcripts | ✅ Implemented |
| **Session View** | `SessionView.jsx` | Detailed session analysis | Full transcript, intel panel, timeline | ✅ Implemented |
| **Live Takeover** | `LiveTakeoverMode.jsx` | Live WebSocket takeover | Mode switching, AI suggestions | ✅ Implemented |
| **Live Call** | `LiveCall.jsx` | WebSocket live calling (legacy) | Manual audio recording | ✅ Implemented |
| **Live Call WebRTC** | `LiveCallWebRTC.jsx` | WebRTC P2P live calling | Automatic audio streaming, AI coaching | ✅ Implemented |
| **Voice Clone Setup** | `VoiceCloneSetup.jsx` | Voice cloning interface | Upload samples, create voice | ✅ Implemented |
| **Call Starter** | `CallStarter.jsx` | Create live call sessions | Room creation, link sharing | ✅ Implemented |

#### 5.2.2 Components (`honeypot/frontend/src/components/`)

| Component | File | Purpose | Props | Status |
|-----------|------|---------|-------|--------|
| **Message Bubble** | `MessageBubble.jsx` | Chat message display | `sender`, `content`, `timestamp` | ✅ Implemented |
| **Intelligence Panel** | `IntelligencePanel.jsx` | Display extracted intel | `intelligence` object | ✅ Implemented |
| **AI Suggestion Panel** | `AISuggestionPanel.jsx` | Show AI coaching | `suggestions`, `warning` | ✅ Implemented |
| **Voice Recorder** | `VoiceRecorder.jsx` | Audio recording widget | `onRecordingComplete` | ✅ Implemented |
| **Voice Player** | `VoicePlayer.jsx` | Audio playback widget | `audioUrl`, `autoPlay` | ✅ Implemented |
| **Glass Card** | `GlassCard.jsx` | Glassmorphism container | `children`, `className` | ✅ Implemented |
| **Navbar** | `Navbar.jsx` | Top navigation | Desktop layout | ✅ Implemented |
| **Mobile Navbar** | `MobileNavbar.jsx` | Bottom navigation | Mobile-optimized | ✅ Implemented |
| **Dashboard Filters** | `DashboardFilters.jsx` | Session filter controls | `onFilterChange` | ✅ Implemented |
| **Install PWA Button** | `InstallPWAButton.jsx` | PWA install prompt | Auto-detect installability | ✅ Implemented |
| **Offline Indicator** | `OfflineIndicator.jsx` | Network status banner | Auto-detect online/offline | ✅ Implemented |
| **Mobile Optimized Live Call** | `MobileOptimizedLiveCall.jsx` | Mobile live call UI | Touch-optimized, haptics | ✅ Implemented |

#### 5.2.3 Services (`honeypot/frontend/src/services/`)

| Service | File | Purpose | Methods | Status |
|---------|------|---------|---------|--------|
| **API Client** | `api.js` | REST API wrapper | `get()`, `post()`, `delete()` | ✅ Implemented |
| **Live API** | `liveApi.js` | WebSocket client | `connect()`, `send()`, `disconnect()` | ✅ Implemented |
| **WebRTC Service** | `webrtc.js` | WebRTC connection manager | `connect()`, `createOffer()`, `handleICE()` | ✅ Implemented |

**API Client:**

```javascript
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_SECRET_KEY
    };
  }
  
  async get(endpoint) { /* ... */ }
  async post(endpoint, data) { /* ... */ }
  async delete(endpoint) { /* ... */ }
}
```

**WebRTC Service:**

```javascript
class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
  }
  
  async connect(roomId, role) {
    // Connect to Socket.IO
    this.socket = io(SOCKET_URL);
    
    // Join room
    this.socket.emit('join_room', { room_id: roomId, role });
    
    // Start local audio
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup WebRTC
    this.createPeerConnection();
  }
  
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(iceServers);
    this.localStream.getTracks().forEach(track => 
      this.peerConnection.addTrack(track, this.localStream)
    );
    
    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket.emit('ice_candidate', { candidate: e.candidate });
      }
    };
    
    this.peerConnection.ontrack = (e) => {
      this.remoteStream = e.streams[0];
      this.onRemoteStream(this.remoteStream);
    };
  }
}
```

#### 5.2.4 Hooks (`honeypot/frontend/src/hooks/`)

| Hook | File | Purpose | Returns | Status |
|------|------|---------|---------|--------|
| **useWebRTC** | `useWebRTC.js` | WebRTC connection hook | `isConnected`, `remoteStream`, `transcripts`, `connect()`, `disconnect()` | ✅ Implemented |

**Usage Example:**

```javascript
function LiveCallWebRTC() {
  const { callId } = useParams();
  
  const {
    isConnected,
    isPeerConnected,
    remoteStream,
    transcripts,
    aiCoaching,
    toggleMute,
    disconnect
  } = useWebRTC(callId, 'operator');
  
  // Auto-connects on mount, auto-disconnects on unmount
  // Handles P2P audio streaming, transcription, AI coaching
}
```

#### 5.2.5 Progressive Web App (PWA)

**Manifest (`public/manifest.json`):**

```json
{
  "name": "HoneyBadger Scam Catcher",
  "short_name": "HoneyBadger",
  "description": "AI-powered honeypot for scammers",
  "theme_color": "#7c3aed",
  "background_color": "#000000",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker (`public/service-worker.js`):**

```javascript
const CACHE_NAME = 'honeybadger-v1';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => 
      response || fetch(event.request)
    )
  );
});
```

**Native Wrappers (Capacitor):**

```
honeypot/frontend/
├── ios/                    # iOS Xcode project
│   └── App/
│       └── App.xcodeproj
├── android/                # Android Studio project
│   └── app/
│       └── build.gradle
└── capacitor.config.json   # Capacitor configuration
```

---

## 6. Data Flow Diagrams

### 6.1 Text Chat Flow

```
┌──────────────┐
│   Scammer    │
│  sends msg   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  POST /api/message       │  (Frontend)
│  {                       │
│    session_id: "...",    │
│    content: "..."        │
│  }                       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  FastAPI Router          │  (Backend)
│  message.py              │
└──────┬───────────────────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌─────────────────┐   ┌──────────────────┐
│ Save Message    │   │ Intelligence     │
│ to MongoDB      │   │ Extraction       │
└─────────────────┘   │ (Background)     │
                      └──────┬───────────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────┐
│  AI Agent (LangGraph)         │
│                               │
│  1. Intent Analysis           │
│     ├─> "payment_demand"      │
│     └─> emotion: "urgent"     │
│                               │
│  2. Response Planning         │
│     ├─> strategy: "delay"     │
│     └─> draft: "Wait, why?"   │
│                               │
│  3. Humanizer                 │
│     └─> "Wait... why do I     │
│          need to pay?"        │
└──────┬────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Save Agent Response     │
│  to MongoDB              │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Return Response         │  (Frontend)
│  {                       │
│    response: "...",      │
│    intelligence: {...}   │
│  }                       │
└──────────────────────────┘
```

### 6.2 Voice Chat Flow

```
┌──────────────┐
│   Scammer    │
│  sends audio │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  POST /api/voice/        │  (Frontend)
│       transcribe         │
│  FormData:               │
│    audio: <file>         │
│    format: "webm"        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  STT Service             │  (Backend)
│  (Faster-Whisper)        │  ← AI-agent calls only
│                          │
│  1. Audio Validation     │
│  2. Format Conversion    │
│  3. Whisper Transcribe   │
│     └─> "Send money..."  │
│  4. Language Detection   │
│     └─> "hi" (Hindi)     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  AI Agent Processing     │
│  (Same as Text Flow)     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  TTS Service             │  (Backend)
│  (ElevenLabs)            │
│                          │
│  1. Text Normalization   │
│  2. Voice Selection      │
│  3. API Request          │
│  4. Audio File Save      │
│     └─> "audio_xxx.mp3"  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Return Audio URL        │  (Frontend)
│  {                       │
│    transcription: "...", │
│    audio_url: "...",     │
│    response_text: "..."  │
│  }                       │
└──────────────────────────┘
```

### 6.3 WebRTC Live Call Flow

```
┌──────────────┐             ┌──────────────┐
│  Operator    │             │   Scammer    │
│  (Browser)   │             │  (Browser)   │
└──────┬───────┘             └──────┬───────┘
       │                            │
       │  1. Create Room            │
       ├──────────────────────────► │
       │  POST /webrtc/room/create  │
       │  └─> room_id: "call-xxx"   │
       │                            │
       │  2. Join Room (Operator)   │
       ├────────────────────────────┤
       │  Socket.IO connect         │
       │  emit('join_room', {       │
       │    room_id: "call-xxx",    │
       │    role: "operator"        │
       │  })                        │
       │                            │
       │                            │  3. Join Room (Scammer)
       │                            ├───────────────────────►
       │                            │  emit('join_room', {
       │                            │    role: "scammer"
       │                            │  })
       │                            │
       │  ◄──────────────────────────────────────────────┐
       │  4. Both Peers Joined Event                     │
       │  on('peer_joined')                              │
       │                                                  │
       │  5. WebRTC Offer (Operator creates)             │
       ├──────────────────────────────────────────────►  │
       │  emit('webrtc_offer', { offer: {...} })         │
       │                                                  │
       │  6. WebRTC Answer (Scammer creates)             │
       │  ◄──────────────────────────────────────────────┤
       │  emit('webrtc_answer', { answer: {...} })       │
       │                                                  │
       │  7. ICE Candidates Exchange                     │
       │  ◄──────────────────────────────────────────────►
       │  emit('ice_candidate', { candidate: {...} })    │
       │                                                  │
       │  ════════════════════════════════════════════   │
       │  8. P2P Audio Stream (Direct Connection)        │
       │  ◄──────────────────────────────────────────────►
       │  WebRTC PeerConnection (no backend involved)    │
       │  ════════════════════════════════════════════   │
       │                                                  │
       └──────────────────┬───────────────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  Backend             │
                │  (Socket.IO Server)  │
                │                      │
                │  9. Audio Chunks     │
                │     (for STT)        │
                │  ─────────────────►  │
                │  Whisper Transcribe  │
                │                      │
                │  10. Transcription   │
                │  ◄─────────────────  │
                │  emit('transcription'│
                │    , { text: "..." })│
                │                      │
                │  11. AI Coaching     │
                │  ◄─────────────────  │
                │  emit('ai_coaching', │
                │    { suggestions })  │
                └──────────────────────┘

**Key Points:**
- Steps 1-7: WebRTC signaling (Socket.IO)
- Step 8: P2P direct audio (no backend)
- Steps 9-11: Backend processing (transcription, AI)
```

### 6.4 Intelligence Extraction Flow

```
┌──────────────────────────┐
│  Scammer Message         │
│  "Send ₹5000 to          │
│   12345678901234         │
│   or your account will   │
│   be blocked"            │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Intelligence Extractor              │
│                                      │
│  STEP 1: Regex Extraction            │
│  ─────────────────────────           │
│  bank_accounts: ["12345678901234"]   │
│  scam_keywords: ["blocked"]          │
│                                      │
│  STEP 2: LLM Extraction              │
│  ─────────────────────────           │
│  Prompt:                             │
│  "Extract forensic intel from:       │
│   'Send ₹5000 to 12345678901234...'" │
│                                      │
│  LLM Response:                       │
│  {                                   │
│    bank_accounts: ["12345678901234"],│
│    behavioral_tactics: [             │
│      "urgency",                      │
│      "fear_of_account_loss"          │
│    ],                                │
│    scam_keywords: ["blocked"]        │
│  }                                   │
│                                      │
│  STEP 3: Deduplication & Merge       │
│  ─────────────────────────           │
│  Combined:                           │
│  {                                   │
│    bank_accounts: ["12345678901234"],│
│    behavioral_tactics: [             │
│      "urgency",                      │
│      "fear_of_account_loss"          │
│    ],                                │
│    scam_keywords: ["blocked"]        │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Update MongoDB          │
│  sessions.extracted_     │
│    intelligence          │
│                          │
│  $set: {                 │
│    "extracted_intel...   │
│      .bank_accounts": [] │
│  }                       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  WebSocket Broadcast     │
│  (if live session)       │
│                          │
│  emit('intelligence_     │
│    update', { ... })     │
└──────────────────────────┘
```

### 6.5 Live Takeover Mode Switching Flow

```
┌──────────────┐
│  Operator    │
│  Dashboard   │
└──────┬───────┘
       │
       │  1. Start Live Session
       ▼
┌──────────────────────────┐
│  POST /api/live/start    │
│  {                       │
│    session_id: "...",    │
│    mode: "ai_only"       │
│  }                       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Session Manager         │
│  create_session()        │
│                          │
│  LiveSessionState:       │
│  - status: ACTIVE        │
│  - mode: AI_ONLY         │
│  - transcriber: STT      │
│  - normalizer: Audio     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  WebSocket Connect       │
│  WS /api/live?           │
│    session_id=...        │
└──────┬───────────────────┘
       │
       │  ═══════════════════════════
       │  2. Mode: AI_ONLY
       │  ═══════════════════════════
       │
       │  Scammer Audio ──► STT ──► AI Agent ──► TTS ──► Play to Scammer
       │  (Fully automated, operator observes)
       │
       │
       │  3. Switch to AI_SUGGESTS
       ▼
┌──────────────────────────┐
│  ws.send({               │
│    type: "mode_change",  │
│    mode: "ai_suggests"   │
│  })                      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Session Manager         │
│  update_mode()           │
│                          │
│  State:                  │
│  - mode: AI_SUGGESTS     │
└──────┬───────────────────┘
       │
       │  ═══════════════════════════
       │  Mode: AI_SUGGESTS
       │  ═══════════════════════════
       │
       │  Scammer Audio ──► STT ──► AI Agent ──► Suggestions to Operator
       │                                       │
       │  Operator Decides ──► Speak/Send ────┘
       │
       │
       │  4. Switch to OPERATOR_ONLY
       ▼
┌──────────────────────────┐
│  ws.send({               │
│    type: "mode_change",  │
│    mode: "operator"      │
│  })                      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Session Manager         │
│  update_mode()           │
│                          │
│  State:                  │
│  - mode: OPERATOR_ONLY   │
└──────┬───────────────────┘
       │
       │  ═══════════════════════════
       │  Mode: OPERATOR_ONLY
       │  ═══════════════════════════
       │
       │  Scammer Audio ──► Operator hears directly
       │  Operator Audio ──► Scammer hears (AI silent)
       │
       │
       │  5. End Session
       ▼
┌──────────────────────────┐
│  POST /api/live/end      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Generate Report         │
│  - Transcript            │
│  - Intelligence          │
│  - Audio Recordings      │
│  - Threat Analysis       │
└──────────────────────────┘
```

---

## 7. Database Schema

### MongoDB Collections

#### 7.1 `sessions` Collection

```javascript
{
  _id: ObjectId("..."),
  session_id: "uuid-string",
  start_time: ISODate("2026-02-19T10:30:00Z"),
  last_updated: ISODate("2026-02-19T10:35:00Z"),
  status: "active",  // "active" | "terminated" | "reported"
  message_count: 12,
  scam_score: 0.85,
  is_confirmed_scam: true,
  
  // Intelligence
  extracted_intelligence: {
    bank_accounts: ["12345678901234", "98765432109876"],
    upi_ids: ["scammer@paytm", "fake@phonepe"],
    phone_numbers: ["9876543210", "8765432109"],
    urls: ["https://phishing-site.com/verify"],
    scam_keywords: ["blocked", "verify", "urgent", "KYC"],
    behavioral_tactics: ["urgency", "authority_impersonation", "fear"]
  },
  
  // Agent state
  agent_state: {
    turn_count: 12,
    sentiment: "fearful",
    last_action: "delay",
    notes: "Scammer claiming to be bank officer"
  },
  
  // Voice
  voice_enabled: true,
  detected_language: "hi",  // Hindi
  voice_mode: "ai_speaks",
  audio_chunk_count: 24,
  total_audio_duration: 180.5,  // seconds
  
  // Metadata
  client_ip: "192.168.1.100",
  language: "en"
}
```

#### 7.2 `messages` Collection

```javascript
{
  _id: ObjectId("..."),
  message_id: "uuid-string",
  session_id: "uuid-string",  // FK to sessions
  sender: "scammer",  // "scammer" | "agent"
  content: "Your bank account has been blocked. Verify KYC immediately.",
  timestamp: ISODate("2026-02-19T10:31:00Z"),
  
  metadata: {
    intent: "verification_demand",
    emotion: "urgent",
    strategy_used: "delay"
  },
  
  // Voice fields
  is_voice: true,
  audio_file_path: "/storage/audio/msg_xyz.wav",
  transcription_confidence: 0.92,
  speech_naturalized: false  // For agent responses
}
```

#### 7.3 `live_calls` Collection (WebRTC)

```javascript
{
  _id: ObjectId("..."),
  call_id: "call-abc123def456",
  operator_name: "Agent Smith",
  metadata: {
    location: "Mumbai",
    device: "Desktop"
  },
  status: "active",  // "waiting" | "active" | "ended"
  connection_type: "webrtc",
  start_time: ISODate("2026-02-19T11:00:00Z"),
  end_time: null,
  
  transcript: [
    {
      speaker: "scammer",
      text: "Hello, I'm calling from State Bank...",
      language: "en",
      confidence: 0.95,
      timestamp: ISODate("2026-02-19T11:01:00Z")
    },
    {
      speaker: "operator",
      text: "Which branch are you calling from?",
      language: "en",
      confidence: 0.98,
      timestamp: ISODate("2026-02-19T11:01:15Z")
    }
  ],
  
  // Intelligence extracted during call
  extracted_intelligence: {
    entities: ["State Bank", "Mumbai"],
    tactics: ["authority_impersonation"],
    threat_score: 0.78
  }
}
```

#### 7.4 `voice_chunks` Collection

```javascript
{
  _id: ObjectId("..."),
  chunk_id: "uuid-string",
  session_id: "uuid-string",  // FK to sessions
  file_path: "/storage/audio/chunks/chunk_001.wav",
  format: "wav",
  sample_rate: 16000,
  duration: 3.5,  // seconds
  sequence_number: 1,
  timestamp: ISODate("2026-02-19T10:31:00Z"),
  processed: true,
  transcription: "Your account has been blocked",
  transcription_confidence: 0.92
}
```

#### 7.5 `voice_clones` Collection (ElevenLabs)

```javascript
{
  _id: ObjectId("..."),
  voice_id: "elevenlabs_voice_id_xyz",
  name: "Mrs. Sharma Voice Clone",
  description: "Cloned voice for elderly persona",
  created_at: ISODate("2026-02-19T09:00:00Z"),
  sample_files: [
    "/storage/voices/sample1.wav",
    "/storage/voices/sample2.wav"
  ],
  status: "ready",  // "processing" | "ready" | "failed"
  character_usage: 15000,  // Characters used (ElevenLabs quota)
  metadata: {
    persona: "elderly_confused",
    language: "hi"
  }
}
```

---

## 8. API Reference

### 8.1 Core APIs

#### Session Management

```
POST /api/session/start
Body: { persona: "elderly_confused", language: "en" }
Response: { session_id: "...", status: "active" }

GET /api/session/{session_id}
Response: { session_id, messages, intelligence, scam_score }

GET /api/sessions?status=active&limit=10
Response: { sessions: [...] }
```

#### Message API

```
POST /api/message
Body: { session_id: "...", content: "Your message" }
Response: { response: "Agent reply", intelligence: {...} }

GET /api/message/history/{session_id}?limit=50
Response: { messages: [...] }
```

#### Voice API

```
POST /api/voice/transcribe
Body: FormData { audio: <file>, format: "webm" }
Response: { transcription: "...", language: "en", confidence: 0.95 }

POST /api/voice/synthesize
Body: { text: "...", voice_id: "..." }
Response: { audio_url: "/audio/synthesized_xxx.mp3" }
```

### 8.2 Live Takeover APIs

#### REST Endpoints

```
POST /api/live/start
Body: { session_id: "...", mode: "ai_only" }
Response: { live_session_id: "...", ws_url: "/api/live" }

POST /api/live/end
Body: { session_id: "..." }
Response: { status: "ended", report_url: "/reports/xxx.pdf" }

GET /api/live/session/{session_id}
Response: { status, mode, transcript, intelligence }
```

#### WebSocket Events (WS `/api/live`)

**Client → Server:**

```javascript
// Join session
{
  type: "join",
  session_id: "..."
}

// Change mode
{
  type: "mode_change",
  mode: "ai_suggests"  // "ai_only" | "ai_suggests" | "operator"
}

// Send operator audio (operator mode)
{
  type: "operator_audio",
  audio: "base64_encoded_audio",
  format: "wav"
}

// Send operator text message
{
  type: "operator_message",
  text: "..."
}
```

**Server → Client:**

```javascript
// Connection established
{
  type: "connected",
  session_id: "...",
  mode: "ai_only"
}

// Transcription (from scammer)
{
  type: "transcription",
  speaker: "scammer",
  text: "...",
  confidence: 0.95,
  timestamp: "..."
}

// AI suggestion (ai_suggests mode)
{
  type: "ai_suggestion",
  suggestions: ["Say X", "Ask Y"],
  recommended_response: "...",
  warning: "Scammer is aggressive"
}

// Intelligence update
{
  type: "intelligence_update",
  data: { bank_accounts: [...], ... }
}

// Audio to play (ai_only mode)
{
  type: "audio_response",
  audio: "base64_encoded_audio",
  format: "mp3",
  text: "..."  // Original text
}
```

### 8.3 WebRTC APIs

#### REST Endpoints

```
POST /api/webrtc/room/create
Headers: { X-API-Key: "..." }
Body: { operator_name: "...", metadata: {...} }
Response: {
  room_id: "call-abc123",
  socket_url: "/socket.io/",
  status: "ready"
}

POST /api/webrtc/room/{room_id}/end
Headers: { X-API-Key: "..." }
Response: { message: "Room ended", room_id: "..." }
```

#### Socket.IO Events (WS `/socket.io/`)

**Client → Server:**

```javascript
// Join room
socket.emit('join_room', {
  room_id: "call-abc123",
  role: "operator"  // or "scammer"
});

// WebRTC offer
socket.emit('webrtc_offer', {
  offer: { type: "offer", sdp: "..." }
});

// WebRTC answer
socket.emit('webrtc_answer', {
  answer: { type: "answer", sdp: "..." }
});

// ICE candidate
socket.emit('ice_candidate', {
  candidate: { ... }
});
```

**Server → Client:**

```javascript
// Connected
socket.on('connected', (data) => {
  // data: { sid: "socket_id" }
});

// Joined room
socket.on('joined_room', (data) => {
  // data: { room_id, role, waiting_for_peer: true/false }
});

// Peer joined
socket.on('peer_joined', (data) => {
  // data: { room_id, message: "..." }
});

// WebRTC offer received
socket.on('webrtc_offer', (data) => {
  // data: { offer: {...}, from: "socket_id" }
});

// WebRTC answer received
socket.on('webrtc_answer', (data) => {
  // data: { answer: {...}, from: "socket_id" }
});

// ICE candidate received
socket.on('ice_candidate', (data) => {
  // data: { candidate: {...}, from: "socket_id" }
});

// Transcription (background)
socket.on('transcription', (data) => {
  // data: { speaker, text, language, confidence, timestamp }
});

// AI coaching (for operator)
socket.on('ai_coaching', (data) => {
  // data: { suggestions: [...], recommended_response, warning }
});

// Peer disconnected
socket.on('peer_disconnected', (data) => {
  // data: { room_id }
});

// Call ended
socket.on('call_ended', (data) => {
  // data: { room_id }
});
```

### 8.4 Voice Clone APIs

```
POST /api/voice-clone/create
Body: FormData {
  name: "Mrs. Sharma",
  description: "...",
  audio_files: [<file1>, <file2>, ...]
}
Response: { voice_id: "...", name: "...", status: "processing" }

GET /api/voice-clone/list
Response: { voices: [{ voice_id, name, category }, ...] }

GET /api/voice-clone/quota
Response: { character_count, character_limit, remaining }

DELETE /api/voice-clone/{voice_id}
Response: { message: "Voice deleted" }
```

---

## 9. Feature Implementation Status

### ✅ Fully Implemented

| Feature | Components | Status |
|---------|-----------|--------|
| **Text Chat** | Frontend: Playground, Backend: message.py, AI Agent | ✅ Production-ready |
| **Voice Chat** | Frontend: VoicePlayground, Backend: voice.py, STT/TTS services | ✅ Production-ready |
| **AI Agent (LangGraph)** | agents/graph.py, prompts, persona, memory | ✅ Production-ready |
| **Intelligence Extraction** | IntelligenceExtractor, regex + LLM | ✅ Production-ready |
| **Scam Detection** | ScamDetector, pattern matching | ✅ Production-ready |
| **Session Management** | sessions.py, MongoDB sessions collection | ✅ Production-ready |
| **Dashboard** | Dashboard.jsx, SessionView.jsx, filters, charts | ✅ Production-ready |
| **Live Takeover (WebSocket)** | LiveTakeoverMode.jsx, live_takeover.py, mode switching | ✅ Production-ready |
| **Live Call (WebSocket)** | LiveCall.jsx, live_call.py, manual audio recording | ✅ Production-ready |
| **Live Call (WebRTC)** | LiveCallWebRTC.jsx, webrtc_signaling.py, P2P audio | ✅ Production-ready |
| **Voice Cloning** | VoiceCloneSetup.jsx, voice_clone.py, ElevenLabs integration | ✅ Production-ready |
| **PWA** | Service Worker, manifest, install prompt | ✅ Production-ready |
| **Mobile App** | Capacitor iOS/Android projects, mobile UI | ✅ Production-ready |
| **URL Scanning** | url_scanner.py, VirusTotal API | ✅ Production-ready |
| **Report Generation** | report_generator.py, PDF/JSON reports | ✅ Production-ready |
| **WebRTC Audio Transcription** | WebRTC audio capture (`webrtc.js` fixed) + Groq Whisper API live transcription (`streaming_stt.py`) | ✅ Fixed (Feb 20 2026) |

### 🔄 Partially Implemented

| Feature | What's Done | What's Missing | Priority |
|---------|-------------|----------------|----------|
| **Cloud Storage** | Local file storage works | S3/Cloudflare R2 integration | 🟡 Medium |
| **Analytics** | Basic session metrics | Advanced analytics, heatmaps, funnel analysis | 🟢 Low |

### ⏳ Not Started

| Feature | Description | Priority |
|---------|-------------|----------|
| **Real-time Collaboration** | Multiple operators monitoring same session | 🟢 Low |
| **Advanced Reporting** | Custom report templates, scheduled reports | 🟡 Medium |
| **Multi-language UI** | Frontend i18n for Hindi, Bengali, etc. | 🟡 Medium |
| **Admin Dashboard** | User management, system settings | 🟡 Medium |
| **Rate Limiting** | API rate limiting, abuse prevention | 🟢 Low |
| **Monitoring & Alerts** | Sentry, Datadog, Slack alerts | 🟡 Medium |
| **A/B Testing** | Test different personas, strategies | 🟢 Low |

---

## 10. Security & Authentication

### 10.1 Authentication

**Current Implementation:**

```python
# core/auth.py
async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.API_SECRET_KEY:
        raise HTTPException(401, "Invalid API Key")
    return x_api_key
```

**Usage:**

```python
@router.post("/api/message")
async def send_message(
    request: MessageRequest,
    api_key: str = Depends(verify_api_key)
):
    # Protected endpoint
    pass
```

**⚠️ Production Recommendations:**

1. **JWT Authentication**: Replace hardcoded API key with JWT tokens
2. **OAuth 2.0**: For operator dashboard login
3. **API Rate Limiting**: Implement Redis-based rate limiting
4. **IP Whitelisting**: Restrict admin endpoints to specific IPs

### 10.2 Data Security

| Layer | Current Status | Production Recommendation |
|-------|----------------|---------------------------|
| **Data in Transit** | HTTP (dev), HTTPS (prod) | ✅ Enforce HTTPS, TLS 1.3 |
| **Data at Rest** | MongoDB (no encryption) | ⚠️ Enable MongoDB encryption at rest |
| **Audio Files** | Local filesystem | ⚠️ Encrypt sensitive audio files |
| **API Keys** | .env file | ✅ Use secrets manager (AWS Secrets, Vault) |
| **Logs** | Stdout (plain text) | ⚠️ Redact sensitive data, use structured logging |

### 10.3 Privacy Considerations

**GDPR/Data Protection:**

- **Data Minimization**: Only store essential scam intelligence
- **Right to Erasure**: Implement session deletion API
- **Audit Logs**: Track who accessed what data when
- **Data Retention**: Auto-delete sessions after 90 days

**Scammer Privacy:**

⚠️ **Ethical Note**: While engaging with scammers, we must:
1. Not use collected data for purposes beyond scam detection
2. Anonymize data when sharing with law enforcement
3. Secure storage to prevent unauthorized access

---

## 11. Deployment Architecture

### 11.1 Current Deployment (Dev/Staging)

```
┌─────────────────────────────────────────┐
│          Local Development              │
│                                         │
│  ┌───────────────┐  ┌────────────────┐ │
│  │  Frontend     │  │  Backend       │ │
│  │  Vite Dev     │  │  uvicorn       │ │
│  │  :5173        │  │  :8000         │ │
│  └───────────────┘  └────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  MongoDB (Local or Atlas)          │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 11.2 Production Deployment (Recommended)

```
┌──────────────────────────────────────────────────────────────┐
│                          CLOUDFLARE CDN                       │
│  (Static Asset Caching, DDoS Protection, SSL/TLS)            │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
   ┌─────▼──────┐                ┌──────▼─────┐
   │  Frontend  │                │  Backend   │
   │  (Vercel)  │                │  (Render)  │
   │            │                │            │
   │  - React   │                │  - FastAPI │
   │  - PWA     │                │  - Python  │
   │  - Static  │                │  - Uvicorn │
   └────────────┘                └──────┬─────┘
                                        │
            ┌───────────────────────────┼───────────────────┐
            │                           │                   │
      ┌─────▼──────┐         ┌──────────▼───────┐  ┌──────▼──────┐
      │  MongoDB   │         │  Cloudflare R2   │  │  External   │
      │  Atlas     │         │  (Audio Storage) │  │  APIs       │
      │            │         │                  │  │             │
      │  - Replica │         │  - S3-compatible │  │  - Groq     │
      │  - Backups │         │  - CDN           │  │  - Gemini   │
      └────────────┘         └──────────────────┘  │  - 11Labs   │
                                                   │  - VT       │
                                                   └─────────────┘
```

### 11.3 Infrastructure Components

| Component | Dev | Production | Purpose |
|-----------|-----|------------|---------|
| **Frontend Hosting** | Vite Dev Server | Vercel / Netlify | React app hosting |
| **Backend Hosting** | Local uvicorn | Render / Railway / Fly.io | FastAPI server |
| **Database** | Local MongoDB / Atlas Free | MongoDB Atlas (M10+) | Data persistence |
| **File Storage** | Local filesystem | Cloudflare R2 / AWS S3 | Audio files, reports |
| **CDN** | None | Cloudflare | Static assets, caching |
| **Domain** | localhost | Custom domain + SSL | honeybadbadger.com |
| **Monitoring** | Console logs | Sentry / Datadog | Error tracking, APM |

### 11.4 Environment Variables

**Backend (.env):**

```bash
# App
APP_NAME=HoneyBadger
DEBUG=false
API_SECRET_KEY=<strong-secret-key>

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=honeypot_production

# AI Providers
GROQ_API_KEY=<groq-key>
GEMINI_API_KEY=<gemini-key>

# Voice
ELEVENLABS_API_KEY=<elevenlabs-key>
ELEVENLABS_MODEL=eleven_turbo_v2_5

# Security
VIRUSTOTAL_API_KEY=<vt-key>

# Callbacks
GUVI_CALLBACK_URL=https://hackathon.guvi.in/api/...

# Storage (Production)
S3_BUCKET=honeybadger-audio
S3_REGION=us-east-1
S3_ACCESS_KEY=<aws-access-key>
S3_SECRET_KEY=<aws-secret-key>
```

**Frontend (.env):**

```bash
# Production API
VITE_API_BASE_URL=https://api.honeybadger.com/api
VITE_WS_BASE_URL=wss://api.honeybadger.com/api
VITE_SOCKET_URL=https://api.honeybadger.com
VITE_API_SECRET_KEY=<client-key>
```

---

## 12. Integration Points

### 12.1 External APIs

| Service | Provider | Purpose | API Docs | Status |
|---------|----------|---------|----------|--------|
| **LLM (Primary)** | Groq | Llama 3.3-70B for agent reasoning | [groq.com/docs](https://console.groq.com/docs) | ✅ Integrated |
| **LLM (Fallback)** | Google AI | Gemini 1.5 Flash | [ai.google.dev](https://ai.google.dev/) | ✅ Integrated |
| **Voice Cloning** | ElevenLabs | Voice synthesis & cloning | [elevenlabs.io/docs](https://elevenlabs.io/docs) | ✅ Integrated |
| **STT** | Local Whisper | faster-whisper (systran) | [github.com/SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | ✅ Integrated |
| **URL Scanning** | VirusTotal | Malicious URL detection | [virustotal.com/api](https://developers.virustotal.com/) | ✅ Integrated |
| **Webhooks** | GUVI Hackathon | Result submission | Custom endpoint | ✅ Integrated |

### 12.2 Third-Party Libraries

**Backend:**

```python
# requirements.txt (Key Dependencies)
fastapi==0.110.0
uvicorn[standard]==0.27.1
motor==3.3.2  # Async MongoDB
pydantic==2.6.1
langchain==0.1.6
langchain-groq==0.0.1
langchain-google-genai==0.0.6
langgraph==0.0.20
faster-whisper==1.0.0
pydub==0.25.1
python-socketio==5.11.0
websockets==12.0
httpx==0.26.0  # Async HTTP client
```

**Frontend:**

```json
// package.json (Key Dependencies)
{
  "react": "^18.3.1",
  "react-router-dom": "^7.1.2",
  "vite": "^7.3.1",
  "tailwindcss": "^4.0.3",
  "framer-motion": "^12.23.12",
  "recharts": "^2.15.1",
  "react-leaflet": "^5.0.0",
  "socket.io-client": "^4.8.1",
  "@capacitor/core": "^6.2.0"
}
```

### 12.3 WebRTC STUN/TURN Servers

**Current Configuration:**

```javascript
// webrtc.js
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

**🔴 Production Requirement:**

WebRTC requires TURN servers for NAT traversal. Free STUN servers work for development, but production needs TURN:

**Option 1: Twilio TURN**
```javascript
{
  urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
  username: '<twilio-username>',
  credential: '<twilio-credential>'
}
```

**Option 2: Self-hosted (coturn)**
```bash
docker run -d --network=host \
  -e TURN_USERNAME=user \
  -e TURN_PASSWORD=pass \
  coturn/coturn
```

---

## 13. Future Roadmap

### Phase 1: Core Stability (Q1 2026) ✅ COMPLETE

- [x] AI agent implementation
- [x] Voice interaction
- [x] Intelligence extraction
- [x] Live takeover
- [x] WebRTC live calling
- [x] PWA & mobile apps

### Phase 2: Production Readiness (Q2 2026) 🔄 IN PROGRESS

- [ ] Cloud deployment (Vercel + Render)
- [ ] S3/R2 audio storage
- [ ] TURN server setup
- [ ] JWT authentication
- [ ] Monitoring & alerts (Sentry)
- [ ] Rate limiting
- [ ] Advanced analytics

### Phase 3: Scale & Optimize (Q3 2026) ⏳ PLANNED

- [ ] Redis caching layer
- [ ] Message queue (RabbitMQ/Celery)
- [ ] Load balancing (multiple backend instances)
- [ ] Database sharding
- [ ] CDN optimization
- [ ] A/B testing framework

### Phase 4: Advanced Features (Q4 2026) ⏳ PLANNED

- [ ] Multi-operator collaboration
- [ ] Real-time dashboard for law enforcement
- [ ] Advanced persona builder (no-code)
- [ ] Voice emotion detection
- [ ] Predictive scam type classification
- [ ] Blockchain evidence timestamping
- [ ] Integration with police databases

### Phase 5: AI Enhancements (2027) 💡 IDEAS

- [ ] Fine-tuned LLM for Indian scam patterns
- [ ] Voice cloning with emotion control
- [ ] Multi-modal AI (analyze images sent by scammers)
- [ ] Automated scam call routing
- [ ] Real-time language translation (English ↔ Hindi)
- [ ] Deepfake detection for video scams

---

## 14. Known Issues & Limitations

### Current Issues

| Issue | Impact | Resolution | Status |
|-------|--------|------------|--------|
| ~~**Audio chunks not sent to backend in WebRTC**~~ | ~~No transcription during P2P calls~~ | Fixed Feb 20 2026 — `webrtc.js` now calls `_startLocalAudioCapture()` on peer connect; uses stop/restart cycle instead of `MediaRecorder` timeslice to produce decodable WebM blobs | ✅ Resolved |
| ~~**Local Whisper OOM on Render.com**~~ | ~~Live call transcription fails on cloud deployment~~ | Fixed Feb 20 2026 — `StreamingTranscriber` now uses Groq Whisper API (`whisper-large-v3-turbo`); `stt_service.py` (local Whisper) unchanged for AI-only calls | ✅ Resolved |
| **No cloud storage** | Audio files stored locally | Works for dev, not scalable | 🟡 Medium |
| **Hardcoded API key** | Security risk | Use environment variable | 🔴 High |
| **No rate limiting** | Vulnerable to abuse | Monitor usage | 🟡 Medium |
| **React 18 vs React 19** | Dev warning (react-leaflet) | Used --legacy-peer-deps | 🟢 Low |

### Limitations

| Limitation | Description | Mitigation |
|------------|-------------|------------|
| **Groq Whisper Latency** | API call ~0.5–1 s per 2.5 s chunk | Acceptable; chunk buffer absorbs round-trip |
| **LLM Latency** | Groq response: 0.5-2 seconds | Acceptable for chat, cache common responses |
| **WebRTC NAT Traversal** | Fails without TURN server | Deploy TURN server in production |
| **Single Backend Instance** | No horizontal scaling | Use load balancer + multiple instances |
| **File Storage Limit** | Local disk fills up | Implement auto-cleanup, use cloud storage |

---

## 15. Development Guidelines

### 15.1 Code Structure Principles

1. **Separation of Concerns**: API → Service → Data Access
2. **Dependency Injection**: Use FastAPI's `Depends()` for services
3. **Async First**: All I/O operations use `async/await`
4. **Type Safety**: Pydantic models for validation, type hints everywhere
5. **Error Handling**: Try-except with logging, return meaningful errors

### 15.2 Naming Conventions

**Backend (Python):**
- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case()`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_leading_underscore()`

**Frontend (JavaScript):**
- Files: `PascalCase.jsx` (components), `camelCase.js` (utilities)
- Components: `PascalCase`
- Functions: `camelCase()`
- Constants: `UPPER_SNAKE_CASE`
- Hooks: `useCamelCase()`

### 15.3 Testing Strategy (Not Yet Implemented)

**Recommended Testing Pyramid:**

```
   ┌─────────────┐
   │  E2E Tests  │  5% (Playwright, Cypress)
   └─────────────┘
      ┌──────────────┐
      │ Integration  │  20% (FastAPI TestClient, React Testing Library)
      └──────────────┘
         ┌──────────────────┐
         │   Unit Tests     │  75% (pytest, jest)
         └──────────────────┘
```

**Test Files to Create:**

```
honeypot/backend/
  tests/
    test_api_message.py
    test_agent_graph.py
    test_intelligence_extractor.py
    test_webrtc_signaling.py

honeypot/frontend/
  src/
    __tests__/
      components/
        MessageBubble.test.jsx
      hooks/
        useWebRTC.test.js
      services/
        webrtc.test.js
```

### 15.4 Contribution Workflow

1. **Create feature branch**: `git checkout -b feature/voice-emotion-detection`
2. **Implement feature**: Follow code structure, add type hints
3. **Write tests**: Unit + integration tests
4. **Update docs**: Add to ARCHITECTURE.md if architectural change
5. **Submit PR**: Include description, screenshots, test results
6. **Code review**: Address feedback, merge

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **Honeypot** | Decoy system designed to attract and engage attackers |
| **LangGraph** | Framework for building stateful, graph-based LLM agents |
| **Whisper** | OpenAI's speech-to-text model. Used via **Groq Whisper API** (`whisper-large-v3-turbo`) for live/WebRTC calls; local `faster-whisper` retained for AI-agent calls |
| **ElevenLabs** | AI voice synthesis and cloning service |
| **WebRTC** | Web Real-Time Communication (P2P audio/video) |
| **Socket.IO** | Real-time bidirectional event-based communication |
| **STUN Server** | Session Traversal Utilities for NAT (helps WebRTC peer discovery) |
| **TURN Server** | Traversal Using Relays around NAT (relays WebRTC traffic when P2P fails) |
| **ICE Candidate** | Interactive Connectivity Establishment (network path for WebRTC) |
| **PWA** | Progressive Web App (web app with native-like features) |
| **Capacitor** | Native runtime for building iOS/Android apps from web code |
| **Pydantic** | Python data validation using type hints |
| **Motor** | Async MongoDB driver for Python |
| **Uvicorn** | ASGI server for running FastAPI |
| **Vite** | Fast build tool for modern web projects |

---

## 17. Conclusion

HoneyBadger is a **production-ready AI honeypot system** with advanced features for scam engagement, intelligence extraction, and live operator assistance. The architecture is modular, scalable, and built on modern technologies.

### Key Strengths

✅ **Multi-modal AI Agent**: Text + Voice interaction with LangGraph  
✅ **Real-time Communication**: WebSocket + WebRTC for live takeovers  
✅ **Forensic Intelligence**: Automated extraction of scam evidence  
✅ **Mobile-First**: PWA + native apps for field operators  
✅ **Extensible**: Clean separation of concerns, easy to add features  

### Immediate Priorities

✅ **Resolved**: WebRTC audio chunk routing fixed in `webrtc.js` (Feb 20 2026)  
✅ **Resolved**: Live call transcription now uses Groq Whisper API — no local model RAM required (Feb 20 2026)  
🔴 **High**: Deploy TURN server for production WebRTC  
🟡 **Medium**: Migrate to cloud storage (S3/R2)  
🟡 **Medium**: Add JWT authentication  

### Long-term Vision

HoneyBadger aims to become the **industry standard for proactive scam detection and evidence collection**, providing law enforcement with real-time intelligence and reducing the impact of cybercrime on vulnerable populations.

---

**Last Updated**: February 20, 2026  
**Maintained By**: HoneyBadger Development Team  
**License**: Proprietary (GUVI Hackathon Project)

For questions or contributions, contact: [team@honeybadger.dev](mailto:team@honeybadger.dev)
