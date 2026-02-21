import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, Alert, Animated, PermissionsAndroid, Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import SmsAndroid from 'react-native-get-sms-android';
import { extractSmsEvidence } from '../services/api';
import useWebRTC from '../hooks/useWebRTC';
import GlassCard from '../components/GlassCard';
import MessageBubble from '../components/MessageBubble';
import IntelligencePanel from '../components/IntelligencePanel';
import AISuggestionPanel from '../components/AISuggestionPanel';

const LiveCallWebRTCScreen = ({ route, navigation }) => {
  const roomId = route?.params?.roomId || `room-${Date.now()}`;
  const phoneNumber = route?.params?.phoneNumber || '';
  const operatorName = route?.params?.operatorName || '';

  const {
    isConnected, isPeerConnected, connectionState, error,
    transcripts, aiCoaching, intelligence, aiMode, aiError,
    isMuted, setAiMode: setAiModeHook, connect, disconnect, toggleMute,
  } = useWebRTC();

  const [tab, setTab] = useState('live'); // live | coaching | intel
  const [callDuration, setCallDuration] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const smsFetchedRef = React.useRef(false);

  // Auto-fetch SMS evidence if scam threat is high
  useEffect(() => {
    const checkAndFetchSms = async () => {
      // Only do this on Android where we have native module support
      if (Platform.OS !== 'android') return;
      if (smsFetchedRef.current) return;
      if (intelligence.threatLevel <= 0.8) return;

      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: "SMS Evidence Retrieval",
            message: "HoneyBadger detected a high-threat scam call. We need to access your SMS to find evidence specifically from this caller's number.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          smsFetchedRef.current = true; // prevent multiple triggers
          console.log('[LiveCall] Fetching SMS evidence for:', phoneNumber);

          let filter = {
            box: 'inbox',
            maxCount: 20,
          };
          if (phoneNumber) {
            filter.address = phoneNumber; // Only get messages from this person
          }

          SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => console.log('Failed to fetch SMS:', fail),
            async (count, smsList) => {
              const messages = JSON.parse(smsList);
              if (messages.length > 0) {
                console.log(`[LiveCall] Found ${messages.length} SMS messages, sending to backend...`);
                // Send to backend
                await extractSmsEvidence(roomId, phoneNumber, messages);
              }
            }
          );
        }
      } catch (err) {
        console.warn('SMS permission error:', err);
      }
    };

    checkAndFetchSms();
  }, [intelligence.threatLevel, phoneNumber, roomId]);

  // Pulse animation for live indicator
  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isConnected]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Connect on mount
  useEffect(() => {
    handleConnect();
    return () => { disconnect(); };
  }, []);

  const handleConnect = useCallback(() => {
    connect(roomId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [roomId]);

  const handleDisconnect = useCallback(() => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call', style: 'destructive', onPress: () => {
          disconnect();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          navigation.goBack();
        },
      },
    ]);
  }, []);

  const handleToggleMute = useCallback(() => {
    toggleMute();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleModeSwitch = useCallback((newMode) => {
    setAiModeHook(newMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const formatTime = (s) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const latestCoaching = aiCoaching.length > 0 ? aiCoaching[aiCoaching.length - 1] : null;

  // Connection status color
  const statusColor = isConnected && isPeerConnected ? '#10b981'
    : isConnected ? '#eab308' : '#ef4444';
  const statusText = isConnected && isPeerConnected ? 'AI CONNECTED'
    : isConnected ? 'CONNECTING...' : 'DISCONNECTED';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.liveDot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.headerTitle}>AI COMPANION</Text>
        </View>
        <Text style={[styles.timer, { color: isConnected ? '#f87171' : '#475569' }]}>
          {formatTime(callDuration)}
        </Text>
      </View>

      {/* Error banner */}
      {(error || aiError) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error || aiError}</Text>
        </View>
      )}

      {/* Connection status bar */}
      <View style={styles.connectionBar}>
        <View style={styles.connItem}>
          <View style={[styles.connDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.connText, { color: statusColor }]}>{statusText}</Text>
        </View>
        <View style={styles.connItem}>
          <Text style={styles.connLabel}>MODE: </Text>
          <Text style={styles.connValue}>
            {aiMode === 'ai_speaks' ? '🤖 AI SPEAKS' : '💬 SUGGESTS'}
          </Text>
        </View>
        <View style={styles.connItem}>
          <Text style={styles.connLabel}>STATE: </Text>
          <Text style={styles.connValue}>{connectionState?.toUpperCase() || 'N/A'}</Text>
        </View>
      </View>

      {/* AI Mode switch */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, aiMode === 'ai_speaks' && styles.modeBtnActive]}
          onPress={() => handleModeSwitch('ai_speaks')}
        >
          <Text style={[styles.modeBtnText, aiMode === 'ai_speaks' && styles.modeBtnTextActive]}>
            🤖 AI Speaks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, aiMode === 'ai_suggests' && styles.modeBtnActive]}
          onPress={() => handleModeSwitch('ai_suggests')}
        >
          <Text style={[styles.modeBtnText, aiMode === 'ai_suggests' && styles.modeBtnTextActive]}>
            💬 AI Suggests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab strip */}
      <View style={styles.tabs}>
        {[
          { key: 'live', label: '📡 Live' },
          { key: 'coaching', label: '🧠 Coaching' },
          { key: 'intel', label: '🔍 Intel' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
              {t.key === 'coaching' && aiCoaching.length > 0 && (
                <Text style={styles.badge}> {aiCoaching.length}</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.contentArea}>
        {tab === 'live' && (
          <FlatList
            data={transcripts}
            renderItem={({ item }) => (
              <MessageBubble
                message={{
                  sender: item.speaker === 'scammer' ? 'scammer' : 'agent',
                  content: item.text,
                  timestamp: item.timestamp,
                }}
              />
            )}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(_, h) => { }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📡</Text>
                <Text style={styles.emptyTitle}>
                  {isConnected ? 'Listening...' : 'Connecting to AI...'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {phoneNumber ? `Call active: ${phoneNumber}` : 'Real-time transcriptions will appear here'}
                </Text>
              </View>
            }
          />
        )}

        {tab === 'coaching' && (
          <FlatList
            data={aiCoaching}
            renderItem={({ item }) => (
              <View style={styles.coachCard}>
                <Text style={styles.coachType}>
                  {item.type === 'warning' ? '⚠️' : item.type === 'suggestion' ? '💡' : '🎯'} {item.type?.toUpperCase() || 'TIP'}
                </Text>
                <Text style={styles.coachText}>{item.text || item.message}</Text>
              </View>
            )}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Coaching insights will appear here...</Text>
            }
          />
        )}

        {tab === 'intel' && (
          <View style={styles.intelWrap}>
            <IntelligencePanel intelligence={intelligence} />
          </View>
        )}
      </View>

      {/* AI Suggestion overlay (in suggest mode) */}
      {aiMode === 'ai_suggests' && latestCoaching && (
        <View style={styles.suggestionOverlay}>
          <AISuggestionPanel
            suggestion={latestCoaching.text || latestCoaching.message}
            originalText={latestCoaching.original}
            onAction={(action) => {
              if (action === 'speak') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }}
          />
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Mute button */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnMuted]}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙'}</Text>
          <Text style={[styles.controlLabel, isMuted && { color: '#ef4444' }]}>
            {isMuted ? 'MUTED' : 'MIC ON'}
          </Text>
        </TouchableOpacity>

        {/* End call button */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleDisconnect}>
          <Text style={styles.endCallIcon}>📵</Text>
        </TouchableOpacity>

        {/* Reconnect */}
        {!isConnected && (
          <TouchableOpacity style={styles.controlBtn} onPress={handleConnect}>
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={styles.controlLabel}>RECONNECT</Text>
          </TouchableOpacity>
        )}
      </View>
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
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  timer: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  errorBanner: {
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: '#fca5a5', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  connectionBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 8,
  },
  connItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  connDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  connText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  connLabel: { color: '#475569', fontSize: 9, fontWeight: '600' },
  connValue: { color: '#e5e7eb', fontSize: 9, fontWeight: '800' },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  modeBtnActive: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' },
  modeBtnText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  modeBtnTextActive: { color: '#34d399' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  tabText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#34d399' },
  badge: { color: '#10b981', fontWeight: '800' },
  contentArea: { flex: 1 },
  messageList: { paddingHorizontal: 4, paddingBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#94a3b8', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { color: '#475569', fontSize: 12 },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 40 },
  coachCard: {
    backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.12)',
    borderRadius: 14, padding: 14, marginBottom: 8, marginHorizontal: 16,
  },
  coachType: { color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  coachText: { color: '#d1d5db', fontSize: 13, lineHeight: 20 },
  intelWrap: { paddingHorizontal: 16 },
  suggestionOverlay: { paddingHorizontal: 16, marginBottom: 4 },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  controlBtnMuted: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  controlIcon: { fontSize: 24, marginBottom: 2 },
  controlLabel: { color: '#94a3b8', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  endCallIcon: { fontSize: 28 },
});

export default LiveCallWebRTCScreen;
