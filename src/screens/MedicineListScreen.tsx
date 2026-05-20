import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView, Alert, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePatientStore } from '../store/patientStore';
import { getMedicines, deleteMedicine, stopMedicine } from '../db/queries/medicines';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { colors, typography, borderRadius } from '../theme';
import { useReminders } from '../hooks/useReminders';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

const getMedIcon = (unit: string) => {
  const u = unit?.toLowerCase() || '';
  if (u.includes('capsule')) return 'pill';
  if (u.includes('tablet')) return 'circle-slice-8';
  if (u.includes('drop')) return 'water-outline';
  if (u.includes('syrup') || u.includes('ml') || u.includes('spoon')) return 'bottle-tonic-plus-outline';
  if (u.includes('tube') || u.includes('cream') || u.includes('gel')) return 'tube';
  if (u.includes('powder')) return 'shaker-outline';
  if (u.includes('patch')) return 'bandage';
  return 'pill';
};

function MedicineCard({ med, allLogs, navigation, onDelete, onStop }: any) {
  const { t } = useTranslation();
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
            {med.image_path ? <Image source={{ uri: med.image_path }} style={card.image} /> : <LinearGradient colors={[colors.primaryLight, '#FFFFFF']} style={card.iconBox}><Icon name={getMedIcon(med.dose_unit)} size={24} color={colors.primaryDark} /></LinearGradient>}
          </View>
          <View style={card.center}>
            <Text style={card.name} numberOfLines={1}>{med.name}</Text>
            <Text style={card.dose}>{doseStr}  <Text style={card.startDateText}>{t('started', { defaultValue: 'Started' })} {startLabel}</Text></Text>
            <View style={card.timeRow}>
              {times.map((t, idx) => (
                <View key={idx} style={card.timeBadge}><Text style={card.timeText}>{t}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={card.statsStrip}>
          <View style={styles.inlineStat}>
            <Icon name="check-circle" size={14} color={colors.success} />
            <Text style={card.statTxt}>{t('taken', { defaultValue: 'Taken' })}: <Text style={{ fontWeight: '800', color: colors.success }}>{medStats.taken}</Text></Text>
          </View>
          <View style={card.divider} />
          <View style={styles.inlineStat}>
            <Icon name="alert-circle" size={14} color={colors.danger} />
            <Text style={card.statTxt}>{t('missed', { defaultValue: 'Missed' })}: <Text style={{ fontWeight: '800', color: colors.danger }}>{medStats.totalMissed}</Text></Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={card.actionColumn}>
        <TouchableOpacity style={card.editBtn} onPress={() => navigation.navigate('AddMedicine', { editMedicine: med })}>
          <Icon name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={card.stopBtn} onPress={() => onStop(med)}>
          <Icon name="stop-circle-outline" size={18} color={colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity style={card.deleteBtn} onPress={() => onDelete(med)}>
          <Icon name="trash-can-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 5,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    flexDirection: 'row',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden' },
  image: { width: '100%', height: '100%', backgroundColor: colors.background },
  iconBox: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, gap: 1 },
  name: { fontSize: 17, fontWeight: '900', color: colors.ink },
  dose: { fontSize: 12, color: colors.textSecondary },
  startDateText: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  timeBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary + '24' },
  timeText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  
  actionColumn: { justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.divider, marginLeft: 8 },
  editBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  stopBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerLight },
  
  statsStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  statTxt: { fontSize: 11, color: colors.textSecondary, marginLeft: 6 },
  divider: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 12 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.headingLarge, color: colors.ink },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  histBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  histBtnText: { fontSize: 12, color: colors.primaryDark, fontWeight: '800' },
  list: { paddingTop: 12, paddingBottom: 100 },
  inlineStat: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  fab: { position: 'absolute', bottom: 92, right: 20, left: 20, backgroundColor: colors.primaryDark, height: 54, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: colors.cardShadow, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  fabText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export default function MedicineListScreen({ navigation }: any) {
  const { t } = useTranslation();
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
    Alert.alert(t('stop_medicine', { defaultValue: 'Stop Medicine' }), `${t('stop_confirm', { defaultValue: 'Stop taking' })} ${med.name}?`, [
      { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      { text: t('stop', { defaultValue: 'Stop' }), style: 'destructive', onPress: () => {
        stopMedicine(med.id, 'Stopped by user');
        cancelAll(med.id);
        load();
      }},
    ]);
  };

  const handleDelete = (med: any) => {
    Alert.alert(t('delete_medicine', { defaultValue: 'Delete Medicine' }), `${t('delete_confirm', { defaultValue: 'Permanently delete' })} ${med.name}?`, [
      { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      { text: t('delete', { defaultValue: 'Delete' }), style: 'destructive', onPress: () => {
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
        <View><Text style={styles.headerTitle}>{t('my_medicines', { defaultValue: 'My Medicines' })}</Text><Text style={styles.headerSub}>{dayjs().format('dddd, DD MMMM')}</Text></View>
        <TouchableOpacity style={styles.histBtn} onPress={() => navigation.navigate('MedicineHistory')}><Text style={styles.histBtnText}>{t('history', { defaultValue: 'History' })}</Text></TouchableOpacity>
      </View>
      <FlatList
        data={medicines}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <MedicineCard med={item} allLogs={allLogs} navigation={navigation} onDelete={handleDelete} onStop={handleStop} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Icon name="pill-off" size={58} color={colors.textMuted} /><Text style={styles.emptyTitle}>{t('no_medicines', { defaultValue: 'No Medicines Added' })}</Text><Text style={styles.emptySub}>{t('add_first_med', { defaultValue: 'Add your first medicine tapping the button below.' })}</Text></View>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMedicine')} activeOpacity={0.85}><Text style={styles.fabText}>+ {t('add_medicine', { defaultValue: 'Add Medicine' })}</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
