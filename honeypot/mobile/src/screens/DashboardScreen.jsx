import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchSessions, simulateScamMessage } from '../services/api';
import GlassCard from '../components/GlassCard';
import DashboardFilters from '../components/DashboardFilters';

const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const DashboardScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [filters, setFilters] = useState({
    voiceEnabled: null, language: '', minScamScore: 0, voiceMode: '',
  });

  const load = useCallback(async (currentFilters = filters) => {
    try {
      const data = await fetchSessions(currentFilters);
      const sorted = (data || []).sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
      setSessions(sorted);
    } catch (e) {
      console.warn('Load sessions error:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filters]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 5000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleSimulate = async () => {
    setSimulating(true);
    const uid = Math.random().toString(36).substring(7);
    await simulateScamMessage(
      `sim-${uid}`,
      'URGENT ALERT: Your KYC is pending. Your account will be BLOCKED in 10 minutes. Click valid-bank-url.com/verify to update immediately.'
    );
    setSimulating(false);
    load();
  };

  const activeSessions = sessions.filter(s => s.status !== 'terminated');

  const renderSession = ({ item, index }) => {
    const scoreColor = (item.scam_score || 0) > 0.8 ? '#ef4444'
      : (item.scam_score || 0) > 0.5 ? '#eab308' : '#10b981';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('SessionView', { sessionId: item.session_id })}
        activeOpacity={0.7}
        style={styles.cardWrapper}
      >
        <GlassCard>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: {item.session_id?.slice(0, 6)}</Text>
              </View>
              <View style={styles.tagRow}>
                {item.voice_enabled ? (
                  <View style={[styles.tag, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                    <Text style={[styles.tagText, { color: '#818cf8' }]}>🔊 VOICE</Text>
                  </View>
                ) : (
                  <View style={[styles.tag, { backgroundColor: 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.2)' }]}>
                    <Text style={[styles.tagText, { color: '#94a3b8' }]}>💬 SMS</Text>
                  </View>
                )}
                {item.detected_language && (
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <Text style={[styles.tagText, { color: '#6b7280' }]}>🌐 {item.detected_language?.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
            {item.is_confirmed_scam ? (
              <View style={styles.threatBadge}>
                <Text style={styles.threatText}>⚠️ THREAT</Text>
              </View>
            ) : (
              <View style={styles.monitorBadge}>
                <Text style={styles.monitorText}>MONITOR</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsBox}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Messages</Text>
              <Text style={styles.statValue}>{item.message_count || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Risk Level</Text>
              <Text style={[styles.statValue, { color: scoreColor, fontWeight: '800' }]}>
                {((item.scam_score || 0) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>State</Text>
              <View style={styles.stateBadge}>
                <Text style={styles.stateText}>{(item.status || 'ACTIVE').toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerTime}>🕐 {formatDate(item.last_updated)}</Text>
            <Text style={styles.footerAction}>View Intel →</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Active Threats</Text>
          <Text style={styles.subtitle}>Monitoring {activeSessions.length} active engagements</Text>
        </View>
        <TouchableOpacity
          style={styles.simBtn}
          onPress={handleSimulate}
          disabled={simulating}
        >
          {simulating ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.simText}>⚡ SIMULATE</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <DashboardFilters onFilterChange={setFilters} />
      </View>

      {/* Sessions list */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Scanning network...</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={item => item.session_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No active sessions. The network is quiet.</Text>
            </View>
          }
        />
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
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  simBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  simText: { color: '#ef4444', fontSize: 11, fontWeight: '800' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  cardWrapper: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 6,
  },
  idText: { color: '#9ca3af', fontSize: 10, fontFamily: 'monospace' },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tagText: { fontSize: 9, fontWeight: '700' },
  threatBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  threatText: { color: '#f87171', fontSize: 10, fontWeight: '800' },
  monitorBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  monitorText: { color: '#34d399', fontSize: 10, fontWeight: '700' },
  statsBox: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { color: '#9ca3af', fontSize: 13 },
  statValue: { color: '#fff', fontSize: 13, fontFamily: 'monospace' },
  stateBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  stateText: { color: '#9ca3af', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerTime: { color: '#6b7280', fontSize: 11 },
  footerAction: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6b7280', marginTop: 8, fontSize: 12 },
  emptyBox: {
    paddingVertical: 60, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: { color: '#6b7280', fontSize: 13 },
});

export default DashboardScreen;
