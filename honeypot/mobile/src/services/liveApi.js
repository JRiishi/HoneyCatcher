import api from './api';

const WS_BASE = process.env.EXPO_PUBLIC_WS_BASE_URL || 'wss://honeycatcher.onrender.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_SECRET_KEY || 'unsafe-secret-key-change-me';

class LiveService {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.pingInterval = null;
  }

  // REST endpoints
  async startSession(originalSessionId, mode = 'ai_takeover', voiceCloneId = null, language = 'en') {
    return api.post('/live/start', {
      original_session_id: originalSessionId,
      mode,
      voice_clone_id: voiceCloneId,
      language,
    });
  }

  async switchMode(sessionId, newMode) {
    return api.post('/live/switch-mode', { session_id: sessionId, new_mode: newMode });
  }

  async getStatus(sessionId) {
    return api.get(`/live/status/${sessionId}`);
  }

  async endSession(sessionId) {
    return api.post(`/live/end/${sessionId}`);
  }

  async getReport(sessionId, format = 'json') {
    return api.post('/live/report', { session_id: sessionId, format });
  }

  // Voice clone endpoints
  async createVoiceClone(name, description, audioFiles) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    audioFiles.forEach((file, i) => {
      formData.append('audio_files', {
        uri: file.uri,
        name: file.name || `audio_${i}.wav`,
        type: file.mimeType || 'audio/wav',
      });
    });
    return api.postForm('/voice-clone/create', formData);
  }

  async listVoiceClones() {
    return api.get('/voice-clone/list');
  }

  // Aliases used by screens
  async listVoices() {
    const res = await this.listVoiceClones();
    return res?.data || res;
  }

  async getVoiceQuota() {
    const res = await this.getVoiceCloneQuota();
    return res?.data || res;
  }

  async previewVoiceClone(voiceId, text) {
    const formData = new FormData();
    formData.append('voice_id', voiceId);
    formData.append('text', text);
    return api.postForm('/voice-clone/preview', formData);
  }

  async deleteVoiceClone(voiceId) {
    return api.delete(`/voice-clone/${voiceId}`);
  }

  async getVoiceCloneQuota() {
    return api.get('/voice-clone/quota');
  }

  // WebSocket connection
  connect(sessionId) {
    const wsUrl = `${WS_BASE}/live/connect/${sessionId}?api_key=${API_KEY}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this._emit('connected', { sessionId });
      this.pingInterval = setInterval(() => {
        this.send({ type: 'ping' });
      }, 25000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit(data.type, data);
      } catch (e) {
        console.error('[LiveAPI] WS parse error:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[LiveAPI] WS error:', error);
      this._emit('error', { error: error.message || 'WebSocket error' });
    };

    this.ws.onclose = (event) => {
      clearInterval(this.pingInterval);
      this._emit('disconnected', { code: event.code, reason: event.reason });
    };
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendAudioChunk(base64Audio, format = 'webm') {
    this.send({ type: 'audio_chunk', data: base64Audio, format });
  }

  sendTextInput(text) {
    this.send({ type: 'text_input', text });
  }

  sendModeSwitch(mode) {
    this.send({ type: 'mode_switch', mode });
  }

  disconnect() {
    clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers = {};
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
    return () => {
      this.handlers[event] = this.handlers[event].filter((h) => h !== handler);
    };
  }

  _emit(event, data) {
    (this.handlers[event] || []).forEach((h) => h(data));
  }
}

export default new LiveService();
