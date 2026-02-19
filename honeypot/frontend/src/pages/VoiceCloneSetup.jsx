import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Upload, Trash2, Play, Pause, Volume2,
  CheckCircle, AlertCircle, Loader2, ArrowLeft, HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { liveService } from '../services/liveApi';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';

const VoiceCloneSetup = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  const [voices, setVoices] = useState([]);
  const [quota, setQuota] = useState(null);
  const [files, setFiles] = useState([]);
  const [cloneName, setCloneName] = useState('');
  const [cloneDesc, setCloneDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);
  const [playingPreview, setPlayingPreview] = useState(null);
  const [previewText, setPreviewText] = useState('Hello, this is a test of the cloned voice.');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVoices();
    loadQuota();
  }, []);

  const loadVoices = async () => {
    try {
      const data = await liveService.listVoices();
      setVoices(data.voices || []);
    } catch (err) {
      console.error('Failed to load voices:', err);
    }
  };

  const loadQuota = async () => {
    try {
      const data = await liveService.getVoiceQuota();
      setQuota(data);
    } catch (err) {
      console.error('Failed to load quota:', err);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const audioFiles = selected.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i));
    if (audioFiles.length === 0) {
      setError('Please select audio files (MP3, WAV, OGG, M4A, FLAC)');
      return;
    }
    setFiles(prev => [...prev, ...audioFiles].slice(0, 25));
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!cloneName.trim()) {
      setError('Please enter a voice name');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one audio sample');
      return;
    }

    setIsCreating(true);
    setCreateStatus(null);
    setError(null);

    try {
      const result = await liveService.createVoiceClone(files, cloneName.trim(), cloneDesc.trim());
      setCreateStatus({ success: true, voiceId: result.voice_id });
      setFiles([]);
      setCloneName('');
      setCloneDesc('');
      loadVoices();
      loadQuota();
    } catch (err) {
      setCreateStatus({ success: false, error: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreview = async (voiceId) => {
    if (playingPreview === voiceId) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }

    try {
      setPlayingPreview(voiceId);
      const data = await liveService.previewVoice(voiceId, previewText);

      if (data.audio_base64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.onended = () => setPlayingPreview(null);
          audioRef.current.play();
        }
      }
    } catch (err) {
      setPlayingPreview(null);
      setError('Preview failed: ' + err.message);
    }
  };

  const handleDelete = async (voiceId) => {
    if (!confirm('Delete this voice clone? This cannot be undone.')) return;
    try {
      await liveService.deleteVoice(voiceId);
      loadVoices();
      loadQuota();
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSize = 50 * 1024 * 1024; // 50MB

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Navbar />
      <audio ref={audioRef} className="hidden" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/live-takeover')}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Voice Clone Setup</h1>
            <p className="text-sm text-slate-600">Create and manage voice clones for AI takeover mode</p>
          </div>
        </div>

        {/* Quota Info */}
        {quota && (
          <div className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-slate-500">
            <HardDrive className="w-4 h-4" />
            <span>Characters: <b className="text-white">{quota.character_count?.toLocaleString()}</b> / {quota.character_limit?.toLocaleString()}</span>
            <span>Voices: <b className="text-white">{quota.voice_count}</b> / {quota.voice_limit}</span>
          </div>
        )}

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400">&times;</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Voice Clone */}
        <GlassCard>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" />
            Create New Voice Clone
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Voice Name *</label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="e.g. Grandma Voice"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-700 focus:border-emerald-500/30 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Description</label>
                <input
                  type="text"
                  value={cloneDesc}
                  onChange={(e) => setCloneDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-700 focus:border-emerald-500/30 outline-none"
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/30 transition-all"
            >
              <Upload className="w-8 h-8 mx-auto text-slate-700 mb-2" />
              <p className="text-sm text-slate-500">Click to upload audio samples (1-25 files, max 50MB total)</p>
              <p className="text-xs text-slate-700 mt-1">MP3, WAV, OGG, M4A, FLAC</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{files.length} file(s) selected</span>
                  <span className={totalSize > maxSize ? 'text-red-400' : ''}>
                    {(totalSize / 1024 / 1024).toFixed(1)} MB / 50 MB
                  </span>
                </div>
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/5 rounded-lg">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-slate-400 flex-1 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-700">{(file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} className="text-slate-700 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={isCreating || !cloneName.trim() || files.length === 0 || totalSize > maxSize}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Voice Clone...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Create Voice Clone
                </>
              )}
            </button>

            {/* Create Status */}
            <AnimatePresence>
              {createStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    createStatus.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  {createStatus.success ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Voice clone created! ID: {createStatus.voiceId}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      {createStatus.error}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Existing Voices */}
        <GlassCard>
          <h2 className="text-lg font-bold mb-4">Your Voice Clones</h2>

          {/* Preview Text */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Preview Text</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-700 focus:border-emerald-500/30 outline-none"
            />
          </div>

          {voices.length === 0 ? (
            <div className="text-center py-8 text-slate-700">
              <Mic className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No voice clones yet</p>
              <p className="text-xs text-slate-800">Create one above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {voices.map((voice) => (
                <div
                  key={voice.voice_id}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{voice.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono truncate">{voice.voice_id}</p>
                  </div>
                  <button
                    onClick={() => handlePreview(voice.voice_id)}
                    className={`p-2 rounded-lg transition-all ${
                      playingPreview === voice.voice_id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-slate-500 hover:text-white'
                    }`}
                  >
                    {playingPreview === voice.voice_id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(voice.voice_id)}
                    className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default VoiceCloneSetup;
