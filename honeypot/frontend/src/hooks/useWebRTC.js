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
  const [aiMode, setAiModeState] = useState('operator');
  const [aiError, setAiError] = useState(null);
  
  const webrtcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const aiAudioContextRef = useRef(null);
  const originalAudioTrackRef = useRef(null);
  
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

          // Force update output even if ref logic handles it
          if (remoteAudioRef.current) {
            console.log('🔊 Manually setting srcObject on stream update');
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().catch(e => console.error('Play error on stream update:', e));
          }
        };
        
        webrtcRef.current.onTranscription = (data) => {
          console.log('%c📝 [HOOK] Transcription callback fired — adding to UI state', 'color:lime;font-weight:bold', data);
          setTranscripts(prev => {
            const updated = [...prev, data];
            console.log(`📋 [HOOK] Total transcripts in state: ${updated.length}`);
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

      // ── AI mode socket listeners (attached after connect so socket exists) ──
      const socket = webrtcRef.current.socket;
      if (socket) {
        // Backend confirmed mode change
        socket.on('ai_mode_changed', (data) => {
          console.log('%c🤖 [AI MODE] Changed → ' + data.mode, 'color:magenta;font-weight:bold');
          setAiModeState(data.mode);
          // Re-enable mic when reverting to operator mode
          if (data.mode === 'operator' && webrtcRef.current?.localStream) {
            webrtcRef.current.localStream.getAudioTracks().forEach(t => { t.enabled = true; });
          }
        });

        // AI audio response — decode MP3 and inject into outgoing WebRTC track
        socket.on('audio_response', async (data) => {
          console.log('%c🔊 [AI AUDIO] Received audio_response', 'color:cyan;font-weight:bold', data.text);
          try {
            const b64 = data.audio;
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const arrayBuf = bytes.buffer;

            // Lazily create AudioContext
            if (!aiAudioContextRef.current || aiAudioContextRef.current.state === 'closed') {
              aiAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = aiAudioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const decoded = await ctx.decodeAudioData(arrayBuf);
            const destNode = ctx.createMediaStreamDestination();
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(destNode);

            // Replace outgoing audio sender track so scammer hears AI voice
            const pc = webrtcRef.current?.peerConnection;
            if (pc) {
              const senders = pc.getSenders();
              const audioSender = senders.find(s => s.track?.kind === 'audio');
              if (audioSender) {
                const aiTrack = destNode.stream.getAudioTracks()[0];
                // Save original track once
                if (!originalAudioTrackRef.current) {
                  originalAudioTrackRef.current = audioSender.track;
                }
                await audioSender.replaceTrack(aiTrack);
                // Restore original track when clip ends
                source.onended = async () => {
                  if (webrtcRef.current?.ai_mode_ui === 'ai_only') {
                    // still in AI mode — leave silent until next clip
                  } else if (originalAudioTrackRef.current) {
                    await audioSender.replaceTrack(originalAudioTrackRef.current).catch(() => {});
                  }
                };
              }
            }

            source.start();
          } catch (err) {
            console.error('❌ [AI AUDIO] Decode/inject error:', err);
          }
        });

        // AI error — notify UI and revert mode
        socket.on('ai_error', (data) => {
          console.error('%c❌ [AI ERROR] ' + data.text, 'color:red;font-weight:bold', data);
          setAiError(data.text || data.error || 'AI error');
          setAiModeState('operator');
          // Re-enable mic
          if (webrtcRef.current?.localStream) {
            webrtcRef.current.localStream.getAudioTracks().forEach(t => { t.enabled = true; });
          }
          // Restore original track
          const pc = webrtcRef.current?.peerConnection;
          if (pc && originalAudioTrackRef.current) {
            const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (audioSender) audioSender.replaceTrack(originalAudioTrackRef.current).catch(() => {});
          }
        });
      }
      
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
    // Close AI AudioContext on disconnect
    if (aiAudioContextRef.current) {
      aiAudioContextRef.current.close().catch(() => {});
      aiAudioContextRef.current = null;
    }
    originalAudioTrackRef.current = null;
    
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
   * Switch AI takeover mode.
   * mode: "ai_only" | "operator"
   */
  const setAiMode = useCallback((mode) => {
    if (!webrtcRef.current?.socket) {
      console.warn('⚠️ setAiMode: socket not ready');
      return;
    }

    console.log('%c🤖 [AIMODE] Requesting mode=' + mode, 'color:magenta;font-weight:bold');

    // Optimistically update UI state and track it on the service ref
    setAiModeState(mode);
    webrtcRef.current.ai_mode_ui = mode;

    // Mute / unmute operator mic
    if (webrtcRef.current.localStream) {
      webrtcRef.current.localStream.getAudioTracks().forEach(t => {
        t.enabled = (mode !== 'ai_only');
      });
    }

    // If reverting to operator, restore original track immediately
    if (mode === 'operator') {
      const pc = webrtcRef.current?.peerConnection;
      if (pc && originalAudioTrackRef.current) {
        const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(originalAudioTrackRef.current).catch(() => {});
        }
      }
      originalAudioTrackRef.current = null;
    }

    // Emit to backend
    webrtcRef.current.socket.emit('set_ai_mode', { room_id: roomId, mode });
    setAiError(null);
  }, [roomId]);
  
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
      // Fix for one-way audio: Explicitly log tracks
      const audioTracks = remoteStream.getAudioTracks();
      console.log(`📊 Remote stream checks: ${audioTracks.length} audio tracks found`);
      if (audioTracks.length > 0) {
        console.log(`   First track enabled: ${audioTracks[0].enabled}, state: ${audioTracks[0].readyState}`);
      } else {
        console.warn('⚠️ No audio tracks in remote stream!');
      }

      remoteAudioRef.current.srcObject = remoteStream;
      
      // Ensure audio element is properly configured
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.playsInline = true;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      
      // Try to play
      const attemptPlay = async () => {
        try {
          await remoteAudioRef.current.play();
          console.log('✅ Remote audio playing successfully');
        } catch (e) {
            console.error('❌ Failed to play remote audio:', e);
            console.log('ℹ️ User interaction may be required to play audio');
        }
      };
      
      attemptPlay();
      
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
    
    // AI takeover mode
    aiMode,
    aiError,
    setAiMode,
    
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
