// /**
//  * LiveCallWebRTC - WebRTC-based Live Call Interface
//  * Automatic continuous audio streaming with P2P connections
//  */

// import { useState, useEffect } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Mic, MicOff, Phone, PhoneOff, AlertTriangle, Shield, Activity } from 'lucide-react';
// import { useWebRTC } from '../hooks/useWebRTC';
// import GlassCard from '../components/GlassCard';
// import API from '../services/api';

// const LiveCallWebRTC = () => {
//   const { callId } = useParams();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const searchParams = new URLSearchParams(location.search);
//   const role = searchParams.get('role') || 'operator';
  
//   const [callInfo, setCallInfo] = useState(null);
//   const [isMuted, setIsMuted] = useState(false);
//   const [showStats, setShowStats] = useState(false);
//   const [audioLevel, setAudioLevel] = useState(0);
  
//   // Initialize WebRTC with detected role
//   const {
//     isConnected,
//     isPeerConnected,
//     connectionState,
//     error,
//     transcripts,
//     aiCoaching,
//     intelligence,
//     stats,
//     remoteAudioRef,
//     toggleMute,
//     disconnect
//   } = useWebRTC(callId, role);
  
//   /**
//    * Fetch call info
//    */
//   useEffect(() => {
//     const fetchCallInfo = async () => {
//       try {
//         const response = await API.get(`/api/call/info/${callId}`);
//         setCallInfo(response.data);
//       } catch (err) {
//         console.error('Failed to fetch call info:', err);
//       }
//     };
    
//     fetchCallInfo();
//   }, [callId]);
  
//   /**
//    * Handle end call
//    */
//   const handleEndCall = async () => {
//     try {
//       await API.post(`/webrtc/room/${callId}/end`);
//       disconnect();
//       navigate('/dashboard');
//     } catch (err) {
//       console.error('Failed to end call:', err);
//       // Navigate anyway
//       disconnect();
//       navigate('/dashboard');
//     }
//   };
  
//   /**
//    * Toggle mute
//    */
//   const handleToggleMute = () => {
//     toggleMute();
//     setIsMuted(!isMuted);
//   };
  
//   return (
//     <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
//       {/* Audio element for remote stream - with visible controls for testing */}
//       <audio 
//         ref={remoteAudioRef} 
//         autoPlay 
//         playsInline 
//         controls 
//         className="fixed top-4 right-4 z-50 bg-black/80 rounded shadow-lg"
//         style={{ width: '300px' }}
//       />
      
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* Header */}
//         <GlassCard className="p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-2xl font-bold text-white flex items-center gap-3">
//                 <span className="relative flex h-3 w-3">
//                   <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
//                     isPeerConnected ? 'bg-green-400' : 'bg-yellow-400'
//                   } opacity-75`}></span>
//                   <span className={`relative inline-flex rounded-full h-3 w-3 ${
//                     isPeerConnected ? 'bg-green-500' : 'bg-yellow-500'
//                   }`}></span>
//                 </span>
//                 Live Call - {role === 'operator' ? '👤 Operator' : '☠️ Scammer'}
//               </h1>
//               <p className="text-gray-400 text-sm mt-1">
//                 {isPeerConnected 
//                   ? (role === 'operator' ? '🔗 Connected to scammer' : '🔗 Connected to operator')
//                   : isConnected 
//                     ? (role === 'operator' ? '⏳ Waiting for scammer...' : '⏳ Waiting for operator...')
//                     : '🔌 Connecting...'}
//               </p>
//             </div>
            
//             <div className="flex items-center gap-3">
//               {/* Connection Status */}
//               <div className="text-right">
//                 <div className="text-xs text-gray-400">Connection</div>
//                 <div className={`text-sm font-medium ${
//                   connectionState === 'connected' ? 'text-green-400' :
//                   connectionState === 'connecting' ? 'text-yellow-400' :
//                   'text-red-400'
//                 }`}>
//                   {connectionState}
//                 </div>
//               </div>
              
