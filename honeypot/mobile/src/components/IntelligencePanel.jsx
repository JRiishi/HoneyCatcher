import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import GlassCard from './GlassCard';

const CATEGORIES = [
  { id: 'bank_accounts', label: 'Bank Accounts', color: '#60a5fa', icon: '🏦' },
  { id: 'upi_ids', label: 'UPI IDs', color: '#fb923c', icon: '💳' },
  { id: 'phone_numbers', label: 'Phone Numbers', color: '#34d399', icon: '📞' },
  { id: 'urls', label: 'Phishing Links', color: '#22d3ee', icon: '🌐' },
  { id: 'scam_keywords', label: 'Triggers', color: '#facc15', icon: '⚠️' },
];

const IntelligencePanel = ({ intelligence }) => {
  if (!intelligence) return null;

  const hasAny = Object.values(intelligence).some(arr => arr && arr.length > 0);

  return (
    <GlassCard>
      <View style={styles.header}>
        <View style={styles.indicator} />
        <Text style={styles.title}>Extracted Intelligence</Text>
      </View>

      {!hasAny ? (
        <Text style={styles.empty}>No intelligence extracted yet.</Text>
      ) : (
        CATEGORIES.map(cat => {
          const items = intelligence[cat.id] || [];
          if (items.length === 0) return null;
          return (
            <View key={cat.id} style={styles.category}>
              <View style={styles.catHeader}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                <View style={[styles.badge, { backgroundColor: cat.color + '20' }]}>
                  <Text style={[styles.badgeText, { color: cat.color }]}>{items.length}</Text>
                </View>
              </View>
              {items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <Text style={styles.itemText} selectable>{item}</Text>
                </View>
              ))}
            </View>
          );
        })
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  indicator: { width: 3, height: 20, backgroundColor: '#10b981', borderRadius: 2, marginRight: 10 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { color: '#6b7280', textAlign: 'center', paddingVertical: 30, fontStyle: 'italic' },
  category: { marginBottom: 16 },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catIcon: { fontSize: 14, marginRight: 6 },
  catLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  item: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  itemText: { color: '#d1d5db', fontSize: 13, fontFamily: 'monospace' },
});

export default IntelligencePanel;
