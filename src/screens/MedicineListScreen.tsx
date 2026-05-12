import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { getMedicines, logReminderAction, deleteMedicine } from '../db/queries/medicines';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import { useReminders } from '../hooks/useReminders';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

function MedicineCard({ med, onAction, onDelete }: any) {
  const times: string[] = JSON.parse(med.dose_times || '[]');
  const nextTime = times[0] || '--:--';
  const doseStr = `${med.dose_amount || ''} ${med.dose_unit || 'tablet'}`.trim();

  return (
    <View style={card.wrap}>
      <View style={card.left}>
        <View style={card.iconBox}>
          <Text style={card.icon}>💊</Text>
        </View>
      </View>
      <View style={card.center}>
        <Text style={card.name} numberOfLines={1}>{med.name}</Text>
        {med.generic_name ? <Text style={card.generic}>{med.generic_name}</Text> : null}
        <Text style={card.dose}>{doseStr} · {times.join(', ')}</Text>
        {med.stock_quantity > 0 && med.stock_quantity <= 5 && (
          <Text style={card.refillWarn}>⚠️ Only {med.stock_quantity} left</Text>
        )}
      </View>
      <View style={card.actions}>
        <TouchableOpacity style={[card.actionBtn, { backgroundColor: colors.successLight }]}
          onPress={() => onAction(med, 'taken')}>
          <Text style={[card.actionText, { color: colors.success }]}>✓ Taken</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[card.actionBtn, { backgroundColor: colors.warningLight }]}
          onPress={() => onAction(med, 'skipped')}>
          <Text style={[card.actionText, { color: colors.warning }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.deleteBtn} onPress={() => onDelete(med)}>
          <Text style={card.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.lg,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    alignItems: 'flex-start', gap: spacing.md,
  },
  left: {},
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 22 },
  center: { flex: 1, gap: 2 },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  generic: { ...typography.caption, color: colors.textMuted },
  dose: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  refillWarn: { ...typography.caption, color: colors.warning, marginTop: 4 },
  actions: { gap: 6, alignItems: 'flex-end' },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full, minWidth: 72, alignItems: 'center',
  },
  actionText: { ...typography.tiny, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 16 },
});

export default function MedicineListScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { cancelAll } = useReminders();
  const [medicines, setMedicines] = useState<any[]>([]);

  const load = useCallback(() => {
    if (patient?.id) setMedicines(getMedicines(patient.id));
  }, [patient?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAction = (med: any, action: 'taken' | 'skipped') => {
    logReminderAction(med.id, dayjs().format('HH:mm'), action);
    Alert.alert(action === 'taken' ? '✅ Marked as Taken' : '⏭ Marked as Skipped', med.name);
  };

  const handleDelete = (med: any) => {
    Alert.alert('Delete Medicine', `Remove ${med.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMedicine(med.id);
        cancelAll(med.id);
        load();
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Medicines 💊</Text>
          <Text style={styles.headerSub}>{dayjs().format('dddd, DD MMMM')}</Text>
        </View>
        <TouchableOpacity style={styles.histBtn} onPress={() => navigation.navigate('MedicineHistory')}>
          <Text style={styles.histBtnText}>History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={medicines}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <MedicineCard med={item} onAction={handleAction} onDelete={handleDelete} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>No Medicines Added</Text>
            <Text style={styles.emptySub}>Add your first medicine by tapping the button below.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMedicine')} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ Add Medicine</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.headingLarge, color: colors.textPrimary },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  histBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.primary,
  },
  histBtnText: { ...typography.labelMedium, color: colors.primary },
  list: { paddingTop: spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xxxl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { ...typography.headingMedium, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.xl, left: spacing.xl,
    backgroundColor: colors.primary, height: sizes.buttonHeight,
    borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { ...typography.labelLarge, color: '#fff' },
});
