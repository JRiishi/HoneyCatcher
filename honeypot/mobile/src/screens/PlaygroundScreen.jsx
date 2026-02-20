import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { simulateScamMessage, fetchSession } from '../services/api';
import GlassCard from '../components/GlassCard';
import MessageBubble from '../components/MessageBubble';
import IntelligencePanel from '../components/IntelligencePanel';

const PRESETS = [
  'Your bank account will be blocked in 24 hours. Call 9876543210 immediately.',
  'URGENT: KYC verification pending. Click https://secure-bank-verify.com now.',
  'Congratulations! You won ₹50,000. Share your UPI ID to claim.',
  'Your ATM card is blocked. Update details at support@fake-bank.com',
  'Police complaint filed against you. Pay ₹20,000 fine to 9999888877@paytm',
];

const PlaygroundScreen = ({ navigation }) => {
  const [sessionId] = useState(`test-${Date.now()}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [showIntel, setShowIntel] = useState(false);
  const flatListRef = useRef(null);

  // Auto-refresh session data
  useEffect(() => {
    if (!sessionData) return;
    const interval = setInterval(async () => {
      const data = await fetchSession(sessionId);
      if (data) setSessionData(data);
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, sessionData]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMsg = { sender: 'scammer', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await simulateScamMessage(sessionId, text);
      if (response?.reply) {
        const agentMsg = { sender: 'agent', content: response.reply, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, agentMsg]);
      }
      const data = await fetchSession(sessionId);
      if (data) setSessionData(data);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setLoading(false);
    }
  };

  const intel = sessionData?.extracted_intelligence || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Text Playground</Text>
          <Text style={styles.subtitle}>Test scam scenarios against AI agent</Text>
        </View>
        <TouchableOpacity
          style={styles.intelBtn}
          onPress={() => setShowIntel(!showIntel)}
        >
          <Text style={styles.intelBtnText}>{showIntel ? '💬 Chat' : '🧠 Intel'}</Text>
        </TouchableOpacity>
      </View>

      {showIntel ? (
        <View style={styles.intelContainer}>
          <IntelligencePanel intelligence={intel} />
        </View>
      ) : (
        <>
          {/* Preset messages */}
          {messages.length === 0 && (
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>🎯 QUICK INJECT</Text>
              {PRESETS.map((msg, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.presetBtn}
                  onPress={() => handleSend(msg)}
                  disabled={loading}
                >
                  <Text style={styles.presetText} numberOfLines={2}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => <MessageBubble message={item} />}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              messages.length === 0 ? null : (
                <Text style={styles.emptyText}>Send a scam message to begin...</Text>
              )
            }
          />

          {/* Loading indicator */}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.loadingText}>AI processing...</Text>
            </View>
          )}

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
          >
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type a scam message..."
                placeholderTextColor="#475569"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={loading || !input.trim()}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  intelBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  intelBtnText: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  intelContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  presetsContainer: { paddingHorizontal: 16, marginBottom: 8 },
  presetsLabel: { color: '#6b7280', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  presetBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: 12, marginBottom: 6,
  },
  presetText: { color: '#d1d5db', fontSize: 12, lineHeight: 18 },
  messagesList: { paddingVertical: 8, paddingBottom: 16 },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 40 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  loadingText: { color: '#10b981', fontSize: 12, marginLeft: 8 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0a',
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    color: '#e5e7eb', fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 18 },
});

export default PlaygroundScreen;
