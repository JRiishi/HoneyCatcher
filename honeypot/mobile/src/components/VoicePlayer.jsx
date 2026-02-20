import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { API_BASE_URL } from '@env';

const VoicePlayer = ({ audioUrl, transcription, naturalizedText, autoPlay = true, timestamp }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef(null);

  // Build full URL
  const baseUrl = (API_BASE_URL || 'https://honeycatcher.onrender.com/api').replace('/api', '');
  const fullUrl = audioUrl?.startsWith('/') ? `${baseUrl}${audioUrl}` : audioUrl;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (fullUrl && autoPlay) {
      const timer = setTimeout(() => playAudio(), 800);
      return () => clearTimeout(timer);
    }
  }, [fullUrl]);

  const playAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.warn('Playback error:', err);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setProgress(status.positionMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!soundRef.current) {
      await playAudio();
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const formatMs = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🔊</Text>
          </View>
          <View>
            <Text style={styles.title}>ACOUSTIC ANALYSIS</Text>
            <Text style={styles.time}>
              {timestamp ? new Date(timestamp).toLocaleTimeString() : 'SYNTHESIZED LIVE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Player */}
      <View style={styles.player}>
        <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>

        <View style={styles.progressArea}>
          <View style={styles.progressRow}>
            <View style={styles.statusDot}>
              <View style={[styles.dot, { backgroundColor: isPlaying ? '#34d399' : '#475569' }]} />
              <Text style={[styles.statusLabel, isPlaying && { color: '#34d399' }]}>
                {isPlaying ? 'PLAYING...' : 'READY'}
              </Text>
            </View>
            <Text style={styles.timeLabel}>{formatMs(progress)} / {formatMs(duration)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      </View>

      {/* Naturalized text */}
      {naturalizedText && (
        <View style={styles.naturalizedBox}>
          <View style={styles.naturalizedBadge}>
            <Text style={styles.naturalizedBadgeText}>NATURALIZED</Text>
          </View>
          <Text style={styles.naturalizedText}>"{naturalizedText}"</Text>
        </View>
      )}

      {/* Transcription */}
      {transcription && (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionLabel}>BASE TRANSCRIPT</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  iconEmoji: { fontSize: 16 },
  title: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  time: { color: '#475569', fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  player: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  playIcon: { fontSize: 20 },
  progressArea: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusDot: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  statusLabel: { color: '#475569', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  timeLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' },
  progressTrack: { height: 6, backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },
  naturalizedBox: {
    marginTop: 12, padding: 12,
    backgroundColor: 'rgba(16,185,129,0.05)',
    borderLeftWidth: 2, borderLeftColor: 'rgba(16,185,129,0.3)',
    borderRadius: 8,
  },
  naturalizedBadge: { position: 'absolute', top: 6, right: 8 },
  naturalizedBadgeText: {
    fontSize: 7, fontWeight: '900', letterSpacing: 0.5,
    color: '#34d399', backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  naturalizedText: { color: '#a7f3d0', fontSize: 13, fontStyle: 'italic', lineHeight: 20, paddingRight: 50 },
  transcriptionBox: { marginTop: 10, paddingHorizontal: 12 },
  transcriptionLabel: { color: '#475569', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  transcriptionText: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
});

export default VoicePlayer;
