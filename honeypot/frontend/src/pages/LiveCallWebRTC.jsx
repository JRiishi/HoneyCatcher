import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Phone, PhoneOff, Shield, ShieldAlert, 
  Activity, Zap, Lock, Unlock, Radio, Signal, MapPin, 
  User, Database, Terminal, AlertTriangle, Fingerprint, 
  CreditCard, Globe, StopCircle, RefreshCw, Volume2, VolumeX,
  Bot, CircuitBoard, Cpu, FileText, Brain, Target, BarChart2
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import GlassCard from '../components/GlassCard';
import API from '../services/api';

const LiveCallWebRTC = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const roleParam = searchParams.get('role');
  const role = roleParam === 'scammer' ? 'scammer' : 'operator';

  // UI State
  const [callInfo, setCallInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1.0);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioNeedsEnable, setAudioNeedsEnable] = useState(true);
  const [callStarted, setCallStarted] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const isMounted = useRef(true);
  const transcriptEndRef = useRef(null);
  const timerRef = useRef(null);

  const {
    isConnected,
    isPeerConnected,
    connectionState,
    error,
    transcripts = [],
    aiCoaching,
    intelligence = { entities: [], tactics: [], threatLevel: 0 },
    stats,
    remoteAudioRef,
    toggleMute,
    connect,
    disconnect,
    aiMode,
    aiError,
    setAiMode
  } = useWebRTC(callId, role);

  /* ─────────────────────────────────────────────
     Lifecycle & Effects
  ───────────────────────────────────────────── */

  useEffect(() => {
    isMounted.current = true;
    if (!callId) navigate('/dashboard');

    const fetchCallInfo = async () => {
      try {
        const res = await API.get(`/call/info/${callId}`);
        if (isMounted.current) setCallInfo(res.data);
      } catch (err) {
        console.error('Failed to fetch call info:', err);
      }
    };
    fetchCallInfo();

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (callStarted) disconnect();
    };
  }, [callId, navigate, callStarted, disconnect]);

  // Duration Timer
  useEffect(() => {
    if (callStarted && !callEnded) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStarted, callEnded]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Update remote audio refs
  useEffect(() => {
    if (remoteAudioRef?.current) {
      remoteAudioRef.current.volume = remoteVolume;
      remoteAudioRef.current.muted = isRemoteMuted;
    }
  }, [remoteVolume, isRemoteMuted, remoteAudioRef]);

  /* ─────────────────────────────────────────────
     Handlers
  ───────────────────────────────────────────── */

  const handleStartCall = async () => {
    try {
      setStartingCall(true);
      await connect();
      setCallStarted(true);
      // Auto-enable audio context usually requires user gesture, 
      // but we are in a click handler here so it might work.
      // We still keep the 'Enable Audio' banner just in case.
    } catch (err) {
      console.error('Failed to start:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setStartingCall(false);
    }
  };

  const handleEndCall = async () => {
    try {
      const res = await API.post(`/webrtc/room/${callId}/end`);
      if (res.data?.report) setReportData(res.data.report);
    } catch (err) {
      console.error(err);
    } finally {
      setCallEnded(true);
      disconnect();
    }
  };

  const handleEnableAudio = async () => {
    if (remoteAudioRef.current) {
      try {
        await remoteAudioRef.current.play();
        setAudioNeedsEnable(false);
      } catch (err) {
        console.error('Audio enable failed:', err);
      }
    }
  };

  /* ─────────────────────────────────────────────
     UI Helpers
  ───────────────────────────────────────────── */

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const threatColor = intelligence.threatLevel > 0.7 ? 'text-red-500' : 
                      intelligence.threatLevel > 0.4 ? 'text-yellow-500' : 'text-green-500';

  const threatBg = intelligence.threatLevel > 0.7 ? 'bg-red-500/20' : 
                   intelligence.threatLevel > 0.4 ? 'bg-yellow-500/20' : 'bg-green-500/20';

  const isAI = aiMode === 'ai_only';

  return (
    <div className={`min-h-screen transition-colors duration-700 ${isAI ? 'bg-[#0a1410]' : 'bg-[#050505]'} text-gray-100 font-sans overflow-hidden relative`}>
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 transition-colors duration-700 ${isAI ? 'bg-emerald-600' : 'bg-teal-600'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-20 transition-colors duration-700 ${isAI ? 'bg-teal-600' : 'bg-emerald-600'}`} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* ──────────────── Header ──────────────── */}
      <header className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-mono text-sm tracking-wider text-gray-400">
              {isConnected ? 'LIVE_SECURE_LINK' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
            <Lock size={14} className="text-gray-500" />
            <span>ID: {callId}</span>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
           <span className="font-mono font-bold text-red-500 animate-pulse text-sm">REC</span>
           <span className="font-mono text-sm w-16 text-center">{formatDuration(duration)}</span>
        </div>

        <div className="flex items-center gap-4">
          {isAI && (
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
               <Cpu size={14} className="text-emerald-400 animate-pulse" />
               <span className="text-xs font-bold text-emerald-400 tracking-wider">AI AGENT ACTIVE</span>
             </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
            <Shield size={14} className={threatColor} />
            <span className={`text-xs font-bold ${threatColor}`}>
              THREAT: {Math.round(intelligence.threatLevel * 100)}%
            </span>
          </div>
        </div>
      </header>


      {/* ──────────────── Main Content ──────────────── */}
      <main className="pt-20 pb-24 px-6 h-screen flex gap-6 box-border">
        
        {/* Left Column: Intelligence Dashboard */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4 no-scrollbar hidden lg:flex">
          
          {/* Status Card */}
          <GlassCard className="p-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Signal Status</h3>
              <Signal size={14} className={isPeerConnected ? 'text-emerald-400' : 'text-yellow-400'} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Video</span>
                 <span className="text-gray-300">Disabled</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Audio</span>
                 <span className={isPeerConnected ? 'text-emerald-400' : 'text-red-400'}>
                    {isPeerConnected ? 'Connected' : 'Waiting'}
                 </span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Latency</span>
                 <span className="font-mono text-gray-300">24ms</span>
              </div>
            </div>
          </GlassCard>

          {/* Intelligence Stream */}
          <GlassCard className="flex-1 p-0 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-white/5 bg-white/[0.02]">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <Radio size={14} className="text-emerald-400" />
                 Live Intel Stream
               </h3>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {intelligence.entities.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center py-8 text-gray-600 text-xs italic"
                    >
                      Listening for intel...
                    </motion.div>
                  )}
                  {[...intelligence.entities].reverse().map((entity, idx) => (
                    <motion.div
                      key={`${entity.value}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-colors group"
                    >
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {entity.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                       </div>
                       <div className="text-sm font-mono text-gray-200 break-all select-all">
                          {entity.type === 'url' ? (
                            <div className="flex items-center gap-2">
                              <Globe size={12} className="text-gray-400" />
                              {entity.value}
                            </div>
                          ) : entity.type.includes('phone') ? (
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-gray-400" />
                              {entity.value}
                            </div>
                          ) : (
                            entity.value
                          )}
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          </GlassCard>

           {/* Tactics Detected */}
           <GlassCard className="p-4 min-h-[120px]">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <AlertTriangle size={14} className="text-orange-400" />
               Tactics Detected
             </h3>
             <div className="flex flex-wrap gap-2">
               {intelligence.tactics.length > 0 ? intelligence.tactics.map((tactic, i) => (
                 <span key={i} className="px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                   {tactic}
                 </span>
               )) : (
                 <span className="text-gray-600 text-xs italic">No tactics flagged yet</span>
               )}
             </div>
           </GlassCard>
        </div>


        {/* Center Column: Transcript & Live View */}
        <div className="flex-1 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Not Started State */}
          {!callStarted && !callEnded && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <GlassCard className="max-w-md w-full p-8 text-center relative overflow-hidden">
                 <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                 <div className="mb-6 mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/50">
                    <Phone size={32} className="text-emerald-400" />
                 </div>
                 <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                   Secure Line Ready
                 </h2>
                 <p className="text-gray-500 text-sm mt-2 mb-8">
                   Establish a WEBRTC encrypted connection for ID {callId}. <br/>
                   All audio will be transcribed and analyzed in real-time.
                 </p>
                 <button 
                  onClick={handleStartCall}
                  disabled={startingCall}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 group"
                 >
                   {startingCall ? (
                     <RefreshCw className="animate-spin text-gray-400" />
                   ) : (
                     <span className="flex items-center gap-2 group-hover:gap-3 transition-all">
                       Initialize Connection <Phone size={16} fill="currentColor" />
                     </span>
                   )}
                 </button>
              </GlassCard>
            </div>
          )}

          {/* Call Ended State */}
          {callEnded && reportData && (
             <div className="flex-1 overflow-y-auto">
               <GlassCard className="p-8 max-w-2xl mx-auto">
                 <div className="text-center mb-8">
                   <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                     <FileText size={32} className="text-emerald-400" />
                   </div>
                   <h2 className="text-3xl font-bold">Session Report</h2>
                   <p className="text-gray-500">ID: {reportData.call_id}</p>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-4 mb-8">
                   <div className="p-4 rounded-lg bg-white/5 text-center">
                      <div className="text-sm text-gray-500">Duration</div>
                      <div className="text-xl font-mono">{reportData.duration_seconds}s</div>
                   </div>
                   <div className="p-4 rounded-lg bg-white/5 text-center">
                      <div className="text-sm text-gray-500">Threat</div>
                      <div className={`text-xl font-bold ${threatColor}`}>
                        {(reportData.threat_level * 100).toFixed(0)}%
                      </div>
                   </div>
                   <div className="p-4 rounded-lg bg-white/5 text-center">
                      <div className="text-sm text-gray-500">Entities</div>
                      <div className="text-xl font-bold text-emerald-400">
                        {reportData.entities?.length || 0}
                      </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="font-bold border-b border-white/10 pb-2">Full Transcript</h3>
                    <div className="bg-black/30 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto space-y-2">
                       {reportData.transcript.map((t, i) => (
                         <div key={i} className="flex gap-2">
                            <span className={t.speaker === 'scammer' ? 'text-red-400' : 'text-emerald-400'}>
                              [{t.speaker.toUpperCase()}]:
                            </span>
                            <span className="text-gray-300">{t.text}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 
                 <div className="mt-8 flex justify-center">
                   <button 
                     onClick={() => navigate('/dashboard')}
                     className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold"
                   >
                     Return to Dashboard
                   </button>
                 </div>
               </GlassCard>
             </div>
          )}

          {/* Active Call State */}
          {callStarted && !callEnded && (
            <>
              {/* Transcript Window */}
              <GlassCard className="flex-1 overflow-hidden flex flex-col relative">
                 {/* Visualizer Header */}
                 <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-background/80 to-transparent z-10 pointer-events-none" />
                 
                 {/* Chat Area */}
                 <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                    {transcripts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-50">
                         <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse" />
                            <Activity size={48} />
                         </div>
                         <p className="font-mono text-xs tracking-widest uppercase">Awaiting Audio Stream...</p>
                      </div>
                    ) : (
                      transcripts.map((t, i) => {
                        const isScammer = t.speaker === 'scammer';
                        const isAIResponse = t.speaker === 'ai'; // AI responses show as AI
                        // Actually our new backend logic sets speaker='ai' for AI turns
                        
                        // Check if it's the operator (or AI mode operator)
                        const isMe = !isScammer; 

                        return (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] rounded-2xl p-4 relative group ${
                              isMe 
                                ? isAIResponse 
                                  ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-800/30 border border-emerald-500/30 text-emerald-100 rounded-tr-none'
                                  : 'bg-gradient-to-br from-teal-600/20 to-teal-800/20 border border-teal-500/20 rounded-tr-none'
                                : 'bg-white/5 border border-white/5 rounded-tl-none'
                            }`}>
                               {/* Label */}
                               <div className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${
                                 isMe 
                                  ? isAIResponse ? 'text-emerald-400' : 'text-teal-400' 
                                  : 'text-red-400'
                               }`}>
                                 {isAIResponse ? 'AGENTS (AI)' : isMe ? 'YOU (OPERATOR)' : 'SCAMMER'}
                               </div>
                               
                               {/* Text */}
                               <p className="text-sm leading-relaxed text-shadow-sm">
                                 {t.text}
                               </p>
                               
                               {/* Timestamp */}
                               <div className="absolute -bottom-5 text-[10px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {new Date(t.timestamp).toLocaleTimeString()} • {t.confidence ? `${Math.round(t.confidence * 100)}% Match` : ''}
                               </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                    <div ref={transcriptEndRef} />
                 </div>

                 {/* AI Error Toast */}
                 <AnimatePresence>
                   {aiError && (
                     <motion.div 
                       initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                       className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500/90 text-white rounded-full text-sm font-bold shadow-xl border border-red-400 backdrop-blur-md flex items-center gap-2 z-20"
                     >
                        <AlertTriangle size={16} /> {aiError}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </GlassCard>
            </>
          )}

          {/* AI Coaching Panel (Bottom of Center) */}
          {aiCoaching && callStarted && !callEnded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="mt-auto"
            >
              <GlassCard className="p-4 border-l-4 border-l-emerald-500 bg-emerald-900/10">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                     <Zap size={12} fill="currentColor" /> Suggested Response
                   </h3>
                </div>
                <p className="text-sm text-emerald-100 mb-3">{aiCoaching.recommended_response}</p>
                <div className="flex gap-2">
                   {aiCoaching.suggestions?.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-black/20 rounded border border-white/5 text-gray-400">
                        "{s}"
                      </span>
                   ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

        </div>

        {/* Right Column: Neural Analysis & Strategy (New) */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4 no-scrollbar hidden xl:flex">
           
           {/* Neural Confidence */}
           <GlassCard className="p-4">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Brain size={14} /> Neural Confidence
                </h3>
             </div>
             
             <div className="flex flex-col items-center justify-center py-2 relative">
                <svg className="w-24 h-24 transform -rotate-90">
                   <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-none" strokeWidth="8" />
                   <circle 
                     cx="48" cy="48" r="40" 
                     className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out" 
                     strokeWidth="8"
                     strokeDasharray="251.2"
                     strokeDashoffset={251.2 * (1 - (aiCoaching?.confidence || 0))}
                     strokeLinecap="round"
                   />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                   <span className="text-xl font-bold text-white">
                     {Math.round((aiCoaching?.confidence || 0) * 100)}%
                   </span>
                </div>
             </div>
             <div className="text-center text-[10px] text-gray-500 mt-2 uppercase tracking-wide">
                Model Certainty
             </div>
           </GlassCard>

           {/* Intent Prediction */}
           <GlassCard className="p-4">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target size={14} /> Intent Prediction
              </h3>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                 <p className="text-sm font-medium text-teal-200">
                   {aiCoaching?.intent || "Analyzing conversation flow..."}
                 </p>
              </div>
           </GlassCard>

           {/* Strategic Reasoning */}
           <GlassCard className="p-4 flex-1">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BarChart2 size={14} /> Agent Reasoning
              </h3>
              <div className="prose prose-invert prose-sm max-w-none">
                 <p className="text-xs text-gray-300 leading-relaxed italic">
                   {aiCoaching?.reasoning ? `"${aiCoaching.reasoning}"` : "Waiting for sufficient context to formulate strategy..."}
                 </p>
              </div>
              
              {aiCoaching?.warning && (
                 <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-200">{aiCoaching.warning}</p>
                 </div>
              )}
           </GlassCard>

        </div>

        {/* ──────────────── Controls Bar (Bottom Fixed) ──────────────── */}
        <div className="fixed bottom-0 inset-x-0 h-20 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-between px-8">
           
           <div className="flex items-center gap-4 w-1/3">
             <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-gray-400" />
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={remoteVolume} onChange={(e) => setRemoteVolume(parseFloat(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500" 
                />
             </div>
             {audioNeedsEnable && (
                <button onClick={handleEnableAudio} className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded animate-pulse">
                   Enable Audio
                </button>
             )}
           </div>

           <div className="flex items-center gap-4 justify-center w-1/3">
              {/* Mic Toggle */}
              <button 
                onClick={() => { toggleMute(); setIsMuted(!isMuted); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white/10 text-gray-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title="Toggle Mic"
              >
                 {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* End Call */}
              <button 
                onClick={handleEndCall}
                className="h-12 px-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 flex items-center gap-2"
              >
                 <PhoneOff size={20} /> End Session
              </button>
           </div>

           <div className="flex items-center justify-end gap-4 w-1/3">
              {/* AI Takeover Switch */}
              <div className="relative group">
                {isAI && (
                   <div className="absolute inset-0 bg-emerald-600 blur-xl opacity-40 animate-pulse rounded-full" />
                )}
                <button
                  onClick={() => setAiMode(isAI ? 'operator' : 'ai_only')}
                  className={`relative flex items-center gap-3 pl-4 pr-5 h-12 rounded-full border transition-all duration-300 ${
                    isAI 
                      ? 'bg-emerald-900/80 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-500/20' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1.5 rounded-full transition-colors ${isAI ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    {isAI ? <Bot size={16} className="text-white" /> : <User size={16} />}
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                      {isAI ? 'AI Agent' : 'Operator'}
                    </span>
                    <span className="text-xs font-bold">
                      {isAI ? 'Active' : 'Standby'}
                    </span>
                  </div>
                  {isAI && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                  )}
                </button>
              </div>
           </div>

        </div>

      </main>
    </div>
  );
};

export default LiveCallWebRTC;