//               {/* Stats Toggle */}
//               <button
//                 onClick={() => setShowStats(!showStats)}
//                 className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
//               >
//                 {showStats ? '📊 Hide' : '📊 Stats'}
//               </button>
              
//               {/* End Call Button */}
//               <button
//                 onClick={handleEndCall}
//                 className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
//               >
//                 End Call
//               </button>
//             </div>
//           </div>
          
//           {/* Error Display */}
//           {error && (
//             <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
//               ⚠️ {error}
//             </div>
//           )}
//         </GlassCard>
        
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left Column - Audio Control */}
//           <div className="lg:col-span-1 space-y-6">
//             {/* Audio Control */}
//             <GlassCard className="p-6">
//               <h2 className="text-lg font-semibold text-white mb-4">🎤 Audio Control</h2>
              
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <span className="text-gray-300 text-sm">Microphone</span>
//                   <span className={`px-2 py-1 rounded text-xs font-medium ${
//                     isMuted ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
//                   }`}>
//                     {isMuted ? '🔇 Muted' : '🎤 Active'}
//                   </span>
//                 </div>
                
//                 {/* Mute Button */}
//                 <button
//                   onClick={handleToggleMute}
//                   className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
//                     isMuted 
//                       ? 'bg-red-500 hover:bg-red-600 text-white' 
//                       : 'bg-green-500 hover:bg-green-600 text-white'
//                   }`}
//                 >
//                   {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
//                   {isMuted ? 'Unmute' : 'Mute'}
//                 </button>
                
//                 {/* Info */}
//                 <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
//                   <p className="text-xs text-blue-200">
//                     ℹ️ Audio streams automatically. Remote audio player visible at top-right.
//                   </p>
//                   {role === 'operator' && (
//                     <p className="text-xs text-blue-200 mt-1">
//                       💡 Testing on same device? Make sure to unmute the audio player controls.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </GlassCard>
            
//             {/* Stats */}
//             {showStats && stats && (
//               <GlassCard className="p-6">
//                 <h2 className="text-lg font-semibold text-white mb-4">📊 Stats</h2>
//                 <div className="space-y-3 text-sm">
//                   {stats.connection?.currentRoundTripTime && (
//                     <div>
//                       <div className="text-gray-400">Latency</div>
//                       <div className="text-white">🏓 {(stats.connection.currentRoundTripTime * 1000).toFixed(0)}ms</div>
//                     </div>
//                   )}
//                 </div>
//               </GlassCard>
//             )}
//           </div>
          
//           {/* Middle Column - Transcripts */}
//           <div className="lg:col-span-1">
//             <GlassCard className="p-6 h-[600px] flex flex-col">
//               <h2 className="text-lg font-semibold text-white mb-4">🎙️ Transcript</h2>
              
//               <div className="flex-1 overflow-y-auto space-y-3">
//                 <AnimatePresence>
//                   {transcripts.length === 0 ? (
//                     <div className="text-center text-gray-400 mt-8">
//                       <p>Waiting for conversation...</p>
//                       <p className="text-xs mt-2">Transcripts appear automatically</p>
//                     </div>
//                   ) : (
//                     transcripts.map((t, i) => (
//                       <motion.div
//                         key={i}
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         className={`p-3 rounded-lg text-sm ${
//                           t.speaker === 'operator' 
//                             ? 'bg-blue-500/20 border border-blue-500/30' 
//                             : 'bg-purple-500/20 border border-purple-500/30'
//                         }`}
//                       >
//                         <div className="font-medium text-gray-200 mb-1">
//                           {t.speaker === 'operator' ? '👤 You' : '☠️ Scammer'}
//                         </div>
//                         <p className="text-white">{t.text}</p>
//                       </motion.div>
//                     ))
//                   )}
//                 </AnimatePresence>
//               </div>
//             </GlassCard>
//           </div>
          
