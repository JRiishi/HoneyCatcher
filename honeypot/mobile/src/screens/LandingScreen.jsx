import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020202" />

      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(16,185,129,0.06)', 'transparent', 'rgba(16,185,129,0.03)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>SYSTEM ONLINE</Text>
        </View>

        {/* Main title */}
        <Text style={styles.title}> HONEY</Text>
        <Text style={styles.titleAccent}>CATCHER</Text>
        <Text style={styles.subtitle}>
          AI-powered cyber defense against voice & text scams.{'\n'}
          Intercept. Analyze. Neutralize.
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>AI</Text>
            <Text style={styles.statLabel}>Autonomous</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>RT</Text>
            <Text style={styles.statLabel}>Real-Time</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>E2E</Text>
            <Text style={styles.statLabel}>Encrypted</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.replace('Main')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#059669', '#10b981']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaText}>ENTER COMMAND CENTER</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.replace('Main')}
        >
          <Text style={styles.secondaryText}>Skip to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>HONEYCATCHER v2.0 — CLASSIFIED</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 8 },
  badgeText: { color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center' },
  titleAccent: {
    fontSize: 48, fontWeight: '900', letterSpacing: -2,
    color: '#10b981', textAlign: 'center', marginTop: -8,
  },
  subtitle: {
    color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center',
    marginTop: 16, marginBottom: 32, maxWidth: 300,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
    marginBottom: 40,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.05)' },
  ctaBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  ctaArrow: { color: '#fff', fontSize: 18, marginLeft: 10 },
  secondaryBtn: { paddingVertical: 12 },
  secondaryText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  footer: {
    color: '#1e293b', fontSize: 9, fontWeight: '700', letterSpacing: 3,
    textAlign: 'center', paddingBottom: 24,
  },
});

export default LandingScreen;
