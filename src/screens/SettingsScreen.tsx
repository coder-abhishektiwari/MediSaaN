import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { usePatientStore } from '../store/patientStore';
import { useSettingsStore } from '../store/settingsStore';
import { useLanguageStore, LANGUAGES } from '../store/languageStore';
import { getMedicines } from '../db/queries/medicines';
import { getScanHistory } from '../db/queries/reports';
import { colors, typography, spacing, borderRadius } from '../theme';

function Row({ icon, label, value, onPress, right }: any) {
  return (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={row.iconBox}>
        <Icon name={icon} size={21} color={colors.primaryDark} />
      </View>
      <View style={row.middle}>
        <Text style={row.label}>{label}</Text>
        {value ? <Text style={row.value}>{value}</Text> : null}
      </View>
      {right || (onPress ? <Text style={row.chevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  iconBox: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLight },
  middle: { flex: 1 },
  label: { ...typography.bodyMedium, color: colors.textPrimary },
  value: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chevron: { ...typography.headingMedium, color: colors.textMuted },
});

function Section({ title, children }: any) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      <View style={sec.card}>{children}</View>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  title: { ...typography.labelMedium, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', elevation: 3, shadowColor: colors.cardShadow, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
});

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: spacing.xl + 38 + spacing.md }} />;
}

