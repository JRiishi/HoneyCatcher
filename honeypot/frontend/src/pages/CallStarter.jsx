import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, FileJson, Zap, Check, Copy, Headphones, Link as LinkIcon, AlertTriangle, Shield, Activity, Terminal } from 'lucide-react';
import Navbar from '../components/Navbar';

const CallStarter = () => {
  const navigate = useNavigate();
  const [operatorName, setOperatorName] = useState('');
  const [metadata, setMetadata] = useState('');
  const [loading, setLoading] = useState(false);
  const [callLinks, setCallLinks] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const startCall = async () => {
    setLoading(true);
    setError('');
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_BASE}/call/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_SECRET || 'unsafe-secret-key-change-me'
        },
        body: JSON.stringify({
          operator_name: operatorName || 'Operator',
          metadata: metadata ? JSON.parse(metadata) : {}
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const data = await response.json();
      setCallLinks(data);
      
    } catch (err) {
      console.error('Error starting call:', err);
      setError(err.message || 'Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  const joinAsOperator = () => {
    if (callLinks) {
      navigate(`/live-call?call_id=${callLinks.call_id}&role=operator`);
    }
  };

  const copyScammerLink = () => {
    const fullLink = `${window.location.origin}/live-call?call_id=${callLinks.call_id}&role=scammer`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 selection:bg-emerald-500/30 overflow-x-hidden font-sans">
      {/* Immersive Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <Navbar />
      
      <main className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-20">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase">
              Live Call System
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 tracking-widest">ACTIVE</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-4">
            LIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">CALL</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-500 text-lg font-medium leading-relaxed">
            Real-time two-way voice communication with AI-powered intelligence extraction and operator coaching
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!callLinks ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <div className="p-8 md:p-12 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl space-y-8">
                {/* Operator Name */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono ml-1">
                    <User className="w-3 h-3" /> Operator Identity
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Enter your operator name"
                    className="w-full px-6 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                  />
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono ml-1">
                    <FileJson className="w-3 h-3" /> Metadata (Optional)
                  </label>
                  <textarea
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    placeholder={'{"target": "Tech Support Scam", "location": "India"}'}
                    className="w-full px-6 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                    rows={3}
                  />
                  <p className="text-xs text-slate-600 ml-1 font-medium">
                    Add contextual information as JSON for intelligence pipeline
                  </p>
                </div>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                    >
                      <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="font-semibold">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Start Button */}
                <button
                  onClick={startCall}
                  disabled={loading}
                  className="group relative w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-black font-black rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>INITIALIZING CALL...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        <span>START CALL SESSION</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Info Box */}
                <div className="p-6 bg-white/[0.02] border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-black text-emerald-400 uppercase text-sm tracking-wider">How it works</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-400 font-medium">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>You join as the <strong className="text-white">Operator</strong> with full AI assistance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Share the scammer link with your target for engagement</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Bidirectional real-time audio streaming between both parties</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>AI extracts intelligence, entities, and threat levels automatically</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Receive real-time coaching suggestions during conversation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="p-8 md:p-12 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl space-y-8">
                {/* Success Header */}
                <div className="text-center py-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                    CALL SESSION ACTIVE
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Terminal className="w-4 h-4" />
                    <span className="font-mono text-sm">ID:</span>
                    <span className="text-emerald-400 font-mono font-bold">{callLinks.call_id}</span>
                  </div>
                </div>

                {/* Operator Action */}
                <div className="p-6 md:p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
                      <Headphones className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-emerald-400 uppercase text-sm tracking-wider">Step 1</h3>
                      <p className="text-white font-bold">Join as Operator</p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Click below to join the call with AI assistance. You'll have access to
                    real-time transcription, intelligence extraction, and coaching suggestions.
                  </p>
                  <button
                    onClick={joinAsOperator}
                    className="group relative w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Headphones className="w-5 h-5" />
                      <span>JOIN AS OPERATOR</span>
                    </div>
                  </button>
                </div>

                {/* Scammer Link */}
                <div className="p-6 md:p-8 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/20">
                      <LinkIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-red-400 uppercase text-sm tracking-wider">Step 2</h3>
                      <p className="text-white font-bold">Share Scammer Link</p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Copy the link below and share it with the target. They will
                    join without seeing any intelligence features - completely asymmetric.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={`${window.location.origin}/live-call?call_id=${callLinks.call_id}&role=scammer`}
                      readOnly
                      className="flex-1 px-4 py-3 bg-black/30 border border-red-500/20 rounded-xl text-white font-mono text-xs md:text-sm"
                    />
                    <button
                      onClick={copyScammerLink}
                      className="group relative px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all overflow-hidden shrink-0"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                      <div className="relative flex items-center gap-2">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden md:inline">{copied ? 'COPIED' : 'COPY'}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="p-6 bg-white/[0.02] border border-yellow-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-black text-yellow-400 uppercase text-sm tracking-wider">Important Notes</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-400 font-medium">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                      <span>Join as operator <strong className="text-white">first</strong> before sharing scammer link</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                      <span>The scammer won't see transcripts, intelligence, or AI coaching</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                      <span>Ensure microphone permissions are enabled in your browser</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                      <span>End the call when done to generate the intelligence report</span>
                    </li>
                  </ul>
                </div>

                {/* Start New Call */}
                <button
                  onClick={() => {
                    setCallLinks(null);
                    setOperatorName('');
                    setMetadata('');
                  }}
                  className="w-full py-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  START NEW CALL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CallStarter;
