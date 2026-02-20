/**
 * useWebRTC Hook - React hook for WebRTC P2P audio streaming
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import WebRTCService from '../services/webrtc';

export const useWebRTC = (roomId, role = 'operator') => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [aiCoaching, setAICoaching] = useState(null);
  const [intelligence, setIntelligence] = useState({ entities: [], threatLevel: 0, tactics: [] });
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  const webrtcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const statsIntervalRef = useRef(null);
  
  /**
   * Initialize WebRTC connection
   */
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Create WebRTC service
      if (!webrtcRef.current) {
        webrtcRef.current = new WebRTCService();
        
        // Setup callbacks
        webrtcRef.current.onRemoteStream = (stream) => {
          console.log('🎵 Remote stream received in hook');
          console.log('📊 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
          setRemoteStream(stream);
        };
        
        webrtcRef.current.onTranscription = (data) => {
          console.log('📝 Transcription received in hook:', data);
          setTranscripts(prev => {
            const updated = [...prev, data];
            console.log(`📋 Total transcripts now: ${updated.length}`);
            return updated;
          });
        };
        
        webrtcRef.current.onAICoaching = (data) => {
          console.log('🤖 AI Coaching received:', data);
          setAICoaching(data);
        };
        
        webrtcRef.current.onIntelligenceUpdate = (data) => {
          console.log('🔍 Intelligence update received:', data);
          setIntelligence(prev => ({
            entities: [...prev.entities, ...(data.entities || [])],
            threatLevel: data.threat_level ?? prev.threatLevel,
            tactics: [...prev.tactics, ...(data.tactics || [])]
          }));
        };
        
        webrtcRef.current.onPeerJoined = () => {
          setIsPeerConnected(true);
        };
        
        webrtcRef.current.onPeerDisconnected = () => {
          setIsPeerConnected(false);
        };
        
        webrtcRef.current.onConnectionStateChange = (state) => {
          setConnectionState(state);
          
          if (state === 'connected') {
            setIsPeerConnected(true);
            
            // Start stats monitoring
            if (!statsIntervalRef.current) {
              statsIntervalRef.current = setInterval(async () => {
                const stats = await webrtcRef.current?.getStats();
                if (stats) {
                  setStats(stats);
                }
              }, 2000);
            }
          } else if (state === 'disconnected' || state === 'failed') {
            setIsPeerConnected(false);
            
            // Stop stats monitoring
            if (statsIntervalRef.current) {
              clearInterval(statsIntervalRef.current);
              statsIntervalRef.current = null;
            }
          }
        };
      }
      
      // Connect to room
      await webrtcRef.current.connect(roomId, role);
      
      // Store local stream
      setLocalStream(webrtcRef.current.localStream);
      setIsConnected(true);
      
    } catch (err) {
      console.error('❌ WebRTC connection error:', err);
      setError(err.message || 'Failed to connect');
      setIsConnected(false);
    }
  }, [roomId, role]);
  
  /**
   * Disconnect WebRTC
   */
  const disconnect = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.disconnect();
      webrtcRef.current = null;
    }
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setIsPeerConnected(false);
    setConnectionState('disconnected');
    setRemoteStream(null);
    setLocalStream(null);
    setStats(null);
  }, []);
  
  /**
   * Toggle local audio mute
   */
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return muted state
      }
    }
    return false;
  }, [localStream]);
  
  /**
   * Check if local audio is muted
   */
  const isMuted = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : true;
    }
    return true;
  }, [localStream]);
  
  /**
   * Get audio volume level (for visualization)
   */
  const getAudioLevel = useCallback(() => {
    if (!localStream) return 0;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      return average / 255; // Normalize to 0-1
      
    } catch (error) {
      console.error('Failed to get audio level:', error);
      return 0;
    }
  }, [localStream]);
  
  /**
   * Manual connect - disabled auto-connect to avoid premature getUserMedia
   * Call connect() explicitly after user interaction
   */
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  /**
   * Handle remote stream playback
   */
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      console.log('🔊 Setting up remote audio playback');
      console.log('📊 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled} (${t.readyState})`));
      
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Ensure audio element is properly configured
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.playsInline = true;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      
      // Try to play
      remoteAudioRef.current.play()
        .then(() => {
          console.log('✅ Remote audio playing successfully');
        })
        .catch(e => {
          console.error('❌ Failed to play remote audio:', e);
          console.log('ℹ️ User interaction may be required to play audio');
        });
      
      // Monitor track events
      remoteStream.getAudioTracks().forEach(track => {
        track.onended = () => console.log('⚠️ Remote audio track ended');
        track.onmute = () => console.log('🔇 Remote audio track muted');
        track.onunmute = () => console.log('🔊 Remote audio track unmuted');
      });
    }
  }, [remoteStream]);
  
  return {
    // Connection state
    isConnected,
    isPeerConnected,
    connectionState,
    error,
    
    // Streams
    localStream,
    remoteStream,
    remoteAudioRef,
    
    // Transcription & AI
    transcripts,
    aiCoaching,
    intelligence,
    
    // Stats
    stats,
    
    // Actions
    connect,
    disconnect,
    toggleMute,
    isMuted,
    getAudioLevel
  };
};

export default useWebRTC;