export default function SettingsScreen({ navigation }: any) {
  const { patient, clearPatient } = usePatientStore();
  const { highContrast, shortcutsEnabled, caregiverAlertsEnabled, fontScale, setHighContrast, setShortcutsEnabled, setCaregiverAlerts, setFontScale } = useSettingsStore();
  const { language } = useLanguageStore();
  const [showShortcutGuide, setShowShortcutGuide] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === language);
  const { t } = useTranslation();

  const isFocused = useIsFocused();
  const [counts, setCounts] = useState({ active: 0, scannedMeds: 0, reports: 0 });

  React.useEffect(() => {
    if (isFocused && patient?.id) {
      const active = getMedicines(patient.id).length;
      const history = getScanHistory(patient.id);
      const scannedMeds = history.filter((h: any) => h.type === 'medicine').length;
      const reports = history.filter((h: any) => h.type === 'report').length;
      setCounts({ active, scannedMeds, reports });
    }
  }, [isFocused, patient?.id]);

  const handleClearData = () => {
    Alert.alert('Clear All Data', 'This will delete all your medicines, reports, and profile. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Everything', style: 'destructive', onPress: () => {
        clearPatient();
        navigation.replace('Language');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header with patient card */}
      <View style={styles.headerCard}>
        <View style={styles.headerBgCircle1} />
        <View style={styles.headerBgCircle2} />
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{(patient?.name || 'U')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient?.name || 'No Name'}</Text>
          <Text style={styles.patientDetails}>
            {patient?.age ? `${patient.age} yrs · ` : ''}{patient?.gender || ''}{patient?.city ? ` · ${patient.city}` : ''}
          </Text>
          {(patient?.conditions || []).length > 0 && (
            <Text style={styles.conditions} numberOfLines={1}>{patient?.conditions.join(', ')}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSetup')}>
          <Icon name="pencil-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Section title={t('my_health', { defaultValue: 'My Health' })}>
          <Row icon="pill" label={t('my_medicines', { defaultValue: 'My Medicines' })} value={`${counts.active} ${t('active', { defaultValue: 'active' })}`} onPress={() => navigation.navigate('Medicines')} />
          <Divider />
          <Row icon="history" label={t('med_scan_history', { defaultValue: 'Medicine Scan History' })} value={`${counts.scannedMeds} ${t('scans', { defaultValue: 'scans' })}`} onPress={() => navigation.navigate('ScanHistory', { type: 'medicine' })} />
          <Divider />
          <Row icon="file-document-outline" label={t('report_history', { defaultValue: 'Report History' })} value={`${counts.reports} ${t('reports', { defaultValue: 'reports' })}`} onPress={() => navigation.navigate('ScanHistory', { type: 'report' })} />
          <Divider />
          <Row icon="message-text-outline" label={t('health_chat', { defaultValue: 'Health Chat' })} value={t('ask_the_bot', { defaultValue: 'Ask the bot' })} onPress={() => navigation.navigate('Chat')} />
        </Section>

        <Section title={t('app_settings', { defaultValue: 'App Settings' })}>
          <Row icon="translate" label={t('language', { defaultValue: 'Language' })} value={`${currentLang?.native} (${currentLang?.roman})`} onPress={() => navigation.navigate('Language')} />
          <Divider />
          {/* <Row icon="format-size" label="Text Size" value={fontScale === 1 ? 'Normal' : fontScale === 1.2 ? 'Large' : 'Extra Large'}
            right={
              <View style={styles.fontButtons}>
                {[1, 1.2, 1.5].map((s, i) => (
                  <TouchableOpacity key={s} style={[styles.fontBtn, fontScale === s && styles.fontBtnActive]} onPress={() => setFontScale(s)}>
                    <Text style={[styles.fontBtnText, fontScale === s && styles.fontBtnTextActive]}>{['A', 'A', 'A'][i]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          <Divider />
          <Row icon="contrast-circle" label="High Contrast" right={<Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ true: colors.primary }} />} />
          <Divider /> */}
          <Row icon="cellphone-cog" label={t('manage_permissions', 'App Permissions')} value={t('manage_permissions_sub', 'Manage system-level permissions')} onPress={() => navigation.navigate('Permission', { fromSettings: true })} />
        </Section>

        <Section title={t('shortcuts_accessibility', { defaultValue: 'Shortcuts & Accessibility' })}>
          <Row icon="keyboard-outline" label={t('vol_shortcuts', { defaultValue: 'Volume Key Shortcuts' })} value={t('vol_shortcuts_desc', { defaultValue: 'Vol↑↓ = Scan · Vol↑ 3s = Report' })}
            right={<Switch value={shortcutsEnabled} onValueChange={setShortcutsEnabled} trackColor={{ true: colors.primary }} />}
          />
          <Divider />
          <Row icon="book-open-variant" label={t('how_to_use_shortcuts', { defaultValue: 'How to Use Shortcuts' })} onPress={() => setShowShortcutGuide(v => !v)} />
          {showShortcutGuide && (
            <View style={styles.guideBox}>
              <View style={styles.guideRow}>
                <Icon name="cellphone" size={24} color={colors.primaryDark} style={styles.guideIcon} />
                <View>
                  <Text style={styles.guideTitle}>Medicine Scan</Text>
                  <Text style={styles.guideSub}>Press Volume Up + Volume Down together (within 1 second)</Text>
                </View>
              </View>
              <View style={styles.guideRow}>
                <Icon name="file-document-outline" size={24} color={colors.primaryDark} style={styles.guideIcon} />
                <View>
                  <Text style={styles.guideTitle}>Report Scan</Text>
                  <Text style={styles.guideSub}>Hold Volume Up button for 3 seconds</Text>
                </View>
              </View>
              <Text style={styles.guideNote}>App must be open for shortcuts to work</Text>
            </View>
          )}
          {/* <Divider />
          <Row icon="bell-alert-outline" label="Caregiver Alerts" value="Alert family if medicine skipped 3x"
            right={<Switch value={caregiverAlertsEnabled} onValueChange={setCaregiverAlerts} trackColor={{ true: colors.primary }} />}
          /> */}
        </Section>

        <Section title={t('privacy_data', { defaultValue: 'Privacy & Data' })}>
          <Row icon="lock-check-outline" label={t('data_storage', { defaultValue: 'Data Storage' })} value={t('data_storage_desc', { defaultValue: 'All data is on your device only' })} />
          <Divider />
          <Row icon="trash-can-outline" label={t('clear_data', { defaultValue: 'Clear All Data' })} onPress={handleClearData}
            right={<Text style={styles.dangerText}>{t('clear', { defaultValue: 'Clear' })}</Text>}
          />
        </Section>

        <Section title={t('about', { defaultValue: 'About' })}>
          <Row icon="information-outline" label={t('medisaan', { defaultValue: 'MediSaaN' })} value={t('version', { defaultValue: 'Version 1.0.0' })} />
          <Divider />
          <Row icon="heart-pulse" label={t('made_for_india', { defaultValue: 'Made for India' })} value={t('free_no_ads', { defaultValue: 'Free for everyone · No ads ever' })} />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.primaryDark, padding: spacing.xl,
    borderRadius: borderRadius.xxl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    elevation: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
  },
  headerBgCircle1: { position: 'absolute', top: -40, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerBgCircle2: { position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  avatarText: { ...typography.displayMedium, color: '#fff' },
  patientInfo: { flex: 1 },
  patientName: { ...typography.headingLarge, color: '#fff' },
  patientDetails: { ...typography.bodySmall, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  conditions: { ...typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  scroll: { paddingTop: spacing.md, paddingBottom: 40 },
  fontButtons: { flexDirection: 'row', gap: 6 },
  fontBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  fontBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  fontBtnText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  fontBtnTextActive: { color: colors.primary },
  guideBox: { padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.primaryLight, borderTopWidth: 1, borderTopColor: colors.border },
  guideRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  guideIcon: { width: 32 },
  guideTitle: { ...typography.labelMedium, color: colors.primaryDark },
  guideSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  guideNote: { ...typography.caption, color: colors.warning, marginTop: spacing.sm },
  dangerText: { ...typography.labelMedium, color: colors.danger },
});
