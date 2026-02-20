import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

const VoiceRecorder = ({ sessionId, onTranscription, mode = 'ai_speaks' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  // Animated waveform bars
  const bars = useRef(Array(20).fill(null).map(() => new Animated.Value(15))).current;

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        bars.forEach(bar => {
          Animated.timing(bar, {
            toValue: Math.random() * 40 + 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      }, 120);
    } else {
      bars.forEach(bar => {
        Animated.timing(bar, { toValue: 15, duration: 300, useNativeDriver: false }).start();
      });
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setError(null);
      setDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      clearInterval(timerRef.current);
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) await uploadAudio(uri);
    } catch (err) {
      console.error('Stop recording error:', err);
      setError('Failed to stop recording');
    }
  };

  const uploadAudio = async (uri) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'scammer_audio.m4a',
      });
      formData.append('sessionId', sessionId);
      formData.append('mode', mode);

      const response = await api.post('/voice/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onTranscription) onTranscription(response.data);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Check connection.');
    } finally {
      setIsProcessing(false);
      setDuration(0);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, { backgroundColor: isRecording ? '#ef4444' : '#10b981' }]} />
          <Text style={styles.statusText}>
            {isProcessing ? 'DECODING...' : isRecording ? 'INTERCEPTING' : 'SYSTEM READY'}
          </Text>
        </View>
      </View>

      {/* Waveform */}
      <View style={styles.waveform}>
        {bars.map((bar, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: bar,
                backgroundColor: isRecording ? '#ef4444' : '#1e293b',
              },
            ]}
          />
        ))}
      </View>

      {/* Record button */}
      <TouchableOpacity
        style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        {isProcessing ? (
          <Text style={styles.btnIcon}>⏳</Text>
        ) : isRecording ? (
          <View style={styles.stopIcon} />
        ) : (
          <Text style={styles.btnIcon}>🎙</Text>
        )}
      </TouchableOpacity>

      {/* Timer */}
      <Text style={[styles.timer, isRecording && styles.timerActive]}>{formatTime(duration)}</Text>
      <Text style={styles.hint}>
        {isRecording ? 'VOICE ENCRYPTION ACTIVE' : 'TAP TO SCAN VOICESCAPE'}
      </Text>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Mode indicator */}
      <View style={styles.modeRow}>
        <View style={[styles.modeChip, mode === 'ai_speaks' && styles.modeActive]}>
          <Text style={[styles.modeText, mode === 'ai_speaks' && styles.modeTextActive]}>🔊 AUTO-SPEAK</Text>
        </View>
        <View style={[styles.modeChip, mode === 'ai_suggests' && styles.modeActive]}>
          <Text style={[styles.modeText, mode === 'ai_suggests' && styles.modeTextActive]}>💬 SUGGESTIVE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { color: '#94a3b8', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  waveform: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 50, gap: 2, marginBottom: 24 },
  bar: { width: 3, borderRadius: 2 },
  recordBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  recordBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: 'rgba(248,113,113,0.5)',
    shadowColor: '#ef4444', shadowOpacity: 0.4,
  },
  stopIcon: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#fff' },
  btnIcon: { fontSize: 32 },
  timer: { color: '#475569', fontSize: 28, fontWeight: '700', fontFamily: 'monospace', marginTop: 12 },
  timerActive: { color: '#fff' },
  hint: { color: '#475569', fontSize: 10, fontWeight: '500', letterSpacing: 1, marginTop: 6, marginBottom: 16 },
  errorBox: {
    width: '100%', padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 11, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 8 },
  modeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'transparent',
  },
  modeActive: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  modeText: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  modeTextActive: { color: '#34d399' },
});

export default VoiceRecorder;
