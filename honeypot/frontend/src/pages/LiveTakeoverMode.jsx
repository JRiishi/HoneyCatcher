import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Shield, Radio, Eye, Brain, AlertTriangle,
  Phone, PhoneOff, RefreshCw, FileText, Download,
  ArrowLeftRight, Activity, Zap, Globe, Lock,
  ChevronRight, Volume2, User, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import LiveCallControls from '../components/LiveCallControls';
import IntelligenceStream from '../components/IntelligenceStream';
import AICoachPanel from '../components/AICoachPanel';
import liveService from '../services/liveApi';

const LiveTakeoverMode = () => {
  // ── State ──────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('ai_takeover'); // ai_takeover | ai_coached
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceCloneId, setVoiceCloneId] = useState(null);

  // Conversation
  const [transcript, setTranscript] = useState([]);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [coachingScripts, setCoachingScripts] = useState([]);

  // Intelligence
  const [entities, setEntities] = useState([]);
  const [threatLevel, setThreatLevel] = useState(0);
  const [tactics, setTactics] = useState([]);
  const [urlResults, setUrlResults] = useState([]);

  // Status
  const [turnCount, setTurnCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const transcriptEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // ── WebSocket Event Handlers ───────────────────────────────

  useEffect(() => {
    const unsubs = [
      liveService.on('connected', () => setIsConnected(true)),
      liveService.on('disconnected', () => setIsConnected(false)),

      liveService.on('transcription', (data) => {
        setTranscript(prev => [...prev, {
          speaker: 'scammer',
          text: data.text,
          language: data.language,
          timestamp: data.timestamp
        }]);
        setTurnCount(prev => prev + 1);
      }),

      liveService.on('ai_response', (data) => {
        setCurrentResponse(data);
        setTranscript(prev => [...prev, {
          speaker: 'agent',
          text: data.text,
          source: 'ai_takeover',
          timestamp: data.timestamp
        }]);
        // Play audio if available
        if (data.audio) {
          playAudioBase64(data.audio);
        }
      }),

      liveService.on('coaching_scripts', (data) => {
        setCoachingScripts(data.scripts || []);
      }),

      liveService.on('intelligence', (data) => {
        if (data.new_entities) {
          setEntities(prev => [...prev, ...data.new_entities]);
        }
      }),

      liveService.on('threat', (data) => {
        setThreatLevel(data.level || 0);
        setTactics(data.tactics || []);
      }),

      liveService.on('url_scan', (data) => {
        setUrlResults(prev => [...prev, data]);
      }),

      liveService.on('mode_switched', (data) => {
        setMode(data.new_mode);
      }),

      liveService.on('session_ended', () => {
        setIsActive(false);
        setIsRecording(false);
        stopRecording();
      }),

      liveService.on('error', (data) => {
        setError(data.message || 'Connection error');
        setTimeout(() => setError(null), 5000);
      }),

      liveService.on('reconnecting', (data) => {
        setError(`Reconnecting... (attempt ${data.attempt})`);
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Duration timer
  useEffect(() => {
    if (isActive) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(durationIntervalRef.current);
  }, [isActive]);

  // ── Audio Playback ─────────────────────────────────────────

  const playAudioBase64 = useCallback((base64) => {
    try {
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }, []);

  // ── Recording ──────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
      });

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && liveService.isConnected) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            liveService.sendAudioChunk(base64, 'webm');
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Send 2.5s chunks
      mediaRecorder.start(2500);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (e) {
      console.error('Recording error:', e);
      setError('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    audioContextRef.current?.close();
    setIsRecording(false);
  }, []);

  // ── Session Controls ───────────────────────────────────────

  const handleStartSession = async () => {
    try {
      setError(null);
      const result = await liveService.startSession({
        mode,
        voiceCloneId,
        language: 'en'
      });

      setSessionId(result.session_id);
      setIsActive(true);
      setDuration(0);
      setTranscript([]);
      setEntities([]);
      setThreatLevel(0);
      setTactics([]);
      setUrlResults([]);
      setTurnCount(0);

      // Connect WebSocket
      liveService.connect(result.session_id);

      // Start recording
      await startRecording();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEndSession = async () => {
    stopRecording();
    if (sessionId) {
      try {
        await liveService.endSession(sessionId);
      } catch (e) {
        console.error('End session error:', e);
      }
      liveService.disconnect();
    }
    setIsActive(false);
  };

  const handleModeSwitch = async () => {
    const newMode = mode === 'ai_takeover' ? 'ai_coached' : 'ai_takeover';
    if (sessionId) {
      try {
        await liveService.switchMode(sessionId, newMode);
        setMode(newMode);
      } catch (e) {
        setError(e.message);
      }
    } else {
      setMode(newMode);
    }
  };

  const handleDownloadReport = async (format) => {
    if (!sessionId) return;
    try {
      await liveService.generateReport(sessionId, format);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleScriptSelect = (script) => {
    // In coached mode, user selects a script to narrate
    setTranscript(prev => [...prev, {
      speaker: 'agent',
      text: script.text,
      source: 'user_narrated',
      timestamp: new Date().toISOString()
    }]);
    liveService.sendTextInput(script.text);
    setCoachingScripts([]);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getThreatColor = (level) => {
    if (level >= 0.7) return 'text-red-400';
    if (level >= 0.4) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 selection:bg-emerald-500/30 overflow-x-hidden font-sans">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-red-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 pt-24 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 tracking-[0.2em] uppercase">
                {isActive ? '● LIVE' : 'STANDBY'}
              </div>
              {isConnected && (
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase">
                  CONNECTED
                </div>
              )}
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
              LIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">TAKEOVER</span>
            </h1>
            <p className="max-w-xl text-slate-500 text-lg font-medium">
              AI-powered real-time scam engagement. Extract intelligence while keeping them on the line.
            </p>
          </div>

          {/* Status Panel */}
          <div className="flex items-center gap-6 p-5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Mode</p>
              <p className="text-sm font-black text-white">
                {mode === 'ai_takeover' ? 'AI TAKEOVER' : 'AI COACHED'}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Duration</p>
              <p className="text-sm font-black text-white font-mono">{formatDuration(duration)}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Threat</p>
              <p className={`text-sm font-black ${getThreatColor(threatLevel)}`}>
                {(threatLevel * 100).toFixed(0)}%
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Turns</p>
              <p className="text-sm font-black text-white">{turnCount}</p>
            </div>
          </div>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Bar */}
        <LiveCallControls
          isActive={isActive}
          isRecording={isRecording}
          mode={mode}
          onStart={handleStartSession}
          onEnd={handleEndSession}
          onModeSwitch={handleModeSwitch}
          onToggleRecording={isRecording ? stopRecording : startRecording}
          onDownloadReport={handleDownloadReport}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

          {/* Left: Live Transcript */}
          <div className="lg:col-span-2">
            <GlassCard className="h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-400" />
                  Live Transcript
                </h2>
                <span className="text-xs text-slate-600 font-mono">
                  {transcript.length} messages
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {transcript.length === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-600">
                    <div className="text-center space-y-2">
                      <Mic className="w-12 h-12 mx-auto opacity-30" />
                      <p>Start a session to see the live transcript</p>
                    </div>
                  </div>
                )}

                {transcript.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: entry.speaker === 'scammer' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-3 ${entry.speaker === 'agent' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      entry.speaker === 'scammer'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {entry.speaker === 'scammer' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      entry.speaker === 'scammer'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/20'
                    }`}>
                      <p className="text-sm text-slate-300">{entry.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-600">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}
                        </span>
                        {entry.source && (
                          <span className="text-[10px] text-slate-700 bg-white/5 px-1.5 py-0.5 rounded">
                            {entry.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </GlassCard>
          </div>

          {/* Right: Intelligence + Coach */}
          <div className="space-y-6">
            {/* Intelligence Stream */}
            <IntelligenceStream
              entities={entities}
              threatLevel={threatLevel}
              tactics={tactics}
              urlResults={urlResults}
            />

            {/* AI Coach Panel (only in coached mode) */}
            <AnimatePresence>
              {mode === 'ai_coached' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AICoachPanel
                    scripts={coachingScripts}
                    onSelectScript={handleScriptSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveTakeoverMode;
