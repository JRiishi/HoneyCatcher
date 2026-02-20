import React from 'react';
import { View, StyleSheet } from 'react-native';

const GlassCard = ({ children, style, borderColor }) => (
  <View style={[styles.card, borderColor && { borderColor }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default GlassCard;
