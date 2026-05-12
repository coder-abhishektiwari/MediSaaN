import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView, Alert, Image, Dimensions } from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { getMedicines, logReminderAction, deleteMedicine, getTodayLogs } from '../db/queries/medicines';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import { useReminders } from '../hooks/useReminders';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

const getMedIcon = (unit: string) => {
  const u = unit?.toLowerCase() || '';
  if (u.includes('capsule')) return '💊';
  if (u.includes('tablet')) return '⚪';
  if (u.includes('drop')) return '💧';
  if (u.includes('syrup') || u.includes('ml') || u.includes('spoon')) return '🥤';
  if (u.includes('tube') || u.includes('cream') || u.includes('gel')) return '🧴';
  if (u.includes('powder')) return '🧂';
  if (u.includes('patch')) return '🩹';
  return '💊';
};

function MedicineCard({ med, logs, navigation, onAction, onDelete }: any) {
  const times: string[] = JSON.parse(med.dose_times || '[]').sort();
  const now = dayjs();
  const currentTime = now.format('HH:mm');
  
  const arrivedSlots = times.filter(t => t <= currentTime);
  const activeSlot = arrivedSlots.length > 0 ? arrivedSlots[arrivedSlots.length - 1] : times[0];
  const todayLogs = logs.filter((l: any) => l.medicine_id === med.id);
  const isSlotDone = todayLogs.some((l: any) => l.scheduled_time === activeSlot);

  let displaySlot = activeSlot;
  let statusText = `Taken (${activeSlot})`;
  let isActuallyDone = isSlotDone;
  let isMissed = false;

  // Check for "Missed" status logic (Grace Period)
  if (!isSlotDone && arrivedSlots.length > 0) {
    const activeIdx = times.indexOf(activeSlot);
    const nextSlot = times[activeIdx + 1];
    let windowClosed = false;
    
    if (nextSlot) {
      const nextTime = dayjs().hour(parseInt(nextSlot.split(':')[0])).minute(parseInt(nextSlot.split(':')[1]));
      windowClosed = now.isAfter(nextTime.subtract(1, 'hour'));
    } else {
      windowClosed = now.isAfter(dayjs().endOf('day').subtract(2, 'hour'));
    }

    if (windowClosed) {
      isMissed = true;
      isActuallyDone = true;
      statusText = `Missed (${activeSlot})`;
    }
  }

  if (isActuallyDone && !isMissed) {
    const nextIdx = times.indexOf(activeSlot) + 1;
    if (nextIdx < times.length) {
      const nextSlot = times[nextIdx];
      statusText = `Next at ${nextSlot}`;
      displaySlot = nextSlot;
    } else {
      statusText = '✓ All Doses Done';
    }
  } else if (arrivedSlots.length === 0) {
    statusText = `Next at ${activeSlot}`;
    isActuallyDone = true;
  }

  const doseStr = `${med.dose_amount || ''} ${med.dose_unit || 'tablet'}`.trim();

  return (
    <View style={card.wrap}>
      <TouchableOpacity style={card.topRow} activeOpacity={0.7} onPress={() => navigation.navigate('MedicineInsight', { med })}>
        <View style={card.iconContainer}>
          {med.image_path ? <Image source={{ uri: med.image_path }} style={card.image} /> : <View style={card.iconBox}><Text style={card.iconText}>{getMedIcon(med.dose_unit)}</Text></View>}
        </View>
        <View style={card.center}>
          <Text style={card.name} numberOfLines={1}>{med.name}</Text>
          {med.generic_name ? <Text style={card.generic}>{med.generic_name}</Text> : null}
          <Text style={card.dose}>{doseStr} · <Text style={{ color: colors.primary, fontWeight: '700' }}>⏰ {displaySlot}</Text></Text>
        </View>
        <TouchableOpacity style={card.deleteBtn} onPress={() => onDelete(med)}><Text style={card.deleteIcon}>🗑</Text></TouchableOpacity>
      </TouchableOpacity>

      <View style={card.bottomRow}>
        <TouchableOpacity 
          style={[card.takenBtn, isActuallyDone && card.disabledBtn, isMissed && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1 }]}
          onPress={() => !isActuallyDone && onAction(med, displaySlot, 'taken')}
          activeOpacity={isActuallyDone ? 1 : 0.7}
        >
          <Text style={[card.actionText, isMissed && { color: colors.textMuted }]}>{statusText}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[card.skipBtn, isActuallyDone && card.disabledBtn]}
          onPress={() => !isActuallyDone && onAction(med, displaySlot, 'skipped')}
          activeOpacity={isActuallyDone ? 1 : 0.7}
        >
          <Text style={[card.actionText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>
      
      {med.stock_quantity > 0 && med.stock_quantity <= 5 && (
        <View style={card.stockBar}><Text style={card.stockText}>⚠️ Low Stock: Only {med.stock_quantity} remaining</Text></View>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, elevation: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconContainer: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: '100%', backgroundColor: colors.background },
  iconBox: { width: '100%', height: '100%', backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 28 },
  center: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  generic: { fontSize: 12, color: colors.textMuted },
  dose: { fontSize: 13, color: colors.textSecondary },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 18, color: colors.textMuted },
  bottomRow: { flexDirection: 'row', gap: 8, height: 48 },
  takenBtn: { backgroundColor: colors.success, borderRadius: borderRadius.md, flex: 1, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  skipBtn: { backgroundColor: '#f3f4f6', borderRadius: borderRadius.md, width: 80, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  disabledBtn: { backgroundColor: '#e5e7eb', elevation: 0, borderColor: '#d1d5db', opacity: 0.7 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  stockBar: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  stockText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
});

export default function MedicineListScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { cancelAll } = useReminders();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(() => {
    if (patient?.id) {
      setMedicines(getMedicines(patient.id));
      setLogs(getTodayLogs(patient.id));
    }
  }, [patient?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAction = (med: any, slot: string, action: 'taken' | 'skipped') => {
    logReminderAction(med.id, slot, action);
    load();
    Alert.alert(action === 'taken' ? '✅ Recorded' : '⏭ Skipped', `${med.name} for ${slot}`);
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
        <View><Text style={styles.headerTitle}>My Medicines 💊</Text><Text style={styles.headerSub}>{dayjs().format('dddd, DD MMMM')}</Text></View>
        <TouchableOpacity style={styles.histBtn} onPress={() => navigation.navigate('MedicineHistory')}><Text style={styles.histBtnText}>History</Text></TouchableOpacity>
      </View>
      <FlatList
        data={medicines}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <MedicineCard med={item} logs={logs} navigation={navigation} onAction={handleAction} onDelete={handleDelete} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyEmoji}>💊</Text><Text style={styles.emptyTitle}>No Medicines Added</Text><Text style={styles.emptySub}>Add your first medicine by tapping the button below.</Text></View>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMedicine')} activeOpacity={0.85}><Text style={styles.fabText}>+ Add Medicine</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.headingLarge, color: colors.textPrimary },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  histBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.primary },
  histBtnText: { ...typography.labelMedium, color: colors.primary },
  list: { paddingTop: spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xxxl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { ...typography.headingMedium, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  fab: { position: 'absolute', bottom: 24, right: spacing.xl, left: spacing.xl, backgroundColor: colors.primary, height: sizes.buttonHeight, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  fabText: { ...typography.labelLarge, color: '#fff' },
});
