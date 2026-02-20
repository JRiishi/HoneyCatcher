import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import liveService from '../services/liveApi';
import GlassCard from '../components/GlassCard';
import MessageBubble from '../components/MessageBubble';
import IntelligencePanel from '../components/IntelligencePanel';

const LiveTakeoverScreen = ({ route, navigation }) => {
  const sessionIdParam = route?.params?.sessionId;

  const [sessionId, setSessionId] = useState(sessionIdParam || null);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('ai_takeover');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [transcript, setTranscript] = useState([]);
  const [coachingScripts, setCoachingScripts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [threatLevel, setThreatLevel] = useState(0);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [tab, setTab] = useState('chat');

  const recordingRef = useRef(null);
  const durationRef = useRef(null);
  const flatListRef = useRef(null);

  // Register event listeners
  useEffect(() => {
    const unsubs = [
      liveService.on('connected', () => setIsConnected(true)),
      liveService.on('disconnected', () => setIsConnected(false)),
      liveService.on('transcription', (data) => {
        setTranscript(prev => [...prev, {
          sender: 'scammer', content: data.text,
          timestamp: data.timestamp || new Date().toISOString(),
        }]);
      }),
      liveService.on('ai_response', (data) => {
        setTranscript(prev => [...prev, {
          sender: 'agent', content: data.text,
          timestamp: data.timestamp || new Date().toISOString(),
        }]);
        if (data.audio) playAudioBase64(data.audio);
      }),
      liveService.on('coaching_scripts', (data) => {
        setCoachingScripts(data.scripts || []);
      }),
      liveService.on('intelligence', (data) => {
        if (data.new_entities) setEntities(prev => [...prev, ...data.new_entities]);
      }),
      liveService.on('threat', (data) => {
        setThreatLevel(data.level || 0);
      }),
      liveService.on('mode_switched', (data) => setMode(data.new_mode)),
      liveService.on('session_ended', () => {
        setIsActive(false);
        setIsRecording(false);
        stopRecording();
      }),
      liveService.on('error', (data) => {
        setError(data.message || 'Connection error');
        setTimeout(() => setError(null), 5000);
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  // Duration timer
  useEffect(() => {
    if (isActive) {
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [isActive]);

  // Auto-scroll
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [transcript]);

  // Audio playback
  const playAudioBase64 = useCallback(async (base64) => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}live_audio_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  // Start session
  const startSession = async () => {
    try {
      const result = await liveService.startSession(sessionIdParam, mode);
      const sid = result?.data?.session_id || result?.session_id;
      setSessionId(sid);
      setIsActive(true);
      setDuration(0);
      liveService.connect(sid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError('Failed to start session');
    }
  };

  // End session
  const endSession = async () => {
    Alert.alert('End Session', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End', style: 'destructive', onPress: async () => {
          stopRecording();
          if (sessionId) await liveService.endSession(sessionId);
          liveService.disconnect();
          setIsActive(false);
          clearInterval(durationRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      },
    ]);
  };

  // Recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { setError('Mic permission denied'); return; }

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      setError('Recording failed');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      // Upload audio chunk
      if (uri && liveService.isConnected) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        liveService.sendAudioChunk(base64, 'm4a');
      }
    } catch (e) {
      console.warn('Stop recording error:', e);
    }
  };

  // Switch mode
  const switchMode = async (newMode) => {
    if (sessionId) await liveService.switchMode(sessionId, newMode);
    setMode(newMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const threatColor = threatLevel > 0.8 ? '#ef4444' : threatLevel > 0.5 ? '#eab308' : '#10b981';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.liveDot, { backgroundColor: isActive ? '#ef4444' : '#475569' }]} />
          <Text style={styles.headerTitle}>
            {isActive ? 'LIVE SESSION' : 'LIVE TAKEOVER'}
          </Text>
        </View>
        {isActive && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Pre-session state */}
      {!isActive && (
        <View style={styles.preSession}>
          <Text style={styles.preTitle}>🎙 Live Takeover Mode</Text>
          <Text style={styles.preSubtitle}>
            Take control of an active scam call with AI assistance
          </Text>

          {/* Mode selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeOpt, mode === 'ai_takeover' && styles.modeOptActive]}
              onPress={() => setMode('ai_takeover')}
            >
              <Text style={styles.modeOptIcon}>🤖</Text>
              <Text style={[styles.modeOptName, mode === 'ai_takeover' && styles.modeOptNameActive]}>AI TAKEOVER</Text>
              <Text style={styles.modeOptDesc}>AI handles the conversation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOpt, mode === 'ai_coached' && styles.modeOptActive]}
              onPress={() => setMode('ai_coached')}
            >
              <Text style={styles.modeOptIcon}>🎯</Text>
              <Text style={[styles.modeOptName, mode === 'ai_coached' && styles.modeOptNameActive]}>AI COACHED</Text>
              <Text style={styles.modeOptDesc}>You speak, AI coaches you</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>🔴 START LIVE SESSION</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active session */}
      {isActive && (
        <>
          {/* Status bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>MODE</Text>
              <Text style={styles.statusValue}>{mode === 'ai_takeover' ? '🤖 AI' : '🎯 COACHED'}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>THREAT</Text>
              <Text style={[styles.statusValue, { color: threatColor }]}>
                {(threatLevel * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>SIGNAL</Text>
              <Text style={[styles.statusValue, { color: isConnected ? '#10b981' : '#ef4444' }]}>
                {isConnected ? 'LIVE' : 'OFF'}
              </Text>
            </View>
          </View>

          {/* Mode switch */}
          <View style={styles.modeSwitchRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'ai_takeover' && styles.modeChipActive]}
              onPress={() => switchMode('ai_takeover')}
            >
              <Text style={[styles.modeChipText, mode === 'ai_takeover' && styles.modeChipTextActive]}>
                🤖 AI Takeover
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'ai_coached' && styles.modeChipActive]}
              onPress={() => switchMode('ai_coached')}
            >
              <Text style={[styles.modeChipText, mode === 'ai_coached' && styles.modeChipTextActive]}>
                🎯 Coached
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={styles.tabs}>
            {['chat', 'coaching', 'intel'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'chat' ? '💬 Chat' : t === 'coaching' ? '🧠 Coaching' : '🔍 Intel'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View style={styles.contentArea}>
            {tab === 'chat' && (
              <FlatList
                ref={flatListRef}
                data={transcript}
                renderItem={({ item }) => <MessageBubble message={item} />}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.chatList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Waiting for conversation...</Text>
                }
              />
            )}
            {tab === 'coaching' && (
              <FlatList
                data={coachingScripts}
                renderItem={({ item, index }) => (
                  <TouchableOpacity key={index} style={styles.coachCard}>
                    <Text style={styles.coachText}>{item}</Text>
                    <Text style={styles.coachHint}>Tap to mark as spoken</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.chatList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>AI coaching scripts will appear here...</Text>
                }
              />
            )}
            {tab === 'intel' && (
              <View style={styles.intelWrap}>
                <IntelligencePanel
                  intelligence={{
                    bank_accounts: entities.filter(e => e.type === 'bank_account').map(e => e.value),
                    upi_ids: entities.filter(e => e.type === 'upi_id').map(e => e.value),
                    phone_numbers: entities.filter(e => e.type === 'phone').map(e => e.value),
                    urls: entities.filter(e => e.type === 'url').map(e => e.value),
                    scam_keywords: entities.filter(e => e.type === 'keyword').map(e => e.value),
                  }}
                />
              </View>
            )}
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            {mode === 'ai_coached' && (
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.endBtn} onPress={endSession}>
              <Text style={styles.endBtnText}>📵 END SESSION</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  duration: { color: '#f87171', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  errorBanner: {
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: '#fca5a5', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  preSession: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  preTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  preSubtitle: { color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  modeSelector: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  modeOpt: {
    flex: 1, padding: 18, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modeOptActive: {
    backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)',
  },
  modeOptIcon: { fontSize: 28, marginBottom: 8 },
  modeOptName: { color: '#6b7280', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  modeOptNameActive: { color: '#34d399' },
  modeOptDesc: { color: '#475569', fontSize: 10, marginTop: 4, textAlign: 'center' },
  startBtn: {
    backgroundColor: '#dc2626', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  statusBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 10,
  },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { color: '#475569', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  statusValue: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },
  modeSwitchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  modeChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  modeChipActive: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  modeChipText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  modeChipTextActive: { color: '#34d399' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
  tabText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#34d399' },
  contentArea: { flex: 1 },
  chatList: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 40 },
  coachCard: {
    backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
    borderRadius: 14, padding: 16, marginBottom: 8, marginHorizontal: 16,
  },
  coachText: { color: '#d1d5db', fontSize: 14, lineHeight: 22, marginBottom: 6 },
  coachHint: { color: '#34d399', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  intelWrap: { paddingHorizontal: 16 },
  controls: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  micBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.3)',
  },
  micIcon: { fontSize: 24 },
  endBtn: {
    flex: 1, backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  endBtnText: { color: '#f87171', fontSize: 14, fontWeight: '800' },
});

export default LiveTakeoverScreen;
