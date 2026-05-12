import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Dimensions,
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { useReminders } from '../hooks/useReminders';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.xl * 2 - spacing.md) / 2;

const QUICK_ACTIONS = [
  { id: 'medicines', emoji: '💊', title: 'Dawai Reminder', sub: 'Schedule & track', color: '#E8F5F3', accent: colors.primary, nav: 'Medicines' },
  { id: 'scan',     emoji: '📷', title: 'Dawai Pahchaano', sub: 'Vol↑↓ shortcut', color: '#FEF3DC', accent: colors.accent,   nav: 'QuickScan' },
  { id: 'report',   emoji: '📋', title: 'Report Analyze', sub: 'Vol↑ 3s shortcut', color: '#FEF0EE', accent: colors.danger,   nav: 'ReportScan' },
  { id: 'chat',     emoji: '🎙', title: 'Bot se Poocho', sub: 'Ask health bot',   color: '#EBF5FB', accent: colors.info,     nav: 'Chat' },
];

function getGreeting() {
  const h = dayjs().hour();
  if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function ShortcutTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={tipStyles.banner}>
      <Text style={tipStyles.icon}>💡</Text>
      <Text style={tipStyles.text}>Vol↑↓ = Medicine Scan  •  Vol↑ 3s = Report Scan</Text>
      <TouchableOpacity onPress={onDismiss} style={tipStyles.close}>
        <Text style={tipStyles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const tipStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.sm, marginHorizontal: spacing.xl,
    padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.accent + '40',
  },
  icon: { fontSize: 16 },
  text: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  close: { padding: 4 },
  closeText: { ...typography.caption, color: colors.textMuted },
});

export default function HomeScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { getTodayStatus } = useReminders();
  const [showTip, setShowTip] = useState(true);
  const [todayStats, setTodayStats] = useState({ total: 0, taken: 0, skipped: 0 });
  const { text: greeting, emoji } = getGreeting();

  useEffect(() => {
    if (patient?.id) {
      const stats = getTodayStatus(patient.id);
      setTodayStats(stats);
    }
  }, [patient]);

  const progress = todayStats.total > 0 ? todayStats.taken / todayStats.total : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{emoji} {greeting}!</Text>
            <Text style={styles.patientName} numberOfLines={1}>
              Namaste, {patient?.name || 'User'} 🙏
            </Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{(patient?.name || 'U')[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Medicines</Text>
            <Text style={styles.progressCount}>
              {todayStats.taken}/{todayStats.total} taken
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressSub}>
            {todayStats.total === 0
              ? 'No medicines scheduled today'
              : progress === 1
              ? '✅ All medicines taken!'
              : `${todayStats.total - todayStats.taken} remaining`}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {showTip && <ShortcutTip onDismiss={() => setShowTip(false)} />}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: action.color, width: CARD_SIZE, height: CARD_SIZE }]}
              onPress={() => navigation.navigate(action.nav)}
              activeOpacity={0.8}
              accessibilityLabel={action.title}
            >
              <View style={[styles.actionIconBg, { backgroundColor: action.accent + '20' }]}>
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
              </View>
              <Text style={[styles.actionTitle, { color: action.accent }]}>{action.title}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Patient info strip */}
        {patient && (
          <View style={styles.patientStrip}>
            <Text style={styles.patientStripTitle}>Your Profile</Text>
            <View style={styles.patientStripRow}>
              {patient.age > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{patient.age} yrs</Text></View>}
              <View style={styles.badge}><Text style={styles.badgeText}>{patient.gender}</Text></View>
              {patient.city ? <View style={styles.badge}><Text style={styles.badgeText}>{patient.city}</Text></View> : null}
              {(patient.conditions || []).slice(0, 2).map(c => (
                <View key={c} style={[styles.badge, styles.badgeCondition]}>
                  <Text style={[styles.badgeText, { color: colors.danger }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBg: {
    backgroundColor: colors.primary,
    paddingBottom: spacing.xxl + 8,
    position: 'relative',
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -30,
  },
  headerCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -30,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  greeting: { ...typography.bodySmall, color: 'rgba(255,255,255,0.75)' },
  patientName: { ...typography.headingLarge, color: '#fff', maxWidth: 220 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { ...typography.headingMedium, color: '#fff' },
  progressCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressTitle: { ...typography.labelMedium, color: 'rgba(255,255,255,0.85)' },
  progressCount: { ...typography.labelMedium, color: '#fff', fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  progressSub: { ...typography.caption, color: 'rgba(255,255,255,0.65)', marginTop: spacing.sm },
  scroll: { flex: 1, marginTop: -spacing.xl },
  scrollContent: { paddingTop: spacing.xl + 4, paddingBottom: spacing.huge },
  sectionTitle: { ...typography.headingSmall, color: colors.textPrimary, marginHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.md },
  actionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: 4,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  actionIconBg: {
    position: 'absolute', top: spacing.lg, left: spacing.lg,
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  actionEmoji: { fontSize: 26 },
  actionTitle: { ...typography.labelLarge, fontWeight: '700' },
  actionSub: { ...typography.tiny, color: colors.textSecondary },
  patientStrip: {
    marginHorizontal: spacing.xl, marginTop: spacing.xxl,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  patientStripTitle: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: spacing.sm },
  patientStripRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  badgeText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  badgeCondition: { backgroundColor: colors.dangerLight },
});
