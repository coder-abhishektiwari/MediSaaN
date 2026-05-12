import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface Props {
  med: any;
  onTaken: () => void;
  onSkip: () => void;
  onDelete: () => void;
}

export default function MedicineCard({ med, onTaken, onSkip, onDelete }: Props) {
  const times: string[] = JSON.parse(med.dose_times || '[]');
  const dose = `${med.dose_amount || 1} ${med.dose_unit || 'tablet'}`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.iconBox}><Text style={styles.icon}>💊</Text></View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{med.name}</Text>
          {med.generic_name ? <Text style={styles.generic}>{med.generic_name}</Text> : null}
          <Text style={styles.dose}>{dose} · {times.join(', ')}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.del}><Text>🗑</Text></TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnTaken]} onPress={onTaken}>
          <Text style={[styles.btnText, { color: colors.success }]}>✓ Taken</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSkip]} onPress={onSkip}>
          <Text style={[styles.btnText, { color: colors.warning }]}>⏭ Skip</Text>
        </TouchableOpacity>
      </View>
      {med.stock_quantity > 0 && med.stock_quantity <= 5 && (
        <Text style={styles.refill}>⚠️ Only {med.stock_quantity} doses remaining — refill soon</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  top: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  generic: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
  dose: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 3 },
  del: { padding: 8 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider },
  btn: { flex: 1, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center' },
  btnTaken: { backgroundColor: colors.successLight },
  btnSkip: { backgroundColor: colors.warningLight, borderLeftWidth: 1, borderLeftColor: colors.divider },
  btnText: { ...typography.labelMedium },
  refill: { ...typography.caption, color: colors.warning, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
