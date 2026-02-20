import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';

const FILTERS_CONFIG = {
  voiceEnabled: {
    label: 'I/O Type',
    options: [
      { label: 'All', value: null },
      { label: 'Voice', value: true },
      { label: 'Text', value: false },
    ],
  },
  language: {
    label: 'Language',
    options: [
      { label: 'Any', value: '' },
      { label: 'English', value: 'en' },
      { label: 'Hindi', value: 'hi' },
      { label: 'Tamil', value: 'ta' },
      { label: 'Telugu', value: 'te' },
      { label: 'Bengali', value: 'bn' },
    ],
  },
  minScamScore: {
    label: 'Min Confidence',
    options: [
      { label: '0%', value: 0 },
      { label: '50%+', value: 0.5 },
      { label: '80%+', value: 0.8 },
      { label: '95%+', value: 0.95 },
    ],
  },
  voiceMode: {
    label: 'AI Mode',
    options: [
      { label: 'Any', value: '' },
      { label: 'AI Speaks', value: 'ai_speaks' },
      { label: 'AI Suggests', value: 'ai_suggests' },
    ],
  },
};

const DashboardFilters = ({ onFilterChange }) => {
  const [visible, setVisible] = useState(false);
  const [filters, setFilters] = useState({
    voiceEnabled: null,
    language: '',
    minScamScore: 0,
    voiceMode: '',
  });

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'voiceEnabled') return v !== null;
    if (k === 'minScamScore') return v > 0;
    return v !== '';
  }).length;

  const apply = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const reset = () => {
    const initial = { voiceEnabled: null, language: '', minScamScore: 0, voiceMode: '' };
    setFilters(initial);
    onFilterChange?.(initial);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerIcon}>🔍</Text>
        <Text style={styles.triggerText}>FILTERS</Text>
        {activeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              {Object.entries(FILTERS_CONFIG).map(([key, cfg]) => (
                <View key={key} style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>{cfg.label}</Text>
                  <View style={styles.chips}>
                    {cfg.options.map(opt => {
                      const isActive = filters[key] === opt.value;
                      return (
                        <TouchableOpacity
                          key={String(opt.value)}
                          style={[styles.chip, isActive && styles.chipActive]}
                          onPress={() => apply(key, opt.value)}
                        >
                          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setVisible(false)}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
  },
  triggerIcon: { fontSize: 14, marginRight: 6 },
  triggerText: { color: '#818cf8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  badge: {
    marginLeft: 8, width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeBtn: { color: '#94a3b8', fontSize: 20, padding: 4 },
  body: { paddingHorizontal: 20, paddingVertical: 12 },
  filterGroup: { marginBottom: 20 },
  filterLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#34d399' },
  footer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  resetBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
  },
  resetText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  applyBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#059669', alignItems: 'center',
  },
  applyText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default DashboardFilters;
