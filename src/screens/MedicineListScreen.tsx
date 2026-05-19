import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView, Alert, Image, Dimensions } from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { getMedicines, deleteMedicine, stopMedicine } from '../db/queries/medicines';
import { db } from '../db/schema';
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

function MedicineCard({ med, allLogs, navigation, onDelete, onStop }: any) {
  const times: string[] = JSON.parse(med.dose_times || '[]').sort();
  
  const medStats = useMemo(() => {
    let taken = 0;
    let skipped = 0;
    let missed = 0;
    const startDate = dayjs(med.start_date).startOf('day');
    const now = dayjs();
    const medLogs = allLogs.filter((l: any) => l.medicine_id === med.id);
    
    medLogs.forEach((l: any) => {
      if (l.action === 'taken') taken++;
      else if (l.action === 'skipped') skipped++;
    });

    const diffDays = now.diff(startDate, 'day');
    for (let i = 0; i <= diffDays; i++) {
      const date = startDate.add(i, 'day');
      times.forEach(slot => {
        const [h, m] = slot.split(':').map(Number);
        const slotTime = date.hour(h).minute(m).second(0).millisecond(0);
        if (slotTime.isBefore(now)) {
          const logExists = medLogs.some((l: any) => l.scheduled_time === slot && dayjs(l.action_time).isSame(date, 'day'));
          if (!logExists) {
            if (date.isSame(now, 'day')) {
              if (now.isAfter(slotTime.add(3, 'hour'))) missed++;
            } else missed++;
          }
        }
      });
    }
    return { taken, totalMissed: skipped + missed };
  }, [med, allLogs, times]);

  const doseStr = `${med.dose_amount || ''} ${med.dose_unit || 'tablet'}`.trim();
  const startLabel = dayjs(med.start_date).format('DD MMM YYYY');

  return (
    <View style={card.wrap}>
      <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={() => navigation.navigate('MedicineInsight', { med })}>
        <View style={card.topRow}>
          <View style={card.iconContainer}>
            {med.image_path ? <Image source={{ uri: med.image_path }} style={card.image} /> : <View style={card.iconBox}><Text style={card.iconText}>{getMedIcon(med.dose_unit)}</Text></View>}
          </View>
          <View style={card.center}>
            <Text style={card.name} numberOfLines={1}>{med.name}</Text>
            <Text style={card.dose}>{doseStr} · <Text style={card.startDateText}>Started: {startLabel}</Text></Text>
            <View style={card.timeRow}>
              {times.map((t, idx) => (
                <View key={idx} style={card.timeBadge}><Text style={card.timeText}>{t}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={card.statsStrip}>
          <View style={styles.inlineStat}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={card.statTxt}>Taken: <Text style={{ fontWeight: '800', color: colors.success }}>{medStats.taken}</Text></Text>
          </View>
          <View style={card.divider} />
          <View style={styles.inlineStat}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={card.statTxt}>Missed: <Text style={{ fontWeight: '800', color: colors.danger }}>{medStats.totalMissed}</Text></Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={card.actionColumn}>
        <TouchableOpacity style={card.editBtn} onPress={() => navigation.navigate('AddMedicine', { editMedicine: med })}>
          <Text style={card.editIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.stopBtn} onPress={() => onStop(med)}>
          <Text style={card.stopIcon}>⏹️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.deleteBtn} onPress={() => onDelete(med)}>
          <Text style={card.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border, elevation: 2, flexDirection: 'row' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden' },
  image: { width: '100%', height: '100%', backgroundColor: colors.background },
  iconBox: { width: '100%', height: '100%', backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18 },
  center: { flex: 1, gap: 1 },
  name: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  dose: { fontSize: 12, color: colors.textSecondary },
  startDateText: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  timeBadge: { backgroundColor: colors.primary + '12', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: colors.primary + '30' },
  timeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  
  actionColumn: { justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border + '40', marginLeft: 8 },
  editBtn: { padding: 6 },
  editIcon: { fontSize: 18 },
  stopBtn: { padding: 6 },
  stopIcon: { fontSize: 16, color: colors.warning + '80' },
  deleteBtn: { padding: 6 },
  deleteIcon: { fontSize: 16, color: colors.danger + '80' },
  
  statsStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border + '40' },
  statTxt: { fontSize: 11, color: colors.textSecondary, marginLeft: 6 },
  divider: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 12 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.headingLarge, color: colors.textPrimary },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  histBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  histBtnText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  list: { paddingTop: 12, paddingBottom: 100 },
  inlineStat: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  fab: { position: 'absolute', bottom: 20, right: 20, left: 20, backgroundColor: colors.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default function MedicineListScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { cancelAll } = useReminders();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);

  const load = useCallback(() => {
    if (patient?.id) {
      setMedicines(getMedicines(patient.id));
      const res = db.execute('SELECT * FROM reminder_logs WHERE action_time >= ?', [dayjs().subtract(1, 'year').toISOString()]);
      setAllLogs(res.rows?._array || []);
    }
  }, [patient?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStop = (med: any) => {
    Alert.alert('Stop Medicine', `Stop taking ${med.name}? This will end the medicine schedule.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => {
        stopMedicine(med.id, 'Stopped by user');
        cancelAll(med.id);
        load();
      }},
    ]);
  };

  const handleDelete = (med: any) => {
    Alert.alert('Delete Medicine', `Permanently delete ${med.name}? This action cannot be undone.`, [
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
        renderItem={({ item }) => <MedicineCard med={item} allLogs={allLogs} navigation={navigation} onDelete={handleDelete} onStop={handleStop} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyEmoji}>💊</Text><Text style={styles.emptyTitle}>No Medicines Added</Text><Text style={styles.emptySub}>Add your first medicine tapping the button below.</Text></View>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMedicine')} activeOpacity={0.85}><Text style={styles.fabText}>+ Add Medicine</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
