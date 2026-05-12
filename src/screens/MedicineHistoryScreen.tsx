import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { db } from '../db/schema';
import { colors, typography, spacing, borderRadius } from '../theme';
import dayjs from 'dayjs';

export default function MedicineHistoryScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!patient?.id) return;
    const start = dayjs().subtract(30, 'day').toISOString();
    const res = db.execute(`
      SELECT rl.*, m.name as medicine_name
      FROM reminder_logs rl
      JOIN medicines m ON m.id = rl.medicine_id
      WHERE m.patient_id = ? AND rl.action_time >= ?
      ORDER BY rl.action_time DESC
    `, [patient.id, start]);
    setLogs(res.rows?._array || []);
  }, [patient?.id]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Medicine History</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No history yet</Text>
          </View>
        ) : logs.map((log, i) => (
          <View key={i} style={styles.logRow}>
            <View style={[styles.statusDot, { backgroundColor: log.action === 'taken' ? colors.success : colors.warning }]} />
            <View style={styles.logInfo}>
              <Text style={styles.logMed}>{log.medicine_name}</Text>
              <Text style={styles.logTime}>{dayjs(log.action_time).format('DD MMM, hh:mm A')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: log.action === 'taken' ? colors.successLight : colors.warningLight }]}>
              <Text style={[styles.badgeText, { color: log.action === 'taken' ? colors.success : colors.warning }]}>
                {log.action}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.xl, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { ...typography.bodyMedium, color: colors.primary },
  title: { ...typography.headingMedium, color: colors.textPrimary },
  scroll: { padding: spacing.xl, gap: spacing.sm },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  logInfo: { flex: 1 },
  logMed: { ...typography.labelMedium, color: colors.textPrimary },
  logTime: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  badgeText: { ...typography.tiny, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: spacing.lg },
  emptyText: { ...typography.headingSmall, color: colors.textMuted },
});
