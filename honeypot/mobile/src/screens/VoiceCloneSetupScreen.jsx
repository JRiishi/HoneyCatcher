import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import liveService from '../services/liveApi';
import GlassCard from '../components/GlassCard';

const VoiceCloneSetupScreen = ({ navigation }) => {
  const [voices, setVoices] = useState([]);
  const [quota, setQuota] = useState(null);
  const [files, setFiles] = useState([]);
  const [cloneName, setCloneName] = useState('');
  const [cloneDesc, setCloneDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [voiceData, quotaData] = await Promise.all([
        liveService.listVoices(),
        liveService.getVoiceQuota(),
      ]);
      setVoices(voiceData?.voices || []);
      setQuota(quotaData);
    } catch (e) {
      console.warn('Load error:', e);
    }
    setLoading(false);
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setFiles(prev => [...prev, ...result.assets].slice(0, 25));
        setError(null);
      }
    } catch (e) {
      setError('Failed to pick files');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!cloneName.trim()) { setError('Enter a voice name'); return; }
    if (files.length === 0) { setError('Upload at least one audio sample'); return; }

    setIsCreating(true);
    setError(null);
    setCreateStatus(null);

    try {
      const result = await liveService.createVoiceClone(files, cloneName.trim(), cloneDesc.trim());
      setCreateStatus({ success: true, voiceId: result.voice_id });
      setFiles([]);
      setCloneName('');
      setCloneDesc('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (e) {
      setCreateStatus({ success: false, error: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (voiceId, name) => {
    Alert.alert('Delete Voice', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await liveService.deleteVoice(voiceId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadData();
          } catch (e) {
            setError('Failed to delete voice');
          }
        },
      },
    ]);
  };

  const handlePreview = async (voiceId) => {
    try {
      setPlayingId(voiceId);
      const result = await liveService.previewVoice(voiceId, 'Hello, this is a test of the cloned voice.');
      if (result?.audio_url) {
        const { sound } = await Audio.Sound.createAsync({ uri: result.audio_url }, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate(s => {
          if (s.didJustFinish) { sound.unloadAsync(); setPlayingId(null); }
        });
      }
    } catch (e) {
      setPlayingId(null);
      setError('Preview failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VOICE CLONE LAB</Text>
        <View />
      </View>

      <FlatList
        data={[1]} // Single item to use as ScrollView
        renderItem={() => (
          <View style={styles.content}>
            {/* Quota info */}
            {quota && (
              <View style={styles.quotaCard}>
                <Text style={styles.quotaTitle}>📊 QUOTA</Text>
                <View style={styles.quotaRow}>
                  <Text style={styles.quotaLabel}>Used</Text>
                  <Text style={styles.quotaValue}>{quota.used || 0} / {quota.limit || 10}</Text>
                </View>
                <View style={styles.quotaBar}>
                  <View style={[styles.quotaFill, { width: `${((quota.used || 0) / (quota.limit || 10)) * 100}%` }]} />
                </View>
              </View>
            )}

            {/* Create new voice */}
            <GlassCard>
              <Text style={styles.sectionTitle}>🎙 Create Voice Clone</Text>
              <Text style={styles.sectionDesc}>Upload audio samples to clone a voice</Text>

              <Text style={styles.fieldLabel}>VOICE NAME</Text>
              <TextInput
                style={styles.input}
                value={cloneName}
                onChangeText={setCloneName}
                placeholder="e.g. Agent Smith"
                placeholderTextColor="#475569"
              />

              <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={cloneDesc}
                onChangeText={setCloneDesc}
                placeholder="Voice description..."
                placeholderTextColor="#475569"
                multiline
              />

              {/* File picker */}
              <TouchableOpacity style={styles.pickBtn} onPress={pickFiles}>
                <Text style={styles.pickBtnText}>📁 SELECT AUDIO FILES</Text>
              </TouchableOpacity>

              {files.length > 0 && (
                <View style={styles.fileList}>
                  {files.map((f, i) => (
                    <View key={i} style={styles.fileItem}>
                      <Text style={styles.fileName} numberOfLines={1}>🎵 {f.name}</Text>
                      <TouchableOpacity onPress={() => removeFile(i)}>
                        <Text style={styles.removeFile}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              {createStatus?.success && (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>✅ Voice created! ID: {createStatus.voiceId}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createBtn, isCreating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>⚡ CREATE VOICE CLONE</Text>
                )}
              </TouchableOpacity>
            </GlassCard>

            {/* Existing voices */}
            <Text style={styles.voicesTitle}>🗃 Your Voices ({voices.length})</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
            ) : voices.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No voice clones yet. Create one above!</Text>
              </View>
            ) : (
              voices.map((voice) => (
                <View key={voice.voice_id} style={styles.voiceCard}>
                  <View style={styles.voiceInfo}>
                    <Text style={styles.voiceName}>{voice.name}</Text>
                    <Text style={styles.voiceId}>ID: {voice.voice_id?.slice(0, 12)}...</Text>
                  </View>
                  <View style={styles.voiceActions}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => handlePreview(voice.voice_id)}
                    >
                      <Text style={styles.previewBtnText}>
                        {playingId === voice.voice_id ? '⏸' : '▶️'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(voice.voice_id, voice.name)}
                    >
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        keyExtractor={() => 'main'}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
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
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingBottom: 100 },
  content: { paddingHorizontal: 16 },
  quotaCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 16, marginBottom: 16,
  },
  quotaTitle: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  quotaLabel: { color: '#6b7280', fontSize: 12 },
  quotaValue: { color: '#e5e7eb', fontSize: 12, fontFamily: 'monospace' },
  quotaBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  quotaFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionDesc: { color: '#64748b', fontSize: 12, marginBottom: 20 },
  fieldLabel: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: '#e5e7eb', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14,
  },
  pickBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', marginBottom: 12,
  },
  pickBtnText: { color: '#a5b4fc', fontSize: 12, fontWeight: '700' },
  fileList: { marginBottom: 12 },
  fileItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4,
  },
  fileName: { color: '#d1d5db', fontSize: 12, flex: 1, marginRight: 8 },
  removeFile: { color: '#f87171', fontSize: 16, fontWeight: '700', padding: 4 },
  errorBox: {
    padding: 10, borderRadius: 10, marginBottom: 12,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: '#fca5a5', fontSize: 12, textAlign: 'center' },
  successBox: {
    padding: 10, borderRadius: 10, marginBottom: 12,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
  },
  successText: { color: '#34d399', fontSize: 12, textAlign: 'center' },
  createBtn: {
    backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  voicesTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  emptyBox: {
    paddingVertical: 30, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: { color: '#6b7280', fontSize: 13 },
  voiceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 14, marginBottom: 8,
  },
  voiceInfo: { flex: 1, marginRight: 12 },
  voiceName: { color: '#e5e7eb', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  voiceId: { color: '#475569', fontSize: 10, fontFamily: 'monospace' },
  voiceActions: { flexDirection: 'row', gap: 8 },
  previewBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewBtnText: { fontSize: 16 },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 16 },
});

export default VoiceCloneSetupScreen;
