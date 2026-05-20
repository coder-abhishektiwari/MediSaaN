import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, SectionList, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePatientStore } from '../store/patientStore';
import { db } from '../db/schema';
import { colors, spacing, borderRadius, typography } from '../theme';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MedicineHistoryScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { patient } = usePatientStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  useEffect(() => {
    if (!patient?.id) return;
    const start = dayjs().subtract(12, 'month').toISOString();
    
    // Fetch logs but ensure we deduplicate any potential double-entries from the DB level
    const logRes = db.execute(`
      SELECT rl.*, m.name as medicine_name, m.dose_unit
      FROM reminder_logs rl
      JOIN medicines m ON m.id = rl.medicine_id
      WHERE m.patient_id = ? AND rl.action_time >= ?
      GROUP BY rl.medicine_id, rl.scheduled_time, DATE(rl.action_time)
      ORDER BY rl.action_time DESC
    `, [patient.id, start]);
    
    // Final JS-level cleanup to be 100% sure: one log per medicine-slot-date
    const uniqueLogsMap = new Map();
    (logRes.rows?._array || []).forEach(l => {
      const key = `${l.medicine_id}-${l.scheduled_time}-${dayjs(l.action_time).format('YYYYMMDD')}`;
      if (!uniqueLogsMap.has(key)) {
        uniqueLogsMap.set(key, l);
      }
    });
    setLogs(Array.from(uniqueLogsMap.values()));

    const medRes = db.execute('SELECT * FROM medicines WHERE patient_id = ?', [patient.id]);
    setMedicines(medRes.rows?._array || []);
  }, [patient?.id]);

  const getDayCompliance = (date: dayjs.Dayjs) => {
    let totalDoses = 0;
    let takenDoses = 0;
    let skippedDoses = 0;
    const now = dayjs();
    const slotMap = new Map();

    medicines.forEach(med => {
      const start = dayjs(med.start_date).startOf('day');
      const end = med.end_date ? dayjs(med.end_date).endOf('day') : null;
      if (date.isBefore(start, 'day') || (end && date.isAfter(end, 'day'))) return;

      const doseTimes = JSON.parse(med.dose_times || '[]').sort();
      
      doseTimes.forEach((slot: string, index: number) => {
        const slotKey = `${med.id}-${slot}`;
        const slotTime = date.hour(parseInt(slot.split(':')[0])).minute(parseInt(slot.split(':')[1]));
        
        // Find the log for this specific slot on this date
        const log = logs.find(l => 
          l.medicine_id === med.id && 
          l.scheduled_time === slot && 
          dayjs(l.action_time).isSame(date, 'day')
        );

        if (log) {
          if (log.action === 'taken') takenDoses++;
          else if (log.action === 'skipped') skippedDoses++;
          totalDoses++;
          slotMap.set(slotKey, { ...log, medicine_name: med.name });
        } else if (date.isBefore(now, 'day')) {
          totalDoses++;
          slotMap.set(slotKey, {
            id: `missed-${med.id}-${date.format('YYYYMMDD')}-${slot}`,
            medicine_id: med.id,
            medicine_name: med.name,
            scheduled_time: slot,
            action_time: slotTime.toISOString(),
            action: 'missed'
          });
        } else if (date.isSame(now, 'day')) {
          const nextSlot = doseTimes[index + 1];
          let windowClosed = false;
          if (nextSlot) {
            const nextSlotTime = date.hour(parseInt(nextSlot.split(':')[0])).minute(parseInt(nextSlot.split(':')[1]));
            windowClosed = now.isAfter(nextSlotTime.subtract(1, 'hour'));
          } else {
            windowClosed = now.isAfter(date.endOf('day').subtract(2, 'hour')); 
          }

          if (windowClosed && now.isAfter(slotTime)) {
            totalDoses++;
            slotMap.set(slotKey, {
              id: `missed-${med.id}-${date.format('YYYYMMDD')}-${slot}`,
              medicine_id: med.id,
              medicine_name: med.name,
              scheduled_time: slot,
              action_time: slotTime.toISOString(),
              action: 'missed'
            });
          }
        }
      });
    });

    return { totalDoses, takenDoses, skippedDoses, dateLogs: Array.from(slotMap.values()) };
  };

  const sections = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    for (let i = 0; i < 30; i++) {
      const date = dayjs().subtract(i, 'day');
      const { dateLogs } = getDayCompliance(date);
      if (dateLogs.length === 0) continue;
      const label = date.isSame(dayjs(), 'day') ? t('today', { defaultValue: 'Today' }) :
                    date.isSame(dayjs().subtract(1, 'day'), 'day') ? t('yesterday', { defaultValue: 'Yesterday' }) : date.format('DD MMMM YYYY');
      groups[label] = dateLogs.sort((a, b) => dayjs(b.action_time).diff(dayjs(a.action_time)));
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [logs, medicines]);

  const stats = useMemo(() => {
    let totalScheduled = 0;
    let totalTaken = 0;
    let totalSkipped = 0;
    for (let i = 0; i < 30; i++) {
      const d = dayjs().subtract(i, 'day');
      const { totalDoses, takenDoses, skippedDoses } = getDayCompliance(d);
      totalScheduled += totalDoses;
      totalTaken += takenDoses;
      totalSkipped += skippedDoses;
    }
    const score = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;
    let feedback = { title: t('healthy_recovery', { defaultValue: 'Healthy Recovery!' }), body: t('keep_following_schedule', { defaultValue: 'Keep following the schedule for best results!' }), color: colors.success, emoji: '🛡️' };
    if (totalScheduled === 0) feedback = { title: t('welcome', { defaultValue: 'Welcome!' }), body: t('add_medicines_to_track', { defaultValue: 'Add medicines to start tracking your health.' }), color: colors.primary, emoji: '👋' };
    else if (score < 40) feedback = { title: t('urgent_action', { defaultValue: 'Urgent Action' }), body: t('many_doses_missed', { defaultValue: 'Many doses are being missed. Consistency is critical for recovery.' }), color: colors.danger, emoji: '🚨' };
    else if (score < 80) feedback = { title: t('almost_perfect', { defaultValue: 'Almost Perfect' }), body: t('try_not_to_miss', { defaultValue: 'Try not to miss any more doses. You are doing well!' }), color: colors.warning, emoji: '📈' };
    return { score, totalTaken, totalSkipped, totalScheduled, feedback };
  }, [logs, medicines]);

  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push({ day: null });
    for (let i = 1; i <= daysInMonth; i++) {
      const date = startOfMonth.date(i);
      const { totalDoses, takenDoses, skippedDoses } = getDayCompliance(date);
      let level = 'none';
      if (totalDoses > 0) {
        if (takenDoses === totalDoses) level = 'perfect';
        else if (skippedDoses > 0 && takenDoses === 0) level = 'skipped';
        else if (takenDoses > 0) level = 'partial';
        else level = 'missed';
      }
      days.push({ day: i, date, level, isToday: date.isSame(dayjs(), 'day'), isFuture: date.isAfter(dayjs(), 'day') });
    }
    return days;
  }, [currentMonth, logs, medicines]);

  const renderLog = ({ item }: { item: any }) => {
    const isTaken = item.action === 'taken';
    const isSkipped = item.action === 'skipped';
    const color = isTaken ? colors.success : (isSkipped ? colors.danger : '#9CA3AF');
    const statusText = isTaken ? t('taken', { defaultValue: 'Taken' }) : (isSkipped ? t('skipped', { defaultValue: 'Skipped' }) : t('missed', { defaultValue: 'Missed' }));
    const icon = isTaken ? '✅' : (isSkipped ? '❌' : '⚠️');
    return (
      <View style={styles.logCard}>
        <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}><Text style={{ fontSize: 20 }}>{icon}</Text></View>
        <View style={styles.logMain}>
          <View style={styles.logHeader}>
            <Text style={styles.medName} numberOfLines={1}>{item.medicine_name}</Text>
            <Text style={styles.logTime}>{item.scheduled_time}</Text>
          </View>
          <Text style={styles.logDetails} numberOfLines={1}>
            {isTaken ? `${t('taken_at', { defaultValue: 'Taken at' })} ${dayjs(item.action_time).format('hh:mm A')}` : 
             isSkipped ? `${t('skipped_at', { defaultValue: 'Skipped at' })} ${dayjs(item.action_time).format('hh:mm A')}` : 
             t('missed_window_closed', { defaultValue: 'Missed (Window Closed)' })}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + '10', borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{statusText}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.dashboard}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(p => p.subtract(1, 'month'))} style={styles.navBtn}><Text style={styles.navBtnText}>◀</Text></TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(p => p.add(1, 'month'))} style={styles.navBtn}><Text style={styles.navBtnText}>▶</Text></TouchableOpacity>
      </View>
      <View style={styles.calendarCard}>
        <View style={styles.weekDays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekDayLabel}>{d}</Text>)}</View>
        <View style={styles.calendarGrid}>{calendarDays.map((d, i) => {
            let bgColor = 'transparent';
            let textColor = colors.textPrimary;
            if (d.day) {
              if (d.isFuture) textColor = colors.textMuted;
              else if (d.level === 'perfect') bgColor = colors.success;
              else if (d.level === 'partial') bgColor = colors.warning;
              else if (d.level === 'skipped') bgColor = colors.danger;
              else if (d.level === 'missed') bgColor = '#E5E7EB';
              else bgColor = '#F9FAFB';
              if (d.level !== 'none' && !d.isFuture && d.level !== 'missed') textColor = '#fff';
            }
            return (
              <View key={i} style={styles.dayBox}><View style={[styles.dayCircle, { backgroundColor: bgColor }, d.isToday && { borderWidth: 2, borderColor: colors.primary }]}><Text style={[styles.dayText, { color: textColor }]}>{d.day}</Text></View></View>
            );
        })}</View>
      </View>
      {stats && stats.totalScheduled > 0 && (
        <View style={[styles.insightCard, { borderColor: stats.feedback.color + '40' }]}>
          <View style={[styles.insightEmojiBg, { backgroundColor: stats.feedback.color + '15' }]}><Text style={styles.insightEmoji}>{stats.feedback.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.insightTitle, { color: stats.feedback.color }]}>{stats.feedback.title}</Text>
            <Text style={styles.feedbackBody}>{stats.feedback.body}</Text>
          </View>
        </View>
      )}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}><Text style={styles.statNum}>{stats?.totalTaken}/{stats?.totalScheduled}</Text><Text style={styles.statLab}>{t('taken', { defaultValue: 'Taken' })}</Text></View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}><Text style={styles.statNum}>{stats?.totalSkipped}</Text><Text style={styles.statLab}>{t('skipped', { defaultValue: 'Skipped' })}</Text></View>
        <View style={styles.statItem}><Text style={styles.statNum}>{stats?.score.toFixed(0)}%</Text><Text style={styles.statLab}>{t('score', { defaultValue: 'Score' })}</Text></View>
      </View>
      <View style={styles.listHeaderDivider}><Text style={styles.sectionTitle}>{t('full_timeline', { defaultValue: 'Full Timeline' })}</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>← {t('back', { defaultValue: 'Back' })}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('medicine_history', { defaultValue: 'Health Insights' })}</Text>
        <View style={{ width: 60 }} />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id.toString() + index}
        renderItem={renderLog}
        ListHeaderComponent={renderHeader}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}><Text style={styles.dayHeader}>{title}</Text></View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>{t('no_data', { defaultValue: 'No Data' })}</Text>
            <Text style={styles.emptySub}>{t('logs_will_appear', { defaultValue: 'Logs will appear here once you start taking medicines.' })}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  headerTitle: { ...typography.headingMedium, color: colors.textPrimary },
  listContent: { paddingBottom: 40 },
  dashboard: { padding: spacing.lg },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  monthTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  navBtnText: { fontSize: 14, color: colors.primary },
  calendarCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  weekDays: { flexDirection: 'row', marginBottom: 8 },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  dayBox: { width: '14.28%', height: 45, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 13, fontWeight: '700' },
  insightCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', borderWidth: 1, marginBottom: spacing.md },
  insightEmojiBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  insightEmoji: { fontSize: 24 },
  insightTitle: { fontSize: 16, fontWeight: '700' },
  feedbackBody: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  statsStrip: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, marginBottom: 24 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: colors.primary },
  statLab: { fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', marginTop: 2 },
  listHeaderDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  dayHeader: { fontSize: 14, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  logMain: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  medName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  logTime: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  logDetails: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { width: 65, alignItems: 'center', paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
