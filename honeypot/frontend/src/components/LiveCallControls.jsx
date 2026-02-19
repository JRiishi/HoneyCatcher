import React from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, ArrowLeftRight,
  FileText, Download, Radio
} from 'lucide-react';
import { motion } from 'framer-motion';

const LiveCallControls = ({
  isActive,
  isRecording,
  mode,
  onStart,
  onEnd,
  onModeSwitch,
  onToggleRecording,
  onDownloadReport
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl"
    >
      {/* Start / End Session */}
      {!isActive ? (
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all active:scale-95"
        >
          <Phone className="w-4 h-4" />
          Start Session
        </button>
      ) : (
        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all active:scale-95"
        >
          <PhoneOff className="w-4 h-4" />
          End Session
        </button>
      )}

      {/* Mic Toggle */}
      {isActive && (
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${
            isRecording
              ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
              : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          {isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
          {isRecording ? 'Recording' : 'Muted'}
        </button>
      )}

      {/* Mode Switch */}
      <button
        onClick={onModeSwitch}
        className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white font-bold transition-all active:scale-95"
      >
        <ArrowLeftRight className="w-4 h-4" />
        <span className="text-sm">
          {mode === 'ai_takeover' ? 'Switch to Coach' : 'Switch to AI'}
        </span>
      </button>

      {/* Mode Indicator */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
        mode === 'ai_takeover'
          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      }`}>
        {mode === 'ai_takeover' ? (
          <>
            <Radio className="w-3 h-3" />
            <span className="text-xs font-black tracking-wider uppercase">AI Takeover</span>
          </>
        ) : (
          <>
            <Radio className="w-3 h-3" />
            <span className="text-xs font-black tracking-wider uppercase">AI Coach</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reports */}
      {isActive && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownloadReport('json')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white text-xs font-bold transition-all"
          >
            <FileText className="w-3 h-3" />
            JSON
          </button>
          <button
            onClick={() => onDownloadReport('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white text-xs font-bold transition-all"
          >
            <Download className="w-3 h-3" />
            PDF
          </button>
          <button
            onClick={() => onDownloadReport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white text-xs font-bold transition-all"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default LiveCallControls;
