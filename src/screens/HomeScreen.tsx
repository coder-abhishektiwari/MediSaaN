import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Dimensions, Animated,
  LayoutAnimation, Platform, UIManager, FlatList, ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MMKV } from 'react-native-mmkv';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { getMedicines, getTodayLogs, logReminderAction, getAdherenceHistory } from '../db/queries/medicines';
import { getScanHistory } from '../db/queries/reports';
import { getDoctorConsultation, DoctorConsultation } from '../api/gemini';
import { colors, typography, borderRadius } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const doctorCache = new MMKV({ id: 'doctor-consultation-cache' });
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

const NATIVE_LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'हिंदी', bn: 'বাংলা', mr: 'मराठी',
  ta: 'தமிழ்', te: 'తెలుగు', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ', ur: 'اردو',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 64;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(t: any) {
  const h = dayjs().hour();
  if (h < 12) return { text: t('greet_morning'), icon: 'weather-sunset-up', colors: ['#FFE082', '#FF8A65', '#4DB6AC'] };
  if (h < 17) return { text: t('greet_afternoon'), icon: 'white-balance-sunny', colors: ['#FFF6C7', '#FFD54F', '#4CAF50'] };
  if (h < 21) return { text: t('greet_evening'), icon: 'weather-sunset', colors: ['#FFB74D', '#FF8A65', '#3F51B5'] };
  return { text: t('greet_night'), icon: 'weather-night', colors: ['#0B132B', '#1C2541', '#3A506B'] };
}

