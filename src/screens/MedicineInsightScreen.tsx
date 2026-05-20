import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import dayjs from 'dayjs';
import { stopMedicine } from '../db/queries/medicines';
import { db } from '../db/schema';
import { useTranslation } from 'react-i18next';
import { TranslatedText } from '../components/TranslatedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MedicineInsightScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { med } = route.params;
  const doseTimes = useMemo(() => JSON.parse(med.dose_times || '[]').sort(), [med.dose_times]);
  
  const [currentWeekOffset, setWeekOffset] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);

  const weekStart = dayjs().startOf('week').add(currentWeekOffset, 'week');
  const weekDates = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const monthLabel = weekStart.format('MMMM YYYY');

  const handleStop = () => {
    Alert.alert(t('stop_medicine', { defaultValue: 'Stop Medicine' }), `${t('stop_medicine_prompt', { defaultValue: 'Stop taking' })} ${med.name}?`, [
      { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      { text: t('stop', { defaultValue: 'Stop' }), style: 'destructive', onPress: () => {
        stopMedicine(med.id, 'Stopped by user');
        navigation.goBack();
      }},
    ]);
  };

  React.useEffect(() => {
    const start = weekStart.toISOString();
    const end = weekStart.add(6, 'day').endOf('day').toISOString();
    const results = db.execute(`
      SELECT * FROM reminder_logs WHERE medicine_id = ? AND action_time BETWEEN ? AND ?
    `, [med.id, start, end]).rows?._array || [];
    setLogs(results);
  }, [med.id, currentWeekOffset]);

  const stats = useMemo(() => {
    let totalPossible = 0;
    let taken = 0;
    let skipped = 0;
    let missed = 0;

    const startDate = dayjs(med.start_date).startOf('day');
    const endDate = med.end_date ? dayjs(med.end_date).endOf('day') : null;

    // Check performance for this week
    weekDates.forEach(date => {
      // Only count days where the medicine was active
      if (date.isBefore(startDate, 'day') || (endDate && date.isAfter(endDate, 'day'))) return;

      const slots = date.isSame(dayjs(), 'day') 
        ? doseTimes.filter((t: string) => t <= dayjs().format('HH:mm'))
        : date.isAfter(dayjs(), 'day') ? [] : doseTimes;

      totalPossible += slots.length;
      
      const dayLogs = logs.filter(l => dayjs(l.action_time).isSame(date, 'day'));
      slots.forEach((time: string) => {
        const log = dayLogs.find(l => l.scheduled_time === time);
        if (log?.action === 'taken') taken++;
        else if (log?.action === 'skipped') skipped++;
        else missed++;
      });
    });

    const score = totalPossible > 0 ? (taken / totalPossible) * 100 : 0;
    
    let feedback = {
      title: 'Healthy Recovery!',
      body: 'You are following the schedule perfectly for this medicine.',
      color: colors.success,
      emoji: '🛡️'
    };

    if (totalPossible === 0) {
      feedback = { title: 'Treatment Started', body: 'Your schedule for this medicine begins on ' + startDate.format('DD MMM') + '.', color: colors.primary, emoji: '📅' };
    } else if (score < 40) {
      feedback = { title: 'Needs Attention', body: 'Missing doses makes the medicine less effective. Please be regular.', color: colors.danger, emoji: '🚨' };
    } else if (score < 80) {
      feedback = { title: 'Keep it Up', body: 'You are doing good, but try not to skip any more doses.', color: colors.warning, emoji: '📈' };
    }

    return { taken, skipped, missed, score, feedback, totalPossible };
  }, [logs, doseTimes, weekDates, med]);

  const renderGrid = () => (
    <View style={grid.container}>
      <View style={grid.headerRow}>
        <View style={grid.labelCol} />
        {weekDates.map(d => (
          <View key={d.format('D')} style={grid.headerCell}>
            <Text style={grid.dayText}>{d.format('ddd')}</Text>
            <Text style={grid.dateText}>{d.format('D')}</Text>
          </View>
        ))}
      </View>

      {doseTimes.map((time: string) => (
        <View key={time} style={grid.row}>
          <View style={grid.labelCol}><Text style={grid.timeText}>{time}</Text></View>
          {weekDates.map((date, i) => {
            const startDate = dayjs(med.start_date).startOf('day');
            const endDate = med.end_date ? dayjs(med.end_date).endOf('day') : null;
            const isActive = !date.isBefore(startDate, 'day') && (!endDate || !date.isAfter(endDate, 'day'));
            
            const log = logs.find(l => dayjs(l.action_time).isSame(date, 'day') && l.scheduled_time === time);
            const isPast = date.isSame(dayjs(), 'day') ? time <= dayjs().format('HH:mm') : date.isBefore(dayjs(), 'day');

            let boxStyle = grid.noneBox;
            let icon = null;

            if (!isActive) { boxStyle = grid.noneBox; }
            else if (log?.action === 'taken') { boxStyle = grid.takenBox; icon = '✓'; }
            else if (log?.action === 'skipped') { boxStyle = grid.skippedBox; icon = '✕'; }
            else if (isPast) { boxStyle = grid.missedBox; icon = '!'; }
            else { boxStyle = grid.pendingBox; }

            return (
              <View key={i} style={[grid.cell, boxStyle]}>
                {icon && <Text style={[grid.cellIcon, boxStyle === grid.missedBox && { color: colors.textMuted }]}>{icon}</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>← {t('back', { defaultValue: 'Back' })}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('medicine_insights', { defaultValue: 'Medicine Insights' })}</Text>
        <TouchableOpacity onPress={handleStop} style={styles.stopBtn}><Text style={styles.stopText}>⏹️ {t('stop', { defaultValue: 'Stop' })}</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.medCard}>
          <Text style={styles.medName}>{med.name}</Text>
          <Text style={styles.medDose}>{med.dose_amount} {med.dose_unit} · {doseTimes.join(', ')}</Text>
        </View>

        <View style={styles.feedbackCard}>
          <View style={[styles.feedbackEmojiBg, { backgroundColor: stats.feedback.color + '20' }]}><Text style={styles.feedbackEmoji}>{stats.feedback.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <TranslatedText style={[styles.feedbackTitle, { color: stats.feedback.color }]}>{stats.feedback.title}</TranslatedText>
            <TranslatedText style={styles.feedbackBody}>{stats.feedback.body}</TranslatedText>
          </View>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.navRow}>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <View style={styles.arrows}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setWeekOffset(p => p - 1)}><Text style={styles.arrowText}>◀</Text></TouchableOpacity>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setWeekOffset(p => p + 1)}><Text style={styles.arrowText}>▶</Text></TouchableOpacity>
            </View>
          </View>
          {renderGrid()}
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>{t('taken', { defaultValue: 'Taken' })}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>{t('skipped', { defaultValue: 'Skipped' })}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#E5E7EB' }]} /><Text style={styles.legendText}>{t('missed', { defaultValue: 'Missed' })}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#F3F4F6' }]} /><Text style={styles.legendText}>{t('upcoming', { defaultValue: 'Upcoming' })}</Text></View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.taken}</Text><Text style={styles.statLabel}>{t('taken', { defaultValue: 'Taken' })}</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.score.toFixed(0)}%</Text><Text style={styles.statLabel}>{t('score', { defaultValue: 'Score' })}</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.missed + stats.skipped}</Text><Text style={styles.statLabel}>{t('missed', { defaultValue: 'Missed' })}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const grid = StyleSheet.create({
  container: { paddingVertical: spacing.md },
  headerRow: { flexDirection: 'row', marginBottom: spacing.md },
  labelCol: { width: 50, justifyContent: 'center' },
  headerCell: { flex: 1, alignItems: 'center' },
  dayText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  dateText: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  row: { flexDirection: 'row', marginBottom: 8, height: 40 },
  timeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  cell: { flex: 1, margin: 2, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  noneBox: { backgroundColor: 'transparent' },
  pendingBox: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  missedBox: { backgroundColor: '#E5E7EB' },
  takenBox: { backgroundColor: colors.success },
  skippedBox: { backgroundColor: colors.danger },
  cellIcon: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  headerTitle: { ...typography.headingMedium, color: colors.textPrimary },
  stopBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.warning + '20', borderWidth: 1, borderColor: colors.warning + '40' },
  stopText: { fontSize: 12, color: colors.warning, fontWeight: '700' },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  medCard: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  medName: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  medDose: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  feedbackCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  feedbackEmojiBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  feedbackEmoji: { fontSize: 28 },
  feedbackTitle: { fontSize: 18, fontWeight: '700' },
  feedbackBody: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  historyCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  monthLabel: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  arrows: { flexDirection: 'row', gap: 12 },
  arrowBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  arrowText: { fontSize: 14, color: colors.primary },
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBox: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
