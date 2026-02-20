/**
 * useLiveCall hook — Manages Socket.IO connection for real-time AI assistance
 * while the actual phone call happens through the native dialer.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import LiveCallService from '../services/webrtc';

export default function useWebRTC() {
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [aiCoaching, setAiCoaching] = useState([]);
  const [intelligence, setIntelligence] = useState({
    entities: [],
    threatLevel: 0,
    tactics: [],
  });
  const [aiMode, setAiModeState] = useState('ai_suggests');
  const [aiError, setAiError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const serviceRef = useRef(null);
  const soundRef = useRef(null);

  // Play AI audio response
  const playAudioResponse = useCallback(async (base64Audio) => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}ai_response_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      });
    } catch (err) {
      console.error('[useLiveCall] Audio playback error:', err);
    }
  }, []);

  const connect = useCallback(async (roomId, role = 'operator') => {
    try {
      const service = new LiveCallService();
      serviceRef.current = service;

      // Register event handlers
      service.on('connectionStateChange', ({ state }) => {
        setConnectionState(state);
        setIsConnected(state === 'connected');
      });

      service.on('peer_connected', () => setIsPeerConnected(true));
      service.on('peer_joined', () => setIsPeerConnected(true));
      service.on('peer_disconnected', () => setIsPeerConnected(false));

      service.on('transcription', (data) => {
        setTranscripts((prev) => [
          ...prev,
          {
            speaker: data.speaker,
            text: data.text,
            language: data.language,
            timestamp: data.timestamp || new Date().toISOString(),
            confidence: data.confidence,
          },
        ]);
      });

      service.on('ai_coaching', (data) => {
        setAiCoaching(data);
        setAiError(null);
      });

      service.on('intelligence_update', (data) => {
        setIntelligence((prev) => ({
          entities: data.entities || prev.entities,
          threatLevel: data.threat_level ?? prev.threatLevel,
          tactics: data.tactics || prev.tactics,
        }));
      });

      service.on('audio_response', (data) => {
        if (data.text) {
          setTranscripts((prev) => [
            ...prev,
            { speaker: 'ai', text: data.text, timestamp: new Date().toISOString() },
          ]);
        }
        if (data.audio) {
          playAudioResponse(data.audio);
        }
      });

      service.on('ai_error', (data) => {
        setAiError(data.error || data.text || 'AI error occurred');
        setAiModeState('ai_suggests');
      });

      service.on('ai_mode_changed', ({ mode }) => setAiModeState(mode));
      service.on('call_ended', () => setConnectionState('ended'));
      service.on('muteChanged', ({ isMuted: muted }) => setIsMuted(muted));
      service.on('error', ({ message }) => setError(message));

      await service.connect(roomId, role);
      setIsConnected(true);
      setConnectionState('connected');
    } catch (err) {
      console.error('[useLiveCall] Connect error:', err);
      setError(err.message);
    }
  }, [playAudioResponse]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsConnected(false);
    setIsPeerConnected(false);
    setConnectionState('disconnected');
  }, []);

  const toggleMute = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.toggleMute();
    }
  }, []);

  const setAiMode = useCallback((mode) => {
    if (serviceRef.current) {
      serviceRef.current.setAiMode(mode);
    }
    setAiModeState(mode);
  }, []);

  /** Open native phone dialer */
  const makeNativeCall = useCallback(async (phoneNumber) => {
    try {
      await LiveCallService.makeNativeCall(phoneNumber);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    isConnected,
    isPeerConnected,
    connectionState,
    error,
    transcripts,
    aiCoaching,
    intelligence,
    aiMode,
    aiError,
    isMuted,
    setAiMode,
    connect,
    disconnect,
    toggleMute,
    makeNativeCall,
  };
}