// getDoctorNote removed — replaced by AI Doctor Consultation

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
  }, [pulseAnim]);

  const handlePress = (action: 'taken' | 'skipped') => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
      onAction(item, action);
    });
  };

  return (
    <Animated.View style={[styles.activeCard, { opacity: fadeAnim, width: CAROUSEL_CARD_WIDTH }]}>
      <View style={styles.activeCardHeader}>
        <View style={styles.activeTimeBadge}>
          <Icon name="clock-time-four-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.activeTimeText}>{item.scheduled_time}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.duePill}>
            <Icon name="circle" size={7} color={colors.danger} />
            <Text style={styles.dueTag}>{t('due_now')}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.activeMain}>
        <View style={styles.activeIconBox}>
          <Icon name="pill" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeMedName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.activeMedDose}>{item.dose_amount} {item.dose_unit}</Text>
          {item.how_to_take ? (
            <View style={styles.howToTakeTag}>
              <Text style={styles.howToTakeText}>
                {item.how_to_take === 'before_food' ? t('before_food') :
                  item.how_to_take === 'after_food' ? t('after_food') :
                    item.how_to_take === 'with_food' ? t('with_food') : t('with_water')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.activeActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={() => handlePress('taken')} activeOpacity={0.8}>
          <Icon name="check" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>{t('i_took_it')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => handlePress('skipped')} activeOpacity={0.8}>
          <Icon name="clock-remove-outline" size={17} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>{t('skipped')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
              <Icon name="alert-circle-outline" size={14} color={colors.danger} />
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
        <Text style={styles.viewAllBtnText}>{t('view_full_list')}</Text>
        <Icon name="arrow-right" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── AI Doctor Consultation Card ─────────────────────────────────────────────

function ShimmerLine({ width, height = 14, style }: { width: number | string; height?: number; style?: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  return (
    <Animated.View
      style={[{
        height, borderRadius: 7, backgroundColor: '#E8F0F5',
        width: typeof width === 'string' ? width : width,
        opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
      }, style]}
    />
  );
}

function AIDoctorCard({ consultation, loading, error, onRetry, expanded, onToggle }: {
  consultation: DoctorConsultation | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();

  useEffect(() => {
    if (consultation || error) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [consultation, error, fadeAnim]);

  const severityConfig = {
    good:             { color: colors.success, bg: '#E5F8F1', icon: 'check-decagram', label: '👍' },
    attention_needed: { color: '#F59E0B',      bg: '#FFF7E6', icon: 'alert-circle',   label: '⚠️' },
    concerning:       { color: colors.danger,  bg: '#FEF2F2', icon: 'alert-octagon',  label: '🚨' },
  };

  const insightSeverityIcon = {
    stable: { icon: 'check-circle-outline', color: colors.success },
    watch:  { icon: 'eye-outline',          color: '#F59E0B' },
    alert:  { icon: 'alert-circle-outline', color: colors.danger },
  };

  // ── Loading State ──
  if (loading) {
    return (
      <View style={styles.aiCard}>
        <View style={styles.aiCardSeverityStrip} />
        <View style={styles.aiCardInner}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiDoctorAvatar}>
              <Icon name="stethoscope" size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <ShimmerLine width={120} height={11} />
              <ShimmerLine width={180} height={16} style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={{ gap: 10, marginTop: 16 }}>
            <ShimmerLine width="100%" height={14} />
            <ShimmerLine width="85%" height={14} />
            <ShimmerLine width="70%" height={14} />
          </View>
          <View style={styles.aiLoadingFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.aiLoadingText}>🩺 Doctor sahab soch rahe hain...</Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <Animated.View style={[styles.aiCard, { opacity: fadeAnim }]}>
        <View style={[styles.aiCardSeverityStrip, { backgroundColor: colors.textMuted }]} />
        <View style={styles.aiCardInner}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiDoctorAvatar}>
              <Icon name="stethoscope" size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiCardLabel}>AI Doctor</Text>
              <Text style={styles.aiErrorText}>Could not connect to AI Doctor</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.aiRetryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.aiRetryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (!consultation) return null;

  const sev = severityConfig[consultation.overall_status] || severityConfig.good;

  return (
    <Animated.View style={[styles.aiCard, { opacity: fadeAnim }]}>
      {/* Severity strip */}
      <View style={[styles.aiCardSeverityStrip, { backgroundColor: sev.color }]} />

      <View style={styles.aiCardInner}>
        {/* Header */}
        <View style={styles.aiCardHeader}>
          <View style={styles.aiDoctorAvatar}>
            <Icon name="stethoscope" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.aiCardLabelRow}>
              <Text style={styles.aiCardLabel}>AI Doctor</Text>
              <View style={[styles.aiStatusBadge, { backgroundColor: sev.bg }]}>
                <Text style={[styles.aiStatusText, { color: sev.color }]}>
                  {sev.label} {consultation.overall_status === 'good' ? 'Good' : consultation.overall_status === 'attention_needed' ? 'Attention' : 'Alert'}
                </Text>
              </View>
            </View>
            <Text style={styles.aiGreeting}>{consultation.greeting}</Text>
          </View>
        </View>

        {/* Health Summary */}
        <View style={styles.aiSummaryBox}>
          <Icon name="heart-pulse" size={16} color={colors.primary} />
          <Text style={styles.aiSummaryText}>{consultation.health_summary}</Text>
        </View>

        {/* Medicine Alert */}
        {consultation.medicine_alert && (
          <View style={styles.aiAlertBox}>
            <Icon name="pill" size={16} color={colors.danger} />
            <Text style={styles.aiAlertText}>{consultation.medicine_alert}</Text>
          </View>
        )}

        {/* Expandable section */}
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.aiExpandBtn}>
          <Text style={styles.aiExpandText}>
            {expanded ? 'Show less' : 'View full consultation'}
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.aiExpandedContent}>
            {/* Condition Insights */}
            {consultation.condition_insights?.length > 0 && (
              <View style={styles.aiInsightsSection}>
                <Text style={styles.aiInsightsTitle}>🔍 Condition Insights</Text>
                {consultation.condition_insights.map((ci, idx) => {
                  const iSev = insightSeverityIcon[ci.severity] || insightSeverityIcon.stable;
                  return (
                    <View key={idx} style={styles.aiInsightRow}>
                      <Icon name={iSev.icon} size={16} color={iSev.color} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiInsightCondition}>{ci.condition}</Text>
                        <Text style={styles.aiInsightText}>{ci.insight}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Report Highlight */}
            {consultation.report_highlight && (
              <View style={styles.aiReportBox}>
                <Icon name="file-chart-outline" size={16} color={colors.info} />
                <Text style={styles.aiReportText}>{consultation.report_highlight}</Text>
              </View>
            )}

            {/* Top Advice */}
            <View style={styles.aiAdviceBox}>
              <Icon name="lightbulb-on-outline" size={16} color="#F59E0B" />
              <Text style={styles.aiAdviceText}>{consultation.top_advice}</Text>
            </View>

            {/* Follow-up */}
            <View style={styles.aiFollowUpBox}>
              <Icon name="calendar-clock" size={15} color={colors.primary} />
              <Text style={styles.aiFollowUpText}>{consultation.follow_up}</Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main HomeScreen ─────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const [activeDoses, setActiveDoses] = useState<any[]>([]);
  const [skippedDoses, setSkippedDoses] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, taken: 0, skipped: 0 });
  const [nextDoseTime, setNextDoseTime] = useState('--:--');
  const [aiConsultation, setAiConsultation] = useState<DoctorConsultation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiUpdatedTime, setAiUpdatedTime] = useState<string | null>(null);
  const [streakScore, setStreakScore] = useState(100);
  const [adherenceTrend, setAdherenceTrend] = useState<string[]>([]);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const introAnim = useRef(new Animated.Value(0)).current;
  const greeting = getGreeting(t);
  const aiCalledRef = useRef(false);

  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 680,
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const loadReminders = useCallback(() => {
    if (!patient?.id) return;
    const meds = getMedicines(patient.id);
    const logs = getTodayLogs(patient.id);
    const now = dayjs();

    let total = 0, taken = 0, skipped = 0;
    let active: any[] = [];
    let skippedList: any[] = [];
    let nextDose: dayjs.Dayjs | null = null;
    let nextDoseLabel = '--:--';

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
            if (!nextDose) {
              nextDose = scheduled;
              nextDoseLabel = tStr;
            }
          } else if (now.isAfter(windowEnd)) {
            // 3-hour window expired! Auto-log as missed (skipped) to DB
            logReminderAction(med.id, tStr, 'skipped');
            skipped++;
            skippedList.push({ ...med, scheduled_time: tStr });
          } else if (scheduled.isAfter(now) && (!nextDose || scheduled.isBefore(nextDose))) {
            nextDose = scheduled;
            nextDoseLabel = tStr;
          }
        }
      });
    });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveDoses(active);
    setSkippedDoses(skippedList);
    setTodayStats({ total, taken, skipped });
    setNextDoseTime(nextDoseLabel);

    const history = getAdherenceHistory(patient.id);
    setStreakScore(history.healthScore);
    setAdherenceTrend(history.trend);
    setIsLoaded(true);
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

  // ── AI Doctor Consultation ──
  const fetchAIConsultation = useCallback(async (force = false) => {
    if (!patient?.id) return;
    
    // Check if it's a new day (force update on first open per day)
    const todayStr = dayjs().format('YYYY-MM-DD');
    const cachedDateStr = doctorCache.getString(`consultation_date_${patient.id}`);
    if (cachedDateStr !== todayStr) {
      force = true;
    }

    // Check cache first
    if (!force) {
      try {
        const cachedStr = doctorCache.getString(`consultation_${patient.id}`);
        const cachedTime = doctorCache.getNumber(`consultation_time_${patient.id}`);
        if (cachedStr && cachedTime && (Date.now() - cachedTime < CACHE_DURATION_MS)) {
          setAiConsultation(JSON.parse(cachedStr));
          setAiUpdatedTime(dayjs(cachedTime).format('hh:mm A'));
          return;
        }
      } catch {}
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const meds = getMedicines(patient.id);
      const reports = getScanHistory(patient.id)
        .filter((r: any) => r.type === 'report' && r.is_saved === 1)
        .slice(0, 5)
        .map((r: any) => {
          try {
            const d = JSON.parse(r.result_json);
            return { type: d.report_type || 'unknown', verdict: d.simple_verdict || '', severity: d.severity || 'normal', date: r.created_at?.split('T')[0] || '' };
          } catch { return { type: 'unknown', verdict: '', severity: 'normal', date: '' }; }
        });

      const result = await getDoctorConsultation({
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        conditions: Array.isArray(patient.conditions) ? patient.conditions : JSON.parse(patient.conditions as any || '[]'),
        medicines: meds.map((m: any) => ({ name: m.name, dose: `${m.dose_amount || ''} ${m.dose_unit || ''}`.trim(), timesPerDay: m.times_per_day || 1 })),
        adherenceStats: todayStats,
        skippedMedicines: skippedDoses.map((s: any) => ({ name: s.name, time: s.scheduled_time })),
        activeDoses: activeDoses.length,
        currentTime: dayjs().format('HH:mm'),
        nextDoseTime: nextDoseTime,
        adherenceTrend: adherenceTrend,
        healthScore: streakScore,
        recentReports: reports,
        allergies: patient.allergies || 'none',
        language: language,
        nativeLanguageName: NATIVE_LANG_NAMES[language] || 'English',
      });

      setAiConsultation(result);
      const now = Date.now();
      setAiUpdatedTime(dayjs(now).format('hh:mm A'));
      
      // Cache it
      doctorCache.set(`consultation_${patient.id}`, JSON.stringify(result));
      doctorCache.set(`consultation_time_${patient.id}`, now);
      doctorCache.set(`consultation_date_${patient.id}`, todayStr);
    } catch (err: any) {
      console.error('AI Doctor Error:', err.message);
      setAiError(err.message || 'Failed to get consultation');
    } finally {
      setAiLoading(false);
    }
  }, [patient, todayStats, skippedDoses, activeDoses, nextDoseTime, adherenceTrend, streakScore, language]);

  // Fetch AI consultation once after reminders are loaded
  useEffect(() => {
    if (patient?.id && isLoaded && !aiCalledRef.current) {
      aiCalledRef.current = true;
      fetchAIConsultation();
    }
  }, [patient?.id, isLoaded, fetchAIConsultation]);

  const progress = todayStats.total > 0 ? todayStats.taken / todayStats.total : 0;
  const healthScore = todayStats.total > 0 ? Math.max(60, Math.round(progress * 100)) : 92;
  const heroTranslate = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [0, -26],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  const introStyle = {
    opacity: introAnim,
    transform: [{
      translateY: introAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
      }),
    }],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}>

        {/* ── Header ── */}
        <LinearGradient
          colors={['#D9F8F1', colors.background, '#F1F0FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroWrap}
        >
          <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }]}>
            <View style={styles.brandBar}>
              <View style={styles.brandLeft}>
                <Icon name="leaf" size={34} color={colors.primary} />
                <Text style={styles.brandName}>MediSaaN</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Score Badge */}
                <View style={{ position: 'relative', zIndex: 9999 }}>
                  <TouchableOpacity 
                    style={styles.scoreBadge} 
                    onPress={() => navigation.navigate('StreakHistory')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.scoreIcon}>🔥</Text>
                    <Text style={styles.scoreText}>{streakScore}</Text>
                  </TouchableOpacity>
                
                </View>

                <TouchableOpacity style={styles.langButton} onPress={() => navigation.navigate('Language')} activeOpacity={0.8}>
                  <Icon name="translate" size={23} color={colors.ink} />
                </TouchableOpacity>
              </View>
            </View>

          </Animated.View>

          <Animated.View style={[styles.welcomeBlock, { marginHorizontal:20},introStyle]}>
            <View style={styles.welcomeCopy}>
              <Text style={styles.welcomeSmall}>Welcome back</Text>
              <Text style={styles.welcomeName}>
                {greeting.text},{'\n'}{patient?.name || 'Dost'}!
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
              <View style={styles.scenicAvatar}>
                <LinearGradient
                  colors={greeting.colors}
                  style={styles.scenicArt}
                >
                  <Icon name={greeting.icon} size={28} color="#FFF9D6" />
                  <View style={styles.scenicLineOne} />
                  <View style={styles.scenicLineTwo} />
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {activeDoses.length > 0 ? (
            <Animated.View style={[{ width: '100%', right: 10, left:10, paddingBottom: 10 }, introStyle]}>
              <View style={[styles.sectionRow, { marginHorizontal: 20, marginBottom: 12, marginTop: 4 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock-alert-outline" size={20} color={colors.danger} />
                  <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18, color: colors.ink }]}>{t('due_now')}</Text>
                </View>
                {activeDoses.length > 1 && (
                  <Text style={styles.swipeHint}>{t('swipe_hint')}</Text>
                )}
              </View>
              <FlatList
                horizontal
                data={activeDoses}
                keyExtractor={item => `${item.id}-${item.scheduled_time}`}
                renderItem={({ item }) => <ActiveDoseCard item={item} onAction={handleAction} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 16, marginBottom: 20 }}
                snapToInterval={CAROUSEL_CARD_WIDTH + 16}
                decelerationRate="fast"
              />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.todayHeroCard , { marginHorizontal:20}, introStyle]}>
              <View style={styles.todayHeroTop}>
                <Text style={styles.todayHeroTitle}>Today's Medicine</Text>
                <Icon name="pill" size={62} color="rgba(21,94,117,0.2)" />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressTaken}>{todayStats.taken} of {todayStats.total} Taken</Text>
              </View>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <View style={styles.heroMiniGrid}>
                <View style={styles.heroMiniCard}>
                  <Text style={styles.heroMiniLabel}>Next Dose</Text>
                  <Text style={styles.heroMiniValue}>{nextDoseTime}</Text>
                </View>
                <View style={[styles.heroMiniCard, styles.heroScoreCard]}>
                  <Text style={styles.heroMiniLabel}>Health Score</Text>
                  <Text style={[styles.heroMiniValue, styles.heroScoreValue]}>{healthScore}%</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </LinearGradient>

        {/* ── AI Doctor Consultation ── */}
        <Animated.View style={[styles.section, introStyle]}>
          <View style={[styles.sectionRow, { alignItems: 'flex-end' }]}>
            <View>
              <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>🩺 AI Doctor</Text>
              {aiUpdatedTime && !aiLoading && (
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>
                  Updated at {aiUpdatedTime}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => fetchAIConsultation(true)} activeOpacity={0.7} style={{ padding: 4 }}>
              <Icon name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <AIDoctorCard
            consultation={aiConsultation}
            loading={aiLoading}
            error={aiError}
            onRetry={() => fetchAIConsultation(true)}
            expanded={aiExpanded}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAiExpanded(!aiExpanded);
            }}
          />
        </Animated.View>


        {/* ── AI Tools ── */}
        <Animated.View style={[styles.section, introStyle]}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('essential_tools')}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>⚡ AI Powered</Text>
            </View>
          </View>

          <View style={styles.toolsGrid}>
            {[
              { screen: 'Medicines', icon: 'calendar-heart', labelKey: 'tool_my_medicines', color: '#F7FCFB', border: '#D5ECE8', ghost: 'alarm' },
              { screen: 'QuickScan', icon: 'line-scan', labelKey: 'tool_scan_medicine', color: '#F8FAFF', border: '#D9E4FF', ghost: 'qrcode-scan' },
              { screen: 'ReportScan', icon: 'file-search-outline', labelKey: 'tool_report_analyze', color: '#FBFAFF', border: '#E4D9FF', ghost: 'chart-bar' },
              { screen: 'Chat', icon: 'chat-outline', labelKey: 'tool_chat_bot', color: '#F7FCFB', border: '#D5ECE8', ghost: 'robot-outline' },
            ].map((tool, i) => (
              <Animated.View
                key={i}
                style={[introStyle, {
                  transform: [{
                    translateY: introAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28 + i * 8, 0],
                    }),
                  }],
                }]}
              >
                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: tool.color, borderColor: tool.border }]}
                  onPress={() => navigation.navigate(tool.screen)}
                  activeOpacity={0.85}>
                  <View style={styles.toolIconWrap}>
                    <Icon name={tool.icon} size={26} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.toolLabel}>{t(tool.labelKey)}</Text>
                  <Icon name={tool.ghost} size={86} color="rgba(16,32,51,0.08)" style={styles.toolGhost} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.voiceHintCard, introStyle]}>
          <Icon name="lightbulb-on-outline" size={19} color="#fff" />
          <Text style={styles.voiceHintText}>Try saying "Hey Saathi, read my report"</Text>
        </Animated.View>

        {/* ── Add Medicine CTA ── */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <TouchableOpacity
            style={styles.addMedBtn}
            onPress={() => navigation.navigate('AddMedicine')}
            activeOpacity={0.85}>
            <Icon name="plus-circle-outline" size={20} color="#fff" />
            <Text style={styles.addMedBtnText}>{t('add_new_med')}</Text>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>
    </SafeAreaView >
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  // Header
  heroWrap: {
    minHeight: 430,
    paddingBottom: 34,
    marginBottom: 24,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  brandBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 34,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandName: { fontSize: 30, fontWeight: '900', color: colors.primaryDark },
  langButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  
  // Score Badge
  scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A', elevation: 4, shadowColor: '#F59E0B', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  scoreIcon: { fontSize: 16, marginRight: 4 },
  scoreText: { fontSize: 15, fontWeight: '800', color: '#B45309' },
  scoreTooltip: { position: 'absolute', top: 50, right: 0, width: 220, backgroundColor: colors.surface, padding: 14, borderRadius: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, zIndex: 100 },
  scoreTooltipTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  scoreTooltipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, lineHeight: 18 },
  tooltipBtn: { marginTop: 10, backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  tooltipBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  welcomeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  welcomeCopy: { flex: 1, paddingRight: 16 },
  welcomeSmall: { fontSize: 23, lineHeight: 30, color: colors.primary, fontWeight: '700', marginBottom: 14 },
  welcomeName: { fontSize: 48, lineHeight: 58, color: '#111318', fontWeight: '900' },
  scenicAvatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    padding: 4,
    backgroundColor: '#fff',
    elevation: 12,
    shadowColor: '#D2A63B',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  scenicArt: {
    flex: 1,
    borderRadius: 43,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scenicLineOne: {
    position: 'absolute',
    bottom: 22,
    width: 92,
    height: 34,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-14deg' }],
  },
  scenicLineTwo: {
    position: 'absolute',
    bottom: 4,
    width: 98,
    height: 38,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    backgroundColor: 'rgba(52,211,153,0.22)',
    transform: [{ rotate: '12deg' }],
  },
  todayHeroCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 34,
    padding: 24,
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 14,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
  },
  todayHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayHeroTitle: { fontSize: 27, lineHeight: 34, fontWeight: '900', color: '#111318' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 12 },
  progressText: { fontSize: 16, color: '#111318', fontWeight: '500' },
  progressTaken: { fontSize: 16, color: colors.primary, fontWeight: '900' },
  heroProgressTrack: {
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(16,32,51,0.12)',
    overflow: 'hidden',
    marginBottom: 26,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 9,
    backgroundColor: colors.primary,
  },
  heroMiniGrid: { flexDirection: 'row', gap: 14 },
  heroMiniCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'center',
    backgroundColor: 'rgba(236,248,245,0.72)',
    borderWidth: 1,
    borderColor: '#CDE7E2',
  },
  heroScoreCard: {
    backgroundColor: 'rgba(239,243,255,0.78)',
    borderColor: '#D2DCF8',
  },
  heroMiniLabel: { fontSize: 16, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  heroMiniValue: { fontSize: 22, color: colors.primary, fontWeight: '900' },
  heroScoreValue: { color: '#0F5CCB' },

  // Section layout
  section: { paddingHorizontal: 24, marginBottom: 26 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  swipeHint: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // AI Doctor Card
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    flexDirection: 'row',
  },
  aiCardSeverityStrip: {
    width: 5,
    backgroundColor: colors.success,
  },
  aiCardInner: {
    flex: 1,
    padding: 18,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aiDoctorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
  },
  aiCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  aiCardLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  aiStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  aiStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  aiGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  aiSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 14,
  },
  aiSummaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryDark,
    lineHeight: 20,
  },
  aiAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger + '20',
  },
  aiAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 20,
  },
  aiExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  aiExpandText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  aiExpandedContent: {
    marginTop: 4,
    gap: 12,
  },
  aiInsightsSection: {
    gap: 8,
  },
  aiInsightsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 2,
  },
  aiInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
  },
  aiInsightCondition: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 2,
  },
  aiInsightText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  aiReportBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 14,
  },
  aiReportText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.info,
    lineHeight: 18,
  },
  aiAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 14,
  },
  aiAdviceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 18,
  },
  aiFollowUpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  aiFollowUpText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 18,
  },
  aiLoadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  aiLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  aiErrorText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiRetryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Patient Health Card
  healthCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    elevation: 4, shadowColor: colors.cardShadow, shadowOpacity: 0.08,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
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
  healthName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  healthMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  editTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  editTagText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  conditionChip: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  conditionChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  doctorRowText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  // Active Dose Carousel
  carouselContainer: { paddingRight: 24, gap: 16 },
  activeCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xxl, padding: 18,
    elevation: 8,
    shadowColor: colors.cardShadow, shadowOpacity: 0.12,
    shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    borderWidth: 1, borderColor: colors.border,
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  activeTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  activeTimeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  duePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dangerLight, paddingHorizontal: 9, paddingVertical: 5, borderRadius: borderRadius.full },
  dueTag: { color: colors.danger, fontSize: 10, fontWeight: '900' },
  activeMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  activeIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  activeMedName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  activeMedDose: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  howToTakeTag: { marginTop: 6 },
  howToTakeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  activeActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, height: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 7 },
  actionBtnOutline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // All Done Card
  allDoneCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xxl, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  allDoneTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 10 },
  allDoneSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Today Summary Card
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 18,
    borderWidth: 1, borderColor: colors.border,
    elevation: 4,
    shadowColor: colors.cardShadow, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  summaryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  summaryCardTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  summaryDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
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
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  viewAllBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // AI Tools Grid
  aiBadge: {
    backgroundColor: colors.primary + '15', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  toolCard: {
    width: (SCREEN_WIDTH - 48 - 20) / 2,
    height: 178,
    borderRadius: 34,
    padding: 24,
    borderWidth: 1,
    elevation: 6,
    overflow: 'hidden',
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  toolIconWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.78)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  toolLabel: { fontSize: 21, fontWeight: '800', color: '#111318', lineHeight: 27 },
  toolGhost: { position: 'absolute', right: -10, bottom: -10 },
  voiceHintCard: {
    marginHorizontal: 34,
    marginTop: -2,
    marginBottom: 24,
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: '#2E3237',
    paddingHorizontal: 22,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#16191D',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  voiceHintText: { flex: 1, fontSize: 16, lineHeight: 22, color: '#fff', fontWeight: '600' },

  // Add Medicine CTA
  addMedBtn: {
    backgroundColor: colors.primaryDark, borderRadius: borderRadius.lg,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    elevation: 4,
    shadowColor: colors.primary, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  addMedBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
