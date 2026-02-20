import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { fetchSession } from '../services/api';
import GlassCard from '../components/GlassCard';
import MessageBubble from '../components/MessageBubble';
import IntelligencePanel from '../components/IntelligencePanel';

const SessionViewScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('messages'); // messages | intel | details

  useEffect(() => {
    const load = async () => {
      const data = await fetchSession(sessionId);
      setSession(data);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const messages = session.history || [];
  const intel = session.extracted_intelligence || {};
  const scoreColor = (session.scam_score || 0) > 0.8 ? '#ef4444'
    : (session.scam_score || 0) > 0.5 ? '#eab308' : '#10b981';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {session.is_confirmed_scam && (
            <View style={styles.threatBadge}>
              <Text style={styles.threatText}>⚠️ THREAT</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.liveBtn}
            onPress={() => navigation.navigate('LiveTakeover', { sessionId })}
          >
            <Text style={styles.liveBtnText}>🎙 GO LIVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Session info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Session</Text>
          <Text style={styles.infoValue}>{sessionId.slice(0, 10)}...</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Risk</Text>
          <Text style={[styles.infoValue, { color: scoreColor, fontWeight: '800' }]}>
            {((session.scam_score || 0) * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Messages</Text>
          <Text style={styles.infoValue}>{messages.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{(session.status || 'active').toUpperCase()}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['messages', 'intel', 'details'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'messages' ? '💬 Messages' : t === 'intel' ? '🧠 Intel' : '📋 Details'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {tab === 'messages' && (
          messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet.</Text>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
          )
        )}

        {tab === 'intel' && <IntelligencePanel intelligence={intel} />}

        {tab === 'details' && (
          <GlassCard>
            <Text style={styles.detailTitle}>Session Details</Text>
            {[
              ['Session ID', sessionId],
              ['Status', session.status || 'active'],
              ['Voice Enabled', session.voice_enabled ? 'Yes' : 'No'],
              ['Language', session.detected_language || 'Unknown'],
              ['AI Mode', session.voice_mode || 'N/A'],
              ['Scam Score', `${((session.scam_score || 0) * 100).toFixed(1)}%`],
              ['Confirmed Scam', session.is_confirmed_scam ? 'Yes' : 'No'],
              ['Created', session.created_at ? new Date(session.created_at).toLocaleString() : 'N/A'],
              ['Last Updated', session.last_updated ? new Date(session.last_updated).toLocaleString() : 'N/A'],
            ].map(([label, val]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} selectable>{val}</Text>
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threatBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  threatText: { color: '#f87171', fontSize: 10, fontWeight: '800' },
  liveBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  liveBtnText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  infoCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { color: '#6b7280', fontSize: 12 },
  infoValue: { color: '#e5e7eb', fontSize: 12, fontFamily: 'monospace' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
  tabText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#34d399' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 40 },
  detailTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  detailLabel: { color: '#6b7280', fontSize: 12 },
  detailValue: { color: '#d1d5db', fontSize: 12, fontFamily: 'monospace', maxWidth: '60%', textAlign: 'right' },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16, marginBottom: 12 },
  backLink: { color: '#10b981', fontSize: 14 },
});

export default SessionViewScreen;
