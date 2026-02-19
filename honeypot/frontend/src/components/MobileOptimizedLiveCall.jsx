import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mic, StopCircle, X, Menu } from 'lucide-react';
import { useWakeLock, useVibrate, useBatteryStatus } from '../hooks/useMobile';

export default function MobileOptimizedLiveCall() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [operatorPanelOpen, setOperatorPanelOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [callId, setCallId] = useState(null);
  const [status, setStatus] = useState('Ready to call');
  const [threatLevel, setThreatLevel] = useState(0);
  const [participantConnected, setParticipantConnected] = useState(false);
  
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const vibrate = useVibrate();
  const battery = useBatteryStatus();
  
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (battery.level < 0.2 && !battery.charging) {
      alert('⚠️ Low battery! Consider charging your device.');
    }
  }, [battery]);

  const startCall = async () => {
    try {
      vibrate(50);
      
      // Request wake lock
      await requestWakeLock();
      
      // Initialize call session with backend
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_BASE}/call/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_SECRET || 'unsafe-secret-key-change-me'
        },
        body: JSON.stringify({
          operator_id: 'mobile-operator',
          persona_type: 'elderly_victim'
        })
      });
      
      if (!response.ok) throw new Error('Failed to start call');
      
      const { call_id } = await response.json();
      setCallId(call_id);
      setStatus('Connecting...');
      
      // Connect WebSocket to call
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/call/connect?call_id=${call_id}&role=operator`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setStatus('In call');
        vibrate([50, 100, 50]);
        startRecording();
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Connection error');
        alert('Connection error. Please check your network.');
        endCall();
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        setStatus('Disconnected');
      };
      
    } catch (error) {
      console.error('Failed to start call:', error);
      setStatus('Failed to start call');
      alert('Failed to start call: ' + error.message);
      releaseWakeLock();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Try WAV first, fallback to WebM
      let mimeType = 'audio/webm;codecs=opus';
      let format = 'webm';
      
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
        format = 'wav';
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            wsRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64,
              format: format
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // 1 second chunks
      setIsRecording(true);
      
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access required for live call');
      endCall();
    }
  };

  // WebSocket message handler
  const handleWebSocketMessage = async (data) => {
    switch (data.type) {
      case 'connected':
        setStatus(data.waiting_for_scammer ? 'Waiting for scammer...' : 'Connected');
        break;
      
      case 'participant_joined':
        setParticipantConnected(true);
        setStatus('Call active');
        vibrate([50, 100, 50]);
        setTranscript(prev => [...prev, {
          type: 'system',
          text: '🟢 Scammer has joined the call',
          timestamp: new Date().toISOString()
        }]);
        break;
      
      case 'participant_left':
        setParticipantConnected(false);
        setStatus(`${data.role} left the call`);
        vibrate(100);
        break;
      
      case 'audio_stream':
        // Queue incoming audio for playback
        await playIncomingAudio(data.audio, data.format);
        break;
      
      case 'transcription':
        // Add transcription to transcript
        setTranscript(prev => [...prev, {
          speaker: data.speaker,
          text: data.text,
          language: data.language,
          timestamp: data.timestamp,
          confidence: data.confidence
        }]);
        vibrate(50);
        break;
      
      case 'ai_coaching':
        // Display AI coaching suggestions
        setSuggestions(data.suggestions || []);
        if (data.recommended_response) {
          setTranscript(prev => [...prev, {
            type: 'ai_suggestion',
            text: `💡 AI Suggests: "${data.recommended_response}"`,
            timestamp: new Date().toISOString()
          }]);
          vibrate([30, 50, 30]);
        }
        break;
      
      case 'intelligence_update':
        // Update threat level (operator only)
        if (data.threat_level !== undefined) {
          setThreatLevel(data.threat_level);
          vibrate(100);
        }
        break;
      
      case 'call_ended':
        setStatus('Call ended');
        setTimeout(() => endCall(), 1000);
        break;
    }
  };

  // Audio playback queue system
  const playIncomingAudio = async (audioBase64, format) => {
    try {
      audioQueueRef.current.push({ audioBase64, format });
      if (!isPlayingRef.current) {
        await playNextInQueue();
      }
    } catch (error) {
      console.error('Audio queue error:', error);
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const { audioBase64, format } = audioQueueRef.current.shift();
    
    try {
      // Map format to proper MIME type
      const mimeType = format === 'wav' ? 'audio/wav' : 
                      format === 'mp3' ? 'audio/mpeg' :
                      format === 'ogg' ? 'audio/ogg' : 'audio/webm';
      const audioBlob = base64ToBlob(audioBase64, mimeType);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        playNextInQueue();
      };
      audio.onerror = async (e) => {
        console.error('Audio playback failed, trying Web Audio API fallback...', e);
        URL.revokeObjectURL(audioUrl);
        
        // Try Web Audio API fallback
        try {
          await playAudioWithWebAudioAPI(audioBlob);
          playNextInQueue();
        } catch (fallbackError) {
          console.error('Web Audio API fallback also failed:', fallbackError);
          playNextInQueue();
        }
      };
      
      await audio.play();
    } catch (error) {
      console.error('Audio decode error:', error);
      playNextInQueue();
    }
  };

  const playAudioWithWebAudioAPI = async (audioBlob) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    return new Promise((resolve, reject) => {
      source.onended = resolve;
      source.onerror = reject;
      source.start(0);
    });
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const endCall = async () => {
    vibrate(100);
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // End call on backend
    if (callId) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        await fetch(`${API_BASE}/call/end/${callId}`, {
          method: 'POST',
          headers: {
            'x-api-key': import.meta.env.VITE_API_SECRET || 'unsafe-secret-key-change-me'
          }
        });
      } catch (error) {
        console.error('End call error:', error);
      }
    }
    
    releaseWakeLock();
    setIsRecording(false);
    setIsConnected(false);
    setStatus('Call ended');
    
    // Navigate to dashboard
    setTimeout(() => navigate('/dashboard'), 500);
  };

  const toggleOperatorPanel = () => {
    vibrate(30);
    setOperatorPanelOpen(!operatorPanelOpen);
  };

  return (
    <div className="min-h-screen-mobile bg-background flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="mobile-header px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/5 active:scale-95 transition-transform"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <h1 className="text-lg font-bold text-white">Live Call</h1>
          
          <button
            onClick={toggleOperatorPanel}
            className="p-2 rounded-lg bg-white/5 active:scale-95 transition-transform"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Connection Status */}
        <div className={`mb-8 px-6 py-3 rounded-full ${
          isConnected ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-white/5'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'
            }`} />
            <span className="text-white font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Call Button */}
        <motion.button
          onClick={isConnected ? endCall : startCall}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform ${
            isConnected
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          {isConnected ? (
            <Phone className="w-12 h-12 text-white rotate-[135deg]" />
          ) : (
            <Phone className="w-12 h-12 text-white" />
          )}
          
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-white/30"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* Transcript History */}
        <AnimatePresence>
          {transcript.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 w-full max-w-md max-h-64 overflow-y-auto glass-card p-4 space-y-3"
            >
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Transcript</h3>
              {transcript.slice(-5).map((item, idx) => (
                <div key={idx} className="text-xs leading-relaxed">
                  {item.type === 'system' ? (
                    <p className="text-emerald-400 italic">{item.text}</p>
                  ) : item.type === 'ai_suggestion' ? (
                    <p className="text-yellow-400 font-medium">{item.text}</p>
                  ) : (
                    <p className={item.speaker === 'scammer' ? 'text-red-300' : 'text-blue-300'}>
                      <span className="font-bold">{item.speaker}:</span> {item.text}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battery Warning */}
        {battery.level < 0.2 && !battery.charging && (
          <div className="mt-4 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
            <p className="text-orange-200 text-sm">
              ⚡ Battery: {Math.round(battery.level * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Operator Panel (Slide-in) */}
      <AnimatePresence>
        {operatorPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={toggleOperatorPanel}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm glass-panel z-50 overflow-y-auto"
            >
              <div className="safe-top safe-bottom p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Operator Panel</h2>
                  <button
                    onClick={toggleOperatorPanel}
                    className="p-2 bg-white/5 rounded-lg active:scale-95"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Threat Level Indicator */}
                {participantConnected && (
                  <div className="mb-6 glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white/60 uppercase">Threat Level</h3>
                      <span className={`text-lg font-bold ${
                        threatLevel < 0.3 ? 'text-emerald-400' :
                        threatLevel < 0.7 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {Math.round(threatLevel * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          threatLevel < 0.3 ? 'bg-emerald-500' :
                          threatLevel < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${threatLevel * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/60 uppercase">AI Suggestions</h3>
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <div key={index} className="glass-card p-3 active:scale-[0.98]">
                        <p className="text-white text-sm">{suggestion}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/40 text-sm italic">No suggestions yet...</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
