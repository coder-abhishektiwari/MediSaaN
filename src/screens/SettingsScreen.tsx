import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, SafeAreaView, StatusBar, Alert, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { usePatientStore } from '../store/patientStore';
import { PermissionService } from '../services/PermissionService';
import { ApiKeyService } from '../services/ApiKeyService';
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
    Alert.alert(
      t('clear_data', { defaultValue: 'Clear All Data' }),
      t('clear_data_message', { defaultValue: 'This will delete all your medicines, reports, and profile. This cannot be undone.' }),
      [
        { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('clear_everything', { defaultValue: 'Clear Everything' }),
          style: 'destructive',
          onPress: () => {
            clearPatient();
            navigation.replace('Language');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header with patient card */}
        <View style={styles.headerCard}>
          <View style={styles.headerBgCircle1} />
          <View style={styles.headerBgCircle2} />

          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{(patient?.name || 'U')[0].toUpperCase()}</Text>
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient?.name || 'No Name'}</Text>

            {/* Dot separation ko modern horizontal chips se replace kiya */}
            <View style={styles.metadataContainer}>
              {patient?.age && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{patient.age} Yrs</Text>
                </View>
              )}
              {patient?.gender && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{patient.gender}</Text>
                </View>
              )}
              {patient?.city && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{patient.city}</Text>
                </View>
              )}
            </View>

            {(patient?.conditions || []).length > 0 && (
              <Text style={styles.conditions} numberOfLines={1}>
                {patient?.conditions.join(', ')}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSetup')}>
            <Icon name="pencil-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

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
          <Row icon="key-outline" label={t('ai_api_keys', { defaultValue: 'AI API Keys' })} value={t('api_keys_sub', { defaultValue: 'Set Gemini & Groq keys for chat' })} onPress={() => navigation.navigate('ApiSetup')} />
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
          
          {Platform.OS === 'android' && (
            <>
              <Row
                icon="access-point"
                label={t('accessibility_settings', { defaultValue: 'Shortcut to Scan Medicine' })}
                value={t('accessibility_settings_sub', { defaultValue: 'Shake Device to Open Medicine Scan Screen.' })}
              
              />
            </>
          )}
          {/* <Divider />
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
              <Text style={styles.guideNote}>{t('shortcut_accessibility_note', { defaultValue: 'App must be open for shortcuts, or use accessibility settings for background access.' })}</Text>
            </View>
          )} */}
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
  // Inhe styles object ke andar replace/add karo:
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.primaryDark, // Gradient apply hone tak fallback rahega
    padding: spacing.xl,
    paddingTop: spacing.xl + 4, // Top par thoda additional padding visual balance ke liye
    borderRadius: borderRadius.xxl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    position: 'relative', // Edit button aur background shapes ki handling ke liye
  },

  // Background abstract shapes ko aur clean aur transparent kiya
  headerBgCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  headerBgCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)'
  },

  // Avatar ko dynamic modern border diya
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  avatarText: {
    ...typography.displayMedium,
    color: '#fff',
    fontSize: 24, // Text size explicit karke sharp kiya
    fontWeight: '600'
  },

  patientInfo: {
    flex: 1,
    paddingRight: 20, // Edit button se overlap na ho isliye thoda right space
  },
  patientName: {
    ...typography.headingLarge,
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3
  },

  // Metadata tags/chips ka container layout
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  metaChipText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },

  conditions: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: spacing.xs,
    fontStyle: 'italic'
  },

  // Edit button ko top-right corner par sleek placement di
  editBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
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
