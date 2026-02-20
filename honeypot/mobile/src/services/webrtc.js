/**
 * Live Call Service — Uses Socket.IO for real-time AI assistance
 * and the system's native dialer for actual phone calls.
 * No WebRTC native module required.
 */
import { io } from 'socket.io-client';
import { Linking, Platform } from 'react-native';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://honeycatcher.onrender.com';

class LiveCallService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.role = null;
    this.aiMode = 'ai_suggests';
    this.handlers = {};
    this.isConnected = false;
    this.isPeerConnected = false;
    this.isMuted = false;
  }

  /**
   * Open the system's native phone dialer with the given number.
   * The actual call happens through the phone app.
   */
  static async makeNativeCall(phoneNumber) {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const url = Platform.OS === 'android' ? `tel:${cleaned}` : `telprompt:${cleaned}`;
    try {
      await Linking.openURL(url);
      return true;
    } catch (err) {
      console.warn('[LiveCallService] Could not open dialer:', err);
      throw new Error('Phone dialer is not available on this device');
    }
  }

  /**
   * Connect Socket.IO to the backend for real-time AI services
   * (transcription, coaching, intelligence extraction).
   * The call audio itself goes through the native phone app.
   */
  async connect(roomId, role = 'operator') {
    this.roomId = roomId;
    this.role = role;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this._setupSocketHandlers();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this._emit('connectionStateChange', { state: 'connected' });
        this.socket.emit('join_room', { room_id: roomId, role });
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        this._emit('error', { message: err.message || 'Connection failed' });
        reject(err);
      });
    });
  }

  _setupSocketHandlers() {
    this.socket.on('joined_room', (data) => this._emit('joined_room', data));

    this.socket.on('peer_joined', () => {
      this.isPeerConnected = true;
      this._emit('peer_joined', {});
      this._emit('peer_connected', {});
    });

    this.socket.on('peer_disconnected', () => {
      this.isPeerConnected = false;
      this._emit('peer_disconnected', {});
    });

    // Real-time AI services via Socket.IO
    this.socket.on('transcription', (data) => this._emit('transcription', data));
    this.socket.on('ai_coaching', (data) => this._emit('ai_coaching', data));
    this.socket.on('intelligence_update', (data) => this._emit('intelligence_update', data));
    this.socket.on('audio_response', (data) => this._emit('audio_response', data));
    this.socket.on('ai_error', (data) => this._emit('ai_error', data));
    this.socket.on('call_ended', (data) => this._emit('call_ended', data));

    this.socket.on('ai_mode_changed', (data) => {
      this.aiMode = data.mode;
      this._emit('ai_mode_changed', data);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this._emit('connectionStateChange', { state: 'disconnected' });
    });

    this.socket.on('reconnect', () => {
      this.isConnected = true;
      this._emit('connectionStateChange', { state: 'connected' });
      this.socket.emit('join_room', { room_id: this.roomId, role: this.role });
    });
  }

  setAiMode(mode) {
    this.aiMode = mode;
    if (this.socket) {
      this.socket.emit('set_ai_mode', { room_id: this.roomId, mode });
    }
    this._emit('ai_mode_changed', { mode });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this._emit('muteChanged', { isMuted: this.isMuted });
    return this.isMuted;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isPeerConnected = false;
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

export default LiveCallService;
