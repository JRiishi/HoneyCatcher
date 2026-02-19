import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mic, StopCircle, X, Menu } from 'lucide-react';
import { useWakeLock, useVibrate, useBatteryStatus } from '../hooks/useMobile';
import api from '../services/api';

export default function MobileOptimizedLiveCall() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [operatorPanelOpen, setOperatorPanelOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const vibrate = useVibrate();
  const battery = useBatteryStatus();
  
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

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
      
      // Create session
      const response = await api.post('/api/live-call/session', {
        operator_id: 'mobile-operator',
        persona_type: 'elderly_victim'
      });
      
      setSessionId(response.data.session_id);
      
      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-call/ws/${response.data.session_id}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        vibrate([50, 100, 50]);
        startRecording();
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          setCurrentTranscript(data.text);
        } else if (data.type === 'suggestion') {
          setSuggestions(prev => [...prev, data.suggestion]);
        } else if (data.type === 'intelligence') {
          vibrate(100); // Haptic feedback for new intelligence
        }
      };
      
      wsRef.current.onerror = () => {
        alert('Connection error. Please check your network.');
        endCall();
      };
      
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call');
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
          reader.onload = () => {
            const arrayBuffer = reader.result;
            const base64Audio = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              data: base64Audio,
              format: format
            }));
          };
          reader.readAsArrayBuffer(event.data);
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

  const endCall = () => {
    vibrate(100);
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    releaseWakeLock();
    setIsRecording(false);
    setIsConnected(false);
    
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    }
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

        {/* Transcript Preview */}
        <AnimatePresence>
          {currentTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 w-full max-w-md glass-card p-4"
            >
              <h3 className="text-sm font-medium text-white/60 mb-2">Live Transcript</h3>
              <p className="text-white text-base">{currentTranscript}</p>
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
