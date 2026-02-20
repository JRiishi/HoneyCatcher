import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

const CallStarterScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCall = async () => {
    if (!phoneNumber.trim()) {
      setError('Enter a phone number to call');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Create a session on the backend for AI services
      const response = await api.post('/webrtc/room/create', {
        operator_name: operatorName || 'Operator',
        phone_number: phoneNumber.trim(),
        metadata: { call_type: 'native_dialer' },
      });
      const roomId = response?.data?.room_id || `room-${Date.now()}`;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Open the native phone dialer
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');
      try {
        await Linking.openURL(`tel:${cleaned}`);
      } catch (dialErr) {
        console.warn('Dialer error:', dialErr);
      }

      // Navigate to the AI companion dashboard
      navigation.navigate('LiveCallWebRTC', {
        roomId,
        phoneNumber: cleaned,
        operatorName: operatorName || 'Operator',
      });
    } catch (err) {
      // Even if backend fails, still allow call + companion
      const fallbackRoomId = `room-${Date.now()}`;
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');
      try {
        await Linking.openURL(`tel:${cleaned}`);
      } catch (dialErr) {
        console.warn('Dialer fallback error:', dialErr);
      }
      navigation.navigate('LiveCallWebRTC', {
        roomId: fallbackRoomId,
        phoneNumber: cleaned,
        operatorName: operatorName || 'Operator',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCompanionOnly = () => {
    // Open AI companion without making a call (for incoming calls)
    const roomId = `room-${Date.now()}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('LiveCallWebRTC', {
      roomId,
      operatorName: operatorName || 'Operator',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LIVE CALL SYSTEM</Text>
          </View>
          <Text style={styles.title}>
            LIVE <Text style={styles.titleAccent}>CALL</Text>
          </Text>
          <Text style={styles.subtitle}>
            Make a call using your phone & get real-time AI intelligence
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formCard}>
            <Text style={styles.formCardIcon}>📞</Text>
            <Text style={styles.formCardTitle}>START A CALL</Text>
            <Text style={styles.formCardDesc}>
              Call via your phone's dialer — AI assistant runs alongside
            </Text>

            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.textInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+91 98765 43210"
              placeholderTextColor="#475569"
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <Text style={styles.fieldLabel}>YOUR NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              value={operatorName}
              onChangeText={setOperatorName}
              placeholder="Your call sign..."
              placeholderTextColor="#475569"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.createBtn}
              onPress={startCall}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>📞 CALL & START AI ASSISTANT</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Open companion only (for incoming calls) */}
            <TouchableOpacity style={styles.companionBtn} onPress={openCompanionOnly}>
              <Text style={styles.companionBtnText}>🎯 OPEN AI COMPANION ONLY</Text>
              <Text style={styles.companionBtnDesc}>For incoming / already active calls</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📡 How it works</Text>
            <Text style={styles.infoText}>
              1. Enter the scammer's phone number{'\n'}
              2. Your phone's dialer makes the call{'\n'}
              3. AI assistant runs alongside — coaching, transcription{'\n'}
              4. Intelligence extracted in real-time automatically
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  titleSection: { alignItems: 'center', marginBottom: 24 },
  badge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  badgeText: { color: '#34d399', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -2, marginBottom: 8 },
  titleAccent: { color: '#10b981' },
  subtitle: { color: '#64748b', fontSize: 13, textAlign: 'center', maxWidth: 280 },
  form: { flex: 1 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24, padding: 24, alignItems: 'center',
  },
  formCardIcon: { fontSize: 36, marginBottom: 12 },
  formCardTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  formCardDesc: { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  fieldLabel: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, alignSelf: 'flex-start', marginBottom: 6 },
  textInput: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: '#e5e7eb', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16,
  },
  errorBox: {
    width: '100%', padding: 10, borderRadius: 10, marginBottom: 12,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: '#fca5a5', fontSize: 12, textAlign: 'center' },
  createBtn: {
    width: '100%', backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 16, width: '100%',
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#475569', fontSize: 11, fontWeight: '700', marginHorizontal: 12 },
  companionBtn: {
    width: '100%', backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  companionBtnText: { color: '#a5b4fc', fontSize: 13, fontWeight: '800' },
  companionBtnDesc: { color: '#6366f1', fontSize: 10, marginTop: 2 },
  infoBox: {
    marginTop: 16, padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  infoTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#64748b', fontSize: 12, lineHeight: 20 },
});

export default CallStarterScreen;