//           {/* Right Column - Only for Operators */}
//           {role === 'operator' && (
//             <div className="lg:col-span-1">
//               <GlassCard className="p-6 h-[600px] flex flex-col overflow-y-auto">
//                 <div className="space-y-6">
//                   {/* AI Coaching */}
//                   <div>
//                     <h2 className="text-lg font-semibold text-white mb-4">🤖 AI Coaching</h2>
//                     {aiCoaching ? (
//                       <div className="space-y-3 text-sm">
//                         {aiCoaching.warning && (
//                           <div className="p-3 bg-red-500/20 border border-red-500 rounded">
//                             <div className="font-medium text-red-200 mb-1">⚠️ Warning</div>
//                             <p className="text-red-100">{aiCoaching.warning}</p>
//                           </div>
//                         )}
//                         {aiCoaching.suggestion && (
//                           <div className="p-3 bg-yellow-500/20 border border-yellow-500 rounded">
//                             <div className="font-medium text-yellow-200 mb-1">💡 Suggestion</div>
//                             <p className="text-yellow-100">{aiCoaching.suggestion}</p>
//                           </div>
//                         )}
//                       </div>
//                     ) : (
//                       <p className="text-gray-400 text-sm">🤖 AI coaching will appear as scammer speaks</p>
//                     )}
//                   </div>
                  
//                   {/* Intelligence Panel */}
//                   {intelligence && (intelligence.entities.length > 0 || intelligence.threatLevel > 0) && (
//                     <div>
//                       <h2 className="text-lg font-semibold text-white mb-4">🔍 Intelligence</h2>
                      
//                       {intelligence.threatLevel > 0 && (
//                         <div className="mb-4">
//                           <div className="text-sm text-yellow-200 mb-2">Threat Level</div>
//                           <div className="w-full bg-gray-700 rounded h-2 overflow-hidden">
//                             <motion.div
//                               className={`h-full ${
//                                 intelligence.threatLevel < 0.3 ? 'bg-green-500' :
//                                 intelligence.threatLevel < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
//                               }`}
//                               animate={{ width: `${intelligence.threatLevel * 100}%` }}
//                               transition={{ duration: 0.5 }}
//                             />
//                           </div>
//                           <p className="text-xs text-gray-400 mt-1">{(intelligence.threatLevel * 100).toFixed(0)}%</p>
//                         </div>
//                       )}
                      
//                       {intelligence.entities.length > 0 && (
//                         <div className="space-y-2">
//                           <div className="text-sm text-blue-200">Extracted Info</div>
//                           {intelligence.entities.slice(-5).map((e, i) => (
//                             <div key={i} className="text-xs p-2 bg-blue-500/10 border border-blue-500/20 rounded">
//                               <span className="font-bold text-blue-300">{e.type}:</span> {e.value}
//                             </div>
//                           ))}
//                         </div>
//                       )}
                      
//                       {intelligence.tactics.length > 0 && (
//                         <div className="mt-3 space-y-2">
//                           <div className="text-sm text-orange-200">Tactics</div>
//                           <div className="flex flex-wrap gap-1">
//                             {intelligence.tactics.map((t, i) => (
//                               <span key={i} className="px-2 py-1 text-xs bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-300">
//                                 {t}
//                               </span>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </GlassCard>
//             </div>
//           )}
          
//           {/* Right Column - Scammer gets simple view */}
//           {role === 'scammer' && (
//             <div className="lg:col-span-1">
//               <GlassCard className="p-6 h-[600px] flex flex-col">
//                 <h2 className="text-lg font-semibold text-white mb-4">📱 Call Status</h2>
//                 <div className="space-y-4">
//                   <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
//                     <p className="text-blue-200 text-sm">
//                       ✅ You are connected as the scammer. The operator is listening and evaluating your conversation.
//                     </p>
//                   </div>
                  
//                   <div className="space-y-2">
//                     <div className="text-sm text-gray-300">Your Role</div>
//                     <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded">
//                       <p className="text-white font-medium">☠️ Scammer</p>
//                       <p className="text-gray-300 text-xs mt-1">Play your part naturally. The operator will respond.</p>
//                     </div>
//                   </div>
                  
