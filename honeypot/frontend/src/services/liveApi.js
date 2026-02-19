/**
 * Live Takeover WebSocket Service
 * Manages real-time connection for live scam engagement.
 */

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api';
const API_KEY = import.meta.env.VITE_API_SECRET_KEY || 'unsafe-secret-key-change-me';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class LiveTakeoverService {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
  }

  // ── Event System ─────────────────────────────────────────

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Event handler error (${event}):`, e); }
    });
  }

  // ── REST API Calls ───────────────────────────────────────

  async startSession({ originalSessionId, mode = 'ai_takeover', voiceCloneId, language = 'en' }) {
    const res = await fetch(`${API_BASE}/live/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        original_session_id: originalSessionId,
        mode,
        voice_clone_id: voiceCloneId,
        language
      })
    });

    if (!res.ok) throw new Error(`Start session failed: ${res.status}`);
    return res.json();
  }

  async switchMode(sessionId, newMode) {
    const res = await fetch(`${API_BASE}/live/switch-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ session_id: sessionId, new_mode: newMode })
    });
    if (!res.ok) throw new Error(`Switch mode failed: ${res.status}`);
    return res.json();
  }

  async getSessionStatus(sessionId) {
    const res = await fetch(`${API_BASE}/live/status/${sessionId}`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) throw new Error(`Get status failed: ${res.status}`);
    return res.json();
  }

  async endSession(sessionId) {
    const res = await fetch(`${API_BASE}/live/end/${sessionId}`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) throw new Error(`End session failed: ${res.status}`);
    return res.json();
  }

  async generateReport(sessionId, format = 'json') {
    const res = await fetch(`${API_BASE}/live/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ session_id: sessionId, format })
    });

    if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);

    if (format === 'pdf' || format === 'csv') {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${sessionId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      return { status: 'downloaded' };
    }

    return res.json();
  }

  // ── Voice Clone API ──────────────────────────────────────

  async createVoiceClone(name, description, audioFiles) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    audioFiles.forEach(file => formData.append('audio_files', file));

    const res = await fetch(`${API_BASE}/voice-clone/create`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: formData
    });
    if (!res.ok) throw new Error(`Voice clone creation failed: ${res.status}`);
    return res.json();
  }

  async listVoices() {
    const res = await fetch(`${API_BASE}/voice-clone/list`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) throw new Error(`List voices failed: ${res.status}`);
    return res.json();
  }

  async previewVoice(voiceId, text) {
    const formData = new FormData();
    formData.append('voice_id', voiceId);
    formData.append('text', text);

    const res = await fetch(`${API_BASE}/voice-clone/preview`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: formData
    });
    if (!res.ok) throw new Error(`Voice preview failed: ${res.status}`);
    return res.json();
  }

  async deleteVoice(voiceId) {
    const res = await fetch(`${API_BASE}/voice-clone/${voiceId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) throw new Error(`Delete voice failed: ${res.status}`);
    return res.json();
  }

  async getVoiceQuota() {
    const res = await fetch(`${API_BASE}/voice-clone/quota`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) throw new Error(`Get quota failed: ${res.status}`);
    return res.json();
  }

  // ── WebSocket Connection ─────────────────────────────────

  connect(sessionId) {
    this.sessionId = sessionId;
    this.reconnectAttempts = 0;

    const url = `${WS_BASE}/live/connect/${sessionId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[LiveTakeover] WebSocket connected');
      this.emit('connected', { sessionId });
      this._startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleMessage(msg);
      } catch (e) {
        console.error('[LiveTakeover] Invalid message:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[LiveTakeover] WebSocket closed:', event.code, event.reason);
      this._stopPing();
      this.emit('disconnected', { code: event.code, reason: event.reason });

      if (event.code !== 1000 && event.code !== 4004) {
        this._attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[LiveTakeover] WebSocket error:', error);
      this.emit('error', { error });
    };
  }

  disconnect() {
    this._stopPing();
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.sessionId = null;
  }

  // ── Send Messages ────────────────────────────────────────

  sendAudioChunk(base64Data, format = 'wav') {
    this._send({
      type: 'audio_chunk',
      data: base64Data,
      format
    });
  }

  sendModeSwitch(mode) {
    this._send({
      type: 'mode_switch',
      mode
    });
  }

  sendTextInput(text) {
    this._send({
      type: 'text_input',
      text
    });
  }

  // ── Internal ─────────────────────────────────────────────

  _send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[LiveTakeover] WebSocket not connected, cannot send');
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        this.emit('session_info', msg);
        break;
      case 'transcription':
        this.emit('transcription', msg);
        break;
      case 'ai_response':
        this.emit('ai_response', msg);
        break;
      case 'coaching_scripts':
        this.emit('coaching_scripts', msg);
        break;
      case 'intelligence_update':
        this.emit('intelligence', msg.data);
        break;
      case 'threat_update':
        this.emit('threat', msg);
        break;
      case 'url_scan_result':
        this.emit('url_scan', msg.data);
        break;
      case 'mode_switched':
        this.emit('mode_switched', msg);
        break;
      case 'session_ended':
        this.emit('session_ended', msg);
        break;
      case 'pong':
        break;
      case 'error':
        this.emit('error', msg);
        break;
      default:
        console.log('[LiveTakeover] Unknown message type:', msg.type);
    }
  }

  _startPing() {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      this._send({ type: 'ping' });
    }, 30000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[LiveTakeover] Max reconnect attempts reached');
      this.emit('reconnect_failed', {});
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[LiveTakeover] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  get isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export const liveService = new LiveTakeoverService();
export default liveService;
