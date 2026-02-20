import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const AISuggestionPanel = ({ suggestion, originalText, onAction }) => {
  const [copied, setCopied] = React.useState(false);

  if (!suggestion) return null;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(suggestion);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🧠</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>TACTICAL SUGGESTION</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>🎯 HIGH</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>RECOMMENDED COUNTER-REPLY</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
          <Text style={styles.copyIcon}>{copied ? '✓' : '📋'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main suggestion text */}
      <View style={styles.quoteBox}>
        <View style={styles.quoteLine} />
        <Text style={styles.suggestionText} selectable>{suggestion}</Text>
        <Text style={styles.footer}>✨ Naturalized for maximum deception</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.speakBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAction && onAction('speak');
          }}
        >
          <Text style={styles.speakText}>🎙 MARK AS SPOKEN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ignoreBtn}
          onPress={() => onAction && onAction('ignore')}
        >
          <Text style={styles.ignoreText}>IGNORE</Text>
        </TouchableOpacity>
      </View>

      {/* Original context */}
      {originalText && (
        <View style={styles.contextBox}>
          <Text style={styles.contextLabel}>STRATEGY CORE</Text>
          <Text style={styles.contextText}>"{originalText}"</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10,16,13,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 24,
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  iconEmoji: { fontSize: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: '#ecfdf5', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  confidenceBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
  },
  confidenceText: { color: '#34d399', fontSize: 8, fontWeight: '700' },
  subtitle: { color: 'rgba(16,185,129,0.4)', fontSize: 8, fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  copyBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  copyIcon: { fontSize: 16 },
  quoteBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16, marginBottom: 16, position: 'relative',
  },
  quoteLine: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    backgroundColor: 'rgba(16,185,129,0.3)', borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  suggestionText: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 26, paddingLeft: 12 },
  footer: { color: 'rgba(16,185,129,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 10, paddingLeft: 12 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  speakBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  speakText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ignoreBtn: {
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
  },
  ignoreText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  contextBox: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(16,185,129,0.1)',
  },
  contextLabel: { color: 'rgba(16,185,129,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  contextText: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(16,185,129,0.2)' },
});

export default AISuggestionPanel;
