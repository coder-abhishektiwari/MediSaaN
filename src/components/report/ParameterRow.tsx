import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, colors, typography, spacing, borderRadius } from '../../theme';

export default function ParameterRow({ param }: { param: any }) {
  const sc = statusColors[param.status as keyof typeof statusColors] || statusColors.normal;
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name}>{param.name}</Text>
        <Text style={styles.meaning} numberOfLines={2}>{param.meaning}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.value}>{param.value} {param.unit}</Text>
        <Text style={styles.range}>Normal: {param.normal_range}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
        <Text style={[styles.badgeText, { color: sc.text }]}>{(param.status || '').toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  left: { flex: 2 },
  mid: { flex: 1.5 },
  name: { ...typography.labelMedium, color: colors.textPrimary },
  meaning: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  value: { ...typography.labelMedium, color: colors.textPrimary },
  range: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1, minWidth: 58, alignItems: 'center' },
  badgeText: { ...typography.tiny, fontWeight: '800' },
});