//                   <div className="space-y-2">
//                     <div className="text-sm text-gray-300">Connection</div>
//                     <div className={`p-3 rounded ${
//                       isPeerConnected 
//                         ? 'bg-green-500/20 border border-green-500/30' 
//                         : 'bg-yellow-500/20 border border-yellow-500/30'
//                     }`}>
//                       <p className={`font-medium ${isPeerConnected ? 'text-green-200' : 'text-yellow-200'}`}>
//                         {isPeerConnected ? '✅ Connected' : '⏳ Waiting...'}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </GlassCard>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LiveCallWebRTC;



/**
 * LiveCallWebRTC - Production Optimized Version
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
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

  const [callInfo, setCallInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1.0);
  const [showStats, setShowStats] = useState(false);
  const [audioNeedsEnable, setAudioNeedsEnable] = useState(true);
  const isMounted = useRef(true);

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
    disconnect
  } = useWebRTC(callId, role);

  /* ─────────────────────────────────────────────
     Lifecycle
  ───────────────────────────────────────────── */

  useEffect(() => {
    isMounted.current = true;

    if (!callId) {
      navigate('/dashboard');
      return;
    }

    const fetchCallInfo = async () => {
      try {
        const res = await API.get(`/api/call/info/${callId}`);
        if (isMounted.current) {
          setCallInfo(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch call info:', err);
      }
    };

    fetchCallInfo();

    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [callId, navigate, disconnect]);

  /* ─────────────────────────────────────────────
     Derived Values
  ───────────────────────────────────────────── */

  const connectionLabel = useMemo(() => {
    if (connectionState === 'connected') return 'text-green-400';
    if (connectionState === 'connecting') return 'text-yellow-400';
    return 'text-red-400';
  }, [connectionState]);

  const threatColor = useMemo(() => {
    if (intelligence.threatLevel < 0.3) return 'bg-green-500';
    if (intelligence.threatLevel < 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [intelligence.threatLevel]);

  /* ─────────────────────────────────────────────
     Handlers
  ───────────────────────────────────────────── */

  const handleEndCall = async () => {
    try {
      await API.post(`/webrtc/room/${callId}/end`);
    } catch (err) {
      console.error(err);
    } finally {
      disconnect();
      navigate('/dashboard');
    }
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(prev => !prev);
  };

  const handleToggleRemoteMute = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsRemoteMuted(!remoteAudioRef.current.muted);
    }
  };

  const handleRemoteVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setRemoteVolume(newVolume);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = newVolume;
    }
  };

  const handleEnableAudio = async () => {
    if (remoteAudioRef.current) {
      try {
        await remoteAudioRef.current.play();
        setAudioNeedsEnable(false);
        console.log('🔊 Audio enabled successfully');
      } catch (err) {
        console.error('Failed to enable audio:', err);
      }
    }
  };

  // Update remote audio settings whenever they change
  useEffect(() => {
    if (remoteAudioRef?.current) {
      remoteAudioRef.current.volume = remoteVolume;
      remoteAudioRef.current.muted = isRemoteMuted;
    }
  }, [remoteVolume, isRemoteMuted, remoteAudioRef]);

  /* ─────────────────────────────────────────────
     UI
  ───────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background py-8 px-4">

      {/* Hidden Remote Audio Element - controlled via UI buttons below */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Audio Enable Banner */}
        {audioNeedsEnable && isPeerConnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/20 border-2 border-yellow-500/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔊</span>
                <div>
                  <p className="text-white font-semibold">Enable Audio Playback</p>
                  <p className="text-yellow-200 text-sm">Click the button to hear the other person</p>
                </div>
              </div>
              <button
                onClick={handleEnableAudio}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Enable Audio
              </button>
            </div>
          </motion.div>
        )}

        {/* HEADER */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-2xl font-bold text-white">
                Live Call — {role === 'operator' ? '👤 Operator' : '☠️ Scammer'}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {isPeerConnected
                  ? '🔗 Peer Connected'
                  : isConnected
                    ? '⏳ Waiting for peer...'
                    : '🔌 Connecting...'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-right">
                <div className="text-gray-400 text-xs">Connection</div>
                <div className={`font-medium ${connectionLabel}`}>
                  {connectionState}
                </div>
              </div>

              <button
                onClick={() => setShowStats(s => !s)}
                className="px-3 py-2 bg-white/10 rounded text-white text-sm"
              >
                {showStats ? 'Hide Stats' : 'Stats'}
              </button>

              <button
                onClick={handleEndCall}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white font-medium"
              >
                End Call
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">
              ⚠ {error}
            </div>
          )}
        </GlassCard>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* AUDIO CONTROL */}
          <GlassCard className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">🎤 Audio Control</h2>

            {/* Microphone Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>🎤 Microphone</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${isMuted ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                  {isMuted ? 'Muted' : 'Active'}
                </span>
              </div>

              <button
                onClick={handleToggleMute}
                className={`w-full py-3 rounded font-medium flex justify-center items-center gap-2 transition-colors ${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-4"></div>

            {/* Remote Audio (Speaker) Control */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-300">
                <span>🔊 Remote Audio</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isPeerConnected 
                    ? isRemoteMuted ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {!isPeerConnected ? 'Not Connected' : isRemoteMuted ? 'Muted' : 'Playing'}
                </span>
              </div>

              <button
                onClick={handleToggleRemoteMute}
                disabled={!isPeerConnected}
                className={`w-full py-2 rounded font-medium flex justify-center items-center gap-2 transition-colors text-sm ${
                  !isPeerConnected
                    ? 'bg-gray-500/30 text-gray-500 cursor-not-allowed'
                    : isRemoteMuted 
                      ? 'bg-red-500/40 hover:bg-red-500/60 text-red-200' 
                      : 'bg-blue-500/40 hover:bg-blue-500/60 text-blue-200'
                }`}
              >
                {isRemoteMuted ? '🔇 Unmute Speaker' : '🔊 Mute Speaker'}
              </button>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Volume</span>
                  <span>{Math.round(remoteVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={remoteVolume}
                  onChange={handleRemoteVolumeChange}
                  disabled={!isPeerConnected}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Recording indicator */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-200">
                <p>✅ Audio recording automatically every 5 seconds</p>
                <p className="mt-1 opacity-80">Transcriptions appear instantly as you speak</p>
              </div>
            </div>
          </GlassCard>

          {/* TRANSCRIPT */}
          <GlassCard className="p-6 h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4">🎙 Transcript</h2>

            <div className="flex-1 overflow-y-auto space-y-3">
              {transcripts.length === 0 && (
                <p className="text-gray-400 text-sm text-center mt-8">
                  Waiting for conversation...
                </p>
              )}

              <AnimatePresence>
                {transcripts.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded text-sm ${t.speaker === 'operator'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-purple-500/20 border border-purple-500/30'
                      }`}
                  >
                    <div className="font-medium text-gray-200 mb-1">
                      {t.speaker === 'operator' ? 'You' : 'Scammer'}
                    </div>
                    <p className="text-white">{t.text}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>

          {/* OPERATOR PANEL */}
          {role === 'operator' && (
            <GlassCard className="p-6 h-[600px] overflow-y-auto space-y-6">
              <h2 className="text-lg font-semibold text-white">🤖 AI Intelligence</h2>

              {/* Threat */}
              {intelligence.threatLevel > 0 && (
                <div>
                  <div className="text-sm text-yellow-200 mb-2">Threat Level</div>
                  <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
                    <motion.div
                      className={`h-full ${threatColor}`}
                      animate={{ width: `${intelligence.threatLevel * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Coaching */}
              {aiCoaching?.suggestions?.length > 0 && (
                <div className="space-y-2 text-sm">
                  {aiCoaching.suggestions.map((s, i) => (
                    <div key={i} className="p-2 bg-yellow-500/20 border border-yellow-500 rounded">
                      💡 {s}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCallWebRTC;
