import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Dimensions, Animated,
  LayoutAnimation, Platform, UIManager, FlatList
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { getMedicines, getTodayLogs, logReminderAction } from '../db/queries/medicines';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 64;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(t: any) {
  const h = dayjs().hour();
  if (h < 12) return { text: t('greet_morning'), icon: '🌅' };
  if (h < 17) return { text: t('greet_afternoon'), icon: '☀️' };
  if (h < 21) return { text: t('greet_evening'), icon: '🌇' };
  return { text: t('greet_night'), icon: '🌙' };
}

function getDoctorNote(t: any, taken: number, total: number, skipped: number, activeDoses: any[]) {
  if (total === 0) return t('note_empty');
  if (activeDoses.length > 0) return t('note_due', { name: activeDoses[0].name });
  if (skipped > 0) return t('note_skipped', { count: skipped });
  if (taken === total && total > 0) return t('note_perfect');
  const left = total - taken - skipped;
  return t('note_progress', { taken, left });
}

// ─── Active Dose Carousel Card ───────────────────────────────────────────────

// ─── Active Dose Carousel Card ───────────────────────────────────────────────

function ActiveDoseCard({ item, onAction }: any) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { t } = useTranslation();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePress = (action: 'taken' | 'skipped') => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
      onAction(item, action);
    });
  };

  return (
    <Animated.View style={[styles.activeCard, { opacity: fadeAnim, width: CAROUSEL_CARD_WIDTH }]}>
      <View style={styles.activeCardHeader}>
        <View style={styles.activeTimeBadge}>
          <Text style={styles.activeTimeText}>⏰  {item.scheduled_time}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.duePill}>
            <Text style={styles.dueTag}>● {t('due_now')}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.activeMain}>
        <View style={styles.activeIconBox}>
          <Text style={{ fontSize: 26 }}>💊</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeMedName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.activeMedDose}>{item.dose_amount} {item.dose_unit}</Text>
          {item.how_to_take ? (
            <View style={styles.howToTakeTag}>
              <Text style={styles.howToTakeText}>
                {item.how_to_take === 'before_food' ? `🍽️ ${t('before_food')}` :
                 item.how_to_take === 'after_food'  ? `🍽️ ${t('after_food')}` :
                 item.how_to_take === 'with_food'   ? `🍽️ ${t('with_food')}` : `💧 ${t('with_water')}`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.activeActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={() => handlePress('taken')} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>✓  {t('i_took_it')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => handlePress('skipped')} activeOpacity={0.8}>
          <Text style={[styles.actionBtnText, { color: '#64748b' }]}>{t('skipped')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Patient Health Card ─────────────────────────────────────────────────────

function PatientHealthCard({ patient, navigation }: any) {
  const { t } = useTranslation();
  const conditions = Array.isArray(patient?.conditions) 
    ? patient.conditions 
    : JSON.parse(patient?.conditions || '[]');
  const conditionEmojis: Record<string, string> = {
    diabetes: '🩸', bp: '❤️', heart: '💓', thyroid: '🔵',
    kidney: '🫘', asthma: '🫁', arthritis: '🦴',
  };

  return (
    <TouchableOpacity
      style={styles.healthCard}
      onPress={() => navigation.navigate('Profile')}
      activeOpacity={0.92}>
      <View style={styles.healthCardHeader}>
        <View style={styles.healthCardLeft}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{(patient?.name || 'U')[0]}</Text>
          </View>
          <View>
            <Text style={styles.healthName}>{patient?.name}</Text>
            <Text style={styles.healthMeta}>
              {patient?.age} {t('years')}  ·  {patient?.gender === 'male' ? t('male') : patient?.gender === 'female' ? t('female') : t('other')}
              {patient?.blood_group ? `  ·  🩸 ${patient.blood_group}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.editTag}>
          <Text style={styles.editTagText}>{t('profile_setup')} →</Text>
        </View>
      </View>

      {conditions.length > 0 && (
        <View style={styles.conditionRow}>
          {conditions.map((c: string, i: number) => (
            <View key={i} style={styles.conditionChip}>
              <Text style={styles.conditionChipText}>
                {conditionEmojis[c] || '🔹'} {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {patient?.doctor_name ? (
        <View style={styles.doctorRow}>
          <Text style={styles.doctorRowText}>👨‍⚕️ {t('doctor_label')}: {patient.doctor_name}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Today's Summary Card ────────────────────────────────────────────────────

function TodaySummaryCard({ stats, skippedDoses, navigation }: any) {
  const { t } = useTranslation();
  const { taken, total, skipped } = stats;
  const pending = total - taken - skipped;
  const progress = total > 0 ? taken / total : 0;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCardHeader}>
        <Text style={styles.summaryCardTitle}>{t('todays_medicines')}</Text>
        <Text style={styles.summaryDate}>{dayjs().format('DD MMM YYYY')}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{t('percent_complete', { percent: Math.round(progress * 100) })}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
          <Text style={[styles.statNum, { color: colors.success }]}>{taken}</Text>
          <Text style={styles.statLabel}>{t('li_hain')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#fff7ed' }]}>
          <Text style={[styles.statNum, { color: '#f97316' }]}>{pending}</Text>
          <Text style={styles.statLabel}>{t('baaki_hain')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.statNum, { color: colors.danger }]}>{skipped}</Text>
          <Text style={styles.statLabel}>{t('skip_hui')}</Text>
        </View>
      </View>

      {/* Skipped detail */}
      {skippedDoses.length > 0 && (
        <View style={styles.skippedSection}>
          <Text style={styles.skippedHeading}>{t('skipped_medicines')}</Text>
          {skippedDoses.map((d: any, i: number) => (
            <View key={i} style={styles.skippedRow}>
              <Text style={styles.skippedDot}>⛔</Text>
              <Text style={styles.skippedMedName}>{d.name}</Text>
              <Text style={styles.skippedTime}>— {d.scheduled_time}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => navigation.navigate('Medicines')}
        activeOpacity={0.8}>
        <Text style={styles.viewAllBtnText}>{t('view_full_list')} →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Doctor Note Banner ──────────────────────────────────────────────────────

function DoctorNoteBanner({ note }: { note: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [note]);

  return (
    <Animated.View style={[styles.doctorBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.doctorIconCircle}>
        <Text style={{ fontSize: 20 }}>🩺</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.doctorBannerLabel}>MediSaaN AI</Text>
        <Text style={styles.doctorBannerNote}>{note}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Main HomeScreen ─────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { t } = useTranslation();
  const [activeDoses, setActiveDoses] = useState<any[]>([]);
  const [skippedDoses, setSkippedDoses] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, taken: 0, skipped: 0 });
  const greeting = getGreeting(t);

  const loadReminders = useCallback(() => {
    if (!patient?.id) return;
    const meds = getMedicines(patient.id);
    const logs = getTodayLogs(patient.id);
    const now = dayjs();

    let total = 0, taken = 0, skipped = 0;
    let active: any[] = [];
    let skippedList: any[] = [];

    meds.forEach(med => {
      const times: string[] = JSON.parse(med.dose_times || '[]').sort();
      times.forEach((tStr: string) => {
        const log = logs.find(l => l.medicine_id === med.id && l.scheduled_time === tStr);
        total++;
        if (log?.action === 'taken') {
          taken++;
        } else if (log?.action === 'skipped') {
          skipped++;
          skippedList.push({ ...med, scheduled_time: tStr });
        } else {
          const [h, m] = tStr.split(':').map(Number);
          const scheduled = dayjs().hour(h).minute(m).second(0);
          const windowEnd = scheduled.add(3, 'hour');
          if ((now.isAfter(scheduled) || now.isSame(scheduled)) && now.isBefore(windowEnd)) {
            active.push({ ...med, scheduled_time: tStr });
          }
        }
      });
    });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveDoses(active);
    setSkippedDoses(skippedList);
    setTodayStats({ total, taken, skipped });
  }, [patient?.id]);

  useFocusEffect(useCallback(() => { loadReminders(); }, [loadReminders]));

  useEffect(() => {
    const timer = setInterval(loadReminders, 15000);
    return () => clearInterval(timer);
  }, [loadReminders]);

  const handleAction = (item: any, action: 'taken' | 'skipped') => {
    logReminderAction(item.id, item.scheduled_time, action);
    loadReminders();
  };

  const doctorNote = getDoctorNote(t, todayStats.taken, todayStats.total, todayStats.skipped, activeDoses);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>{greeting.icon}  {greeting.text}</Text>
            <Text style={styles.patientName}>{patient?.name || t('home_greeting', { name: '' })} 🙏</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(patient?.name || 'U')[0]}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── AI Doctor Note ── */}
        <View style={styles.section}>
          <DoctorNoteBanner note={doctorNote} />
        </View>

        {/* ── Patient Health Card ── */}
        {patient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('health_profile_title')}</Text>
            <PatientHealthCard patient={patient} navigation={navigation} />
          </View>
        )}

        {/* ── Active / Due Now Doses ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('due_now')}</Text>
            {activeDoses.length > 1 && (
              <Text style={styles.swipeHint}>{t('swipe_hint')}</Text>
            )}
          </View>
          {activeDoses.length > 0 ? (
            <FlatList
              horizontal
              data={activeDoses}
              keyExtractor={item => `${item.id}-${item.scheduled_time}`}
              renderItem={({ item }) => <ActiveDoseCard item={item} onAction={handleAction} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              snapToInterval={CAROUSEL_CARD_WIDTH + 16}
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.allDoneCard}>
              <Text style={{ fontSize: 32 }}>✨</Text>
              <Text style={styles.allDoneTitle}>{t('no_pending_title')}</Text>
              <Text style={styles.allDoneSub}>
                {todayStats.total === 0
                  ? t('no_pending_empty')
                  : t('no_pending_wait')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Today's Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aaj_ka_hisaab')}</Text>
          <TodaySummaryCard
            stats={todayStats}
            skippedDoses={skippedDoses}
            navigation={navigation}
          />
        </View>

        {/* ── AI Tools ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('essential_tools')}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>⚡ AI Powered</Text>
            </View>
          </View>

          <View style={styles.toolsGrid}>
            {[
              { screen: 'QuickScan',       emoji: '📷', label: t('tool_scan_label'),    color: '#FEF3C7', border: '#FDE68A', desc: t('tool_scan_desc') },
              { screen: 'ReportScan',      emoji: '📋', label: t('tool_report_label'),  color: '#F0FDF4', border: '#BBF7D0', desc: t('tool_report_desc') },
              { screen: 'Chat',            emoji: '🤖', label: t('tool_chat_label'),    color: '#EFF6FF', border: '#BFDBFE', desc: t('tool_chat_desc') },
              { screen: 'MedicineHistory', emoji: '📊', label: t('tool_history_label'), color: '#F5F3FF', border: '#DDD6FE', desc: t('tool_history_desc') },
            ].map((tool, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.toolCard, { backgroundColor: tool.color, borderColor: tool.border }]}
                onPress={() => navigation.navigate(tool.screen)}
                activeOpacity={0.85}>
                <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                <Text style={styles.toolLabel}>{tool.label}</Text>
                <Text style={styles.toolDesc}>{tool.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Add Medicine CTA ── */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <TouchableOpacity
            style={styles.addMedBtn}
            onPress={() => navigation.navigate('AddMedicine')}
            activeOpacity={0.85}>
            <Text style={styles.addMedBtnText}>{t('add_new_med')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, marginBottom: 20,
  },
  greetingSmall: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  patientName: { fontSize: 26, fontWeight: '800', color: '#1e293b' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 5,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },

  // Section layout
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 14 },
  swipeHint: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // Doctor Banner
  doctorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18, padding: 16,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary, shadowOpacity: 0.08,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  doctorIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e8f5f3',
    justifyContent: 'center', alignItems: 'center',
  },
  doctorBannerLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  doctorBannerNote: { fontSize: 14, fontWeight: '500', color: '#334155', lineHeight: 20 },

  // Patient Health Card
  healthCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  healthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  healthCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLarge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary + '40',
  },
  avatarLargeText: { fontSize: 22, fontWeight: '800', color: colors.primary },
  healthName: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  healthMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  editTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  editTagText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  conditionChip: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  conditionChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  doctorRow: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  doctorRowText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Active Dose Carousel
  carouselContainer: { paddingRight: 24, gap: 16 },
  activeCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 18,
    elevation: 6,
    shadowColor: colors.primary, shadowOpacity: 0.1,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  activeTimeBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  activeTimeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  duePill: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dueTag: { color: colors.danger, fontSize: 10, fontWeight: '800' },
  activeMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  activeIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  activeMedName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  activeMedDose: { fontSize: 13, color: '#64748b', marginTop: 2 },
  howToTakeTag: { marginTop: 6 },
  howToTakeText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  activeActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnOutline: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // All Done Card
  allDoneCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  allDoneTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 10 },
  allDoneSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Today Summary Card
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2,
  },
  summaryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  summaryCardTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  summaryDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 16, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 2, textAlign: 'center' },
  skippedSection: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 14 },
  skippedHeading: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginBottom: 8 },
  skippedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  skippedDot: { fontSize: 12 },
  skippedMedName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  skippedTime: { fontSize: 12, color: '#94a3b8' },
  viewAllBtn: {
    backgroundColor: colors.primary + '10', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  viewAllBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // AI Tools Grid
  aiBadge: {
    backgroundColor: colors.primary + '15', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    borderRadius: 20, padding: 16,
    borderWidth: 1.5,
    elevation: 1,
  },
  toolEmoji: { fontSize: 26, marginBottom: 8 },
  toolLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', lineHeight: 20, marginBottom: 4 },
  toolDesc: { fontSize: 11, fontWeight: '500', color: '#64748b' },

  // Add Medicine CTA
  addMedBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  addMedBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});