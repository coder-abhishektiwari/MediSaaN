import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

const MAP: Record<string, { bg: string; text: string; icon: string }> = {
  normal:          { bg: colors.successLight, text: colors.success, icon: '✅' },
  mild_concern:    { bg: colors.warningLight, text: colors.warning, icon: '⚠️' },
  needs_attention: { bg: colors.dangerLight,  text: colors.danger,  icon: '🔴' },
  urgent:          { bg: '#FCE4E4',           text: '#922B21',       icon: '🚨' },
};

export default function SeverityBadge({ severity }: { severity: string }) {
  const s = MAP[severity] || MAP.normal;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={styles.icon}>{s.icon}</Text>
      <Text style={[styles.text, { color: s.text }]}>{severity?.replace('_', ' ').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full },
  icon: { fontSize: 16 },
  text: { ...typography.labelMedium },
});
