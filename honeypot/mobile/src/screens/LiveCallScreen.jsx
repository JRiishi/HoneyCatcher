import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import liveService from '../services/liveApi';
import GlassCard from '../components/GlassCard';
import MessageBubble from '../components/MessageBubble';
import IntelligencePanel from '../components/IntelligencePanel';

const LiveCallScreen = ({ route, navigation }) => {
  const sessionIdParam = route?.params?.sessionId;

  const [sessionId, setSessionId] = useState(sessionIdParam);
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState('ai_takeover');
  const [transcript, setTranscript] = useState([]);
  const [input, setInput] = useState('');
  const [intelligence, setIntelligence] = useState({});
  const [threatLevel, setThreatLevel] = useState(0);
  const [coachScripts, setCoachScripts] = useState([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('chat');

  const flatListRef = useRef(null);
  const durationRef = useRef(null);

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
        if (data.audio) playAudio(data.audio);
      }),
      liveService.on('coaching_scripts', (data) => setCoachScripts(data.scripts || [])),
      liveService.on('intelligence_update', (data) => {
        if (data.extracted_intelligence) setIntelligence(data.extracted_intelligence);
      }),
      liveService.on('threat_update', (data) => setThreatLevel(data.level || 0)),
      liveService.on('error', (data) => {
        setError(data.message);
        setTimeout(() => setError(null), 5000);
      }),
      liveService.on('session_ended', () => {
        setIsActive(false);
        liveService.disconnect();
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  useEffect(() => {
    if (isActive) {
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [isActive]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [transcript]);

  const playAudio = async (base64) => {
    try {
      const uri = `${FileSystem.cacheDirectory}live_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) sound.unloadAsync(); });
    } catch (e) { console.warn('Audio error:', e); }
  };

  const startSession = async () => {
    try {
      const result = await liveService.startSession(sessionIdParam, mode);
      const sid = result?.data?.session_id || result?.session_id;
      setSessionId(sid);
      liveService.connect(sid);
      setIsActive(true);
      setDuration(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError('Failed to start session');
    }
  };

  const endSession = async () => {
    clearInterval(durationRef.current);
    if (sessionId) await liveService.endSession(sessionId);
    liveService.disconnect();
    setIsActive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const sendText = () => {
    if (!input.trim() || !isConnected) return;
    liveService.sendTextInput(input.trim());
    setTranscript(prev => [...prev, {
      sender: 'agent', content: input.trim(),
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const threatColor = threatLevel > 0.8 ? '#ef4444' : threatLevel > 0.5 ? '#eab308' : '#10b981';

  if (!isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LIVE CALL</Text>
          <View />
        </View>

        <View style={styles.preSession}>
          <Text style={styles.preIcon}>📞</Text>
          <Text style={styles.preTitle}>Live Call Mode</Text>
          <Text style={styles.preSubtitle}>Connect to an active call with text-based interaction</Text>

          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeOpt, mode === 'ai_takeover' && styles.modeOptActive]}
              onPress={() => setMode('ai_takeover')}
            >
              <Text style={[styles.modeOptText, mode === 'ai_takeover' && styles.modeOptTextActive]}>
                🤖 AI Takeover
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOpt, mode === 'ai_coached' && styles.modeOptActive]}
              onPress={() => setMode('ai_coached')}
            >
              <Text style={[styles.modeOptText, mode === 'ai_coached' && styles.modeOptTextActive]}>
                🎯 AI Coached
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>🟢 START LIVE CALL</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Active header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.liveDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
          <Text style={styles.headerTitle}>LIVE</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.timerText}>{formatTime(duration)}</Text>
          <Text style={[styles.threatText, { color: threatColor }]}>
            THREAT {(threatLevel * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {['chat', 'coaching', 'intel'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chat' ? '💬' : t === 'coaching' ? '🧠' : '🔍'} {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
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
            data={coachScripts}
            renderItem={({ item }) => (
              <View style={styles.coachItem}>
                <Text style={styles.coachItemText}>{item}</Text>
              </View>
            )}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.chatList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Coaching scripts appear here...</Text>
            }
          />
        )}
        {tab === 'intel' && (
          <View style={styles.intelWrap}>
            <IntelligencePanel intelligence={intelligence} />
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.bottomBar}>
          {mode === 'ai_coached' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Type message to send..."
                placeholderTextColor="#475569"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
                onPress={sendText}
                disabled={!input.trim()}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.endBtn} onPress={endSession}>
            <Text style={styles.endBtnText}>📵 END CALL</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerText: { color: '#f87171', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  threatText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  errorBar: {
    marginHorizontal: 16, marginBottom: 6, padding: 8, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: '#fca5a5', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  preSession: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  preIcon: { fontSize: 48, marginBottom: 16 },
  preTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 6 },
  preSubtitle: { color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  modeSelector: { flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%' },
  modeOpt: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)',
  },
  modeOptActive: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' },
  modeOptText: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  modeOptTextActive: { color: '#34d399' },
  startBtn: {
    width: '100%', backgroundColor: '#059669', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  tabText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#34d399' },
  content: { flex: 1 },
  chatList: { paddingHorizontal: 4, paddingBottom: 16 },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 40, fontSize: 13 },
  coachItem: {
    backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.12)',
    borderRadius: 12, padding: 14, marginBottom: 8, marginHorizontal: 16,
  },
  coachItemText: { color: '#d1d5db', fontSize: 13, lineHeight: 20 },
  intelWrap: { paddingHorizontal: 16 },
  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  inputRow: { flexDirection: 'row', marginBottom: 8 },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, color: '#e5e7eb', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  sendIcon: { color: '#fff', fontSize: 18 },
  endBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  endBtnText: { color: '#f87171', fontSize: 14, fontWeight: '800' },
});

export default LiveCallScreen;
