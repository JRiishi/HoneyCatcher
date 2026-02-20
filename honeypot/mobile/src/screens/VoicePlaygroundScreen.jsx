import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import AISuggestionPanel from '../components/AISuggestionPanel';

const VoicePlaygroundScreen = () => {
  const [sessionId] = useState(`voice-${Math.random().toString(36).substr(2, 9)}`);
  const [mode, setMode] = useState('ai_speaks');
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const flatListRef = useRef(null);

  const handleTranscription = (result) => {
    setLastResult(result);
    setHistory(prev => [
      ...prev,
      { role: 'scammer', text: result.transcription, timestamp: new Date().toISOString() },
      {
        role: 'agent',
        text: result.reply,
        naturalized: result.naturalizedReply,
        audioUrl: result.audioUrl,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  useEffect(() => {
    if (history.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [history]);

  const renderTimelineItem = ({ item, index }) => {
    const isAgent = item.role === 'agent';
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: isAgent ? '#10b981' : '#ef4444' }]} />
          {index < history.length - 1 && <View style={styles.timelineLine} />}
        </View>
        <View style={[styles.timelineBubble, isAgent ? styles.agentBubble : styles.scammerBubble]}>
          <Text style={styles.roleLabel}>{isAgent ? '🤖 AI AGENT' : '🎭 SCAMMER'}</Text>
          <Text style={styles.bubbleText}>{item.text}</Text>
          {isAgent && item.audioUrl && (
            <View style={styles.playerWrap}>
              <VoicePlayer
                audioUrl={item.audioUrl}
                transcription={item.text}
                naturalizedText={item.naturalized}
                autoPlay={false}
                timestamp={item.timestamp}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>EXPERIMENTAL LAB v2.0</Text>
        </View>
        <Text style={styles.title}>
          VOICE <Text style={styles.titleAccent}>PLAYGROUND</Text>
        </Text>
        <Text style={styles.subtitle}>
          Intercept, analyze, and neutralize voice threats
        </Text>
      </View>

      {/* Mode switcher */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'ai_speaks' && styles.modeBtnActive]}
          onPress={() => setMode('ai_speaks')}
        >
          <Text style={styles.modeIcon}>🔊</Text>
          <View>
            <Text style={[styles.modeName, mode === 'ai_speaks' && styles.modeNameActive]}>AI SPEAKS</Text>
            <Text style={styles.modeDesc}>Voice auto-reply</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'ai_suggests' && styles.modeBtnActive]}
          onPress={() => setMode('ai_suggests')}
        >
          <Text style={styles.modeIcon}>💬</Text>
          <View>
            <Text style={[styles.modeName, mode === 'ai_suggests' && styles.modeNameActive]}>AI SUGGESTS</Text>
            <Text style={styles.modeDesc}>Text coaching</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recorder */}
      <View style={styles.recorderWrap}>
        <VoiceRecorder
          sessionId={sessionId}
          onTranscription={handleTranscription}
          mode={mode}
        />
      </View>

      {/* AI Suggestion (only in suggest mode) */}
      {mode === 'ai_suggests' && lastResult?.reply && (
        <View style={styles.suggestionWrap}>
          <AISuggestionPanel
            suggestion={lastResult.naturalizedReply || lastResult.reply}
            originalText={lastResult.reply}
          />
        </View>
      )}

      {/* Timeline */}
      {history.length > 0 && (
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>📡 CONVERSATION TIMELINE</Text>
          <FlatList
            ref={flatListRef}
            data={history}
            renderItem={renderTimelineItem}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.timelineList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  headerBadgeText: { color: '#34d399', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  titleAccent: { color: '#10b981' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 4 },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginVertical: 12 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  modeIcon: { fontSize: 20, marginRight: 10 },
  modeName: { color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  modeNameActive: { color: '#34d399' },
  modeDesc: { color: '#334155', fontSize: 9, marginTop: 1 },
  recorderWrap: { paddingHorizontal: 16, marginBottom: 12 },
  suggestionWrap: { paddingHorizontal: 16, marginBottom: 12 },
  timelineContainer: { flex: 1, paddingHorizontal: 16 },
  timelineTitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  timelineList: { paddingBottom: 100 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 4 },
  timelineBubble: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  agentBubble: { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' },
  scammerBubble: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' },
  roleLabel: { fontSize: 9, fontWeight: '800', color: '#6b7280', letterSpacing: 1, marginBottom: 4 },
  bubbleText: { color: '#d1d5db', fontSize: 13, lineHeight: 20 },
  playerWrap: { marginTop: 10 },
});

export default VoicePlaygroundScreen;
