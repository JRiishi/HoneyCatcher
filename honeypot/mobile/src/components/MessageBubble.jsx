import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MessageBubble = ({ message }) => {
  const sender = message.sender || message.role || message.speaker || 'agent';
  const isAgent = sender === 'agent' || sender === 'ai' || sender === 'operator';
  const content = message.content || message.text || '';

  return (
    <View style={[styles.row, isAgent ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isAgent ? styles.agentBubble : styles.scammerBubble]}>
        <Text style={[styles.label, isAgent ? styles.agentLabel : styles.scammerLabel]}>
          {isAgent ? (sender === 'ai' ? 'AI AGENT' : 'OPERATOR') : 'SCAMMER'}
        </Text>
        <Text style={styles.text}>{content}</Text>
        {message.timestamp && (
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { marginBottom: 12, paddingHorizontal: 12 },
  rowLeft: { alignItems: 'flex-start' },
  rowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  agentBubble: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderTopRightRadius: 4,
  },
  scammerBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 4,
  },
  label: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  agentLabel: { color: '#34d399' },
  scammerLabel: { color: '#f87171' },
  text: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  timestamp: { color: '#6b7280', fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
});

export default MessageBubble;
