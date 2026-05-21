import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, SafeAreaView, StatusBar, Modal, Alert, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, borderRadius } from '../theme';
import dayjs from 'dayjs';
import { TTSService } from '../services/TTSService';
import { markScanAsSaved } from '../db/queries/reports';
import { usePatientStore } from '../store/patientStore';
import { addMedicine, getMedicines, deleteMedicineByName } from '../db/queries/medicines';
import { useTranslation } from 'react-i18next';
import { TranslatedText } from '../components/TranslatedText';
import { useTranslateAIResponse } from '../hooks/useTranslateAIResponse';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['uses', 'dosage', 'side_effects', 'warnings', 'interactions'];
const TAB_ICONS = ['💡', '💉', '⚠️', '🛡', '🔗'];

const HOW_TO_LABEL = (val: string, t: any) => {
  if (val === 'before_food') return { emoji: '🍽', label: t('before_food', { defaultValue: 'Before Food' }) };
  if (val === 'after_food') return { emoji: '🍽', label: t('after_food', { defaultValue: 'After Food' }) };
  if (val === 'with_food') return { emoji: '🍽', label: t('with_food', { defaultValue: 'With Food' }) };
  return { emoji: '🕒', label: t('anytime', { defaultValue: 'Anytime' }) };
};

const SEVERITY_CONFIG = {
  urgent: {
    color: '#C0392B',
    bg: '#FDECEA',
    border: 'rgba(192,57,43,0.2)',
    icon: '🚨',
    iconBg: 'rgba(192,57,43,0.1)',
  },
  needs_attention: {
    color: '#C07A00',
    bg: '#FFF7E0',
    border: 'rgba(192,122,0,0.2)',
    icon: '⚠️',
    iconBg: 'rgba(192,122,0,0.1)',
  },
  normal: {
    color: '#1B8A5A',
    bg: '#E6F7EF',
    border: 'rgba(27,138,90,0.2)',
    icon: '✅',
    iconBg: 'rgba(27,138,90,0.1)',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ParameterRow = ({ param, isLast }: { param: any; isLast: boolean }) => {
  const isNormal = param.status === 'normal';
  const valColor = isNormal ? '#1B8A5A' : '#C0392B';
  const pillBg = isNormal ? '#E6F7EF' : '#FDECEA';
  const pillText = isNormal ? '#1B8A5A' : '#C0392B';
  const label = param.status?.toUpperCase() ?? '';

  return (
    <View style={[S.paramRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 2 }}>
        <TranslatedText style={S.paramName}>{param.name}</TranslatedText>
        <TranslatedText style={S.paramMeaning}>{param.meaning}</TranslatedText>
      </View>
      <View style={{ flex: 1.4, alignItems: 'center' }}>
        <Text style={[S.paramValue, { color: valColor }]}>
          {param.value} {param.unit}
        </Text>
        <Text style={S.paramRange}>Ref: {param.normal_range}</Text>
      </View>
      <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
        <View style={[S.statusPill, { backgroundColor: pillBg }]}>
          <Text style={[S.statusPillText, { color: pillText }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

const InfoRow = ({ icon, title, content, isLast }: any) => {
  if (!content) return null;
  return (
    <View style={[S.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={S.infoRowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={S.infoRowTitle}>{title}</Text>
        <TranslatedText style={S.infoRowText}>{content}</TranslatedText>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryDetailScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { item } = route.params;
  const { patient } = usePatientStore();

  const [isSaved, setIsSaved] = useState(item.is_saved === 1);
  const [activeTab, setActiveTab] = useState(0);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [isAlreadyInSchedule, setIsAlreadyInSchedule] = useState(false);

  let data: any = {};
  try { data = JSON.parse(item.result_json); } catch { }

  const isMedicine = item.type === 'medicine';
  const translatedDesc = useTranslateAIResponse(
    isMedicine ? data.simple_description || '' : data.simple_verdict || ''
  );

  React.useEffect(() => {
    if (isMedicine && patient?.id && data.medicine_name) {
      const meds = getMedicines(patient.id);
      setIsAlreadyInSchedule(
        meds.some((m: any) => m.name.toLowerCase() === data.medicine_name.toLowerCase())
      );
    }
  }, [isMedicine, patient?.id, data.medicine_name]);

  const date = dayjs(item.created_at).format('DD MMM YYYY, hh:mm A');
  const sevCfg = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.normal;
  const howTo = data.how_to_take ? HOW_TO_LABEL(data.how_to_take, t) : null;

  const toggleSaveReport = () => {
    const next = !isSaved;
    markScanAsSaved(item.id, next);
    setIsSaved(next);
  };

  const handleAddMedicine = () => {
    if (!patient?.id) return;
    addMedicine({
      patient_id: patient.id,
      name: data.medicine_name,
      generic_name: data.generic_name,
      image_path: item.image_path,
      dose_amount: 1,
      dose_unit: data.medicine_form || 'tablet',
      times_per_day: 1,
      dose_times: ['08:00'],
      days_type: 'daily',
      custom_days: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      stock_quantity: 0,
      notes: data.simple_description,
      scan_cache_json: JSON.stringify(data),
    });
    setIsAlreadyInSchedule(true);
    Alert.alert(
      `✅ ${t('added', { defaultValue: 'Added' })}`,
      `${data.medicine_name} ${t('added_to_meds', { defaultValue: 'has been added to your medicine list.' })}`
    );
  };

  const handleRemoveMedicine = () => {
    if (!patient?.id) return;
    deleteMedicineByName(patient.id, data.medicine_name);
    setIsAlreadyInSchedule(false);
    Alert.alert(
      `✅ ${t('removed', { defaultValue: 'Removed' })}`,
      `${data.medicine_name} ${t('removed_from_meds', { defaultValue: 'has been removed from your medicine list.' })}`
    );
  };

  // Tab body content
  const tabContent = [
    data.uses,
    data.dosage_instructions,
    data.side_effects,
    data.warnings,
    data.drug_interactions,
  ];

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="chevron-left" size={20} color={colors.primary} />
          <Text style={S.backText}>{t('back', { defaultValue: 'Back' })}</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle} numberOfLines={1}>
          {isMedicine ? data.medicine_name : t('report_analysis', { defaultValue: 'Report Analysis' })}
        </Text>
        <TouchableOpacity
          onPress={() => TTSService.speak(translatedDesc)}
          style={S.ttsBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="volume-high" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Image ── */}
        <TouchableOpacity style={S.imageBox} activeOpacity={0.9} onPress={() => setIsZoomVisible(true)}>
          <Image source={{ uri: item.image_path }} style={S.image} resizeMode="cover" />
          <View style={S.imageOverlay} />
          <View style={S.dateChip}>
            <Icon name="clock-outline" size={10} color="#fff" />
            <Text style={S.dateText}>{date}</Text>
          </View>
          <View style={S.zoomTip}>
            <Icon name="magnify" size={11} color="#fff" />
            <Text style={S.zoomTipText}>{t('tap_to_zoom', { defaultValue: 'Tap to Zoom' })}</Text>
          </View>
        </TouchableOpacity>

        {/* ────────── MEDICINE VIEW ────────── */}
        {isMedicine ? (
          <View style={S.content}>

            {/* Medicine Identity Card */}
            <View style={S.medCard}>
              {/* <View style={S.medIconWrap}>
                <Text style={{ fontSize: 28 }}>💊</Text>
              </View> */}
              <View style={{ flex: 1 }}>
                <View style={S.medTitle}>
                  <Text style={S.medName}>{data.medicine_name}</Text>
                  {howTo ? (
                    <View style={S.howBadge}>
                      <Text style={S.howEmoji}>{howTo.emoji}</Text>
                      <Text style={S.howLabel}>{howTo.label}</Text>
                    </View>
                  ) : null}
                </View>
                {data.generic_name ? (
                  <Text style={S.medGeneric}>{data.generic_name}</Text>
                ) : null}
              </View>

            </View>

            {/* Tab Bar + Content */}
            <View style={S.tabCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabBar}>
                {TABS.map((tab, i) => (
                  <TouchableOpacity
                    key={tab}
                    style={[S.tab, activeTab === i && S.tabActive]}
                    onPress={() => setActiveTab(i)}
                  >
                    <Text style={[S.tabText, activeTab === i && S.tabTextActive]}>
                      {TAB_ICONS[i]} {t(tab, { defaultValue: tab.replace('_', ' ') })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={S.tabBody}>
                <TranslatedText style={S.tabBodyText}>
                  {tabContent[activeTab] || ''}
                </TranslatedText>
              </View>
            </View>

            {/* Action Button */}
            {!isAlreadyInSchedule ? (
              <TouchableOpacity style={S.primaryBtn} onPress={handleAddMedicine} activeOpacity={0.85}>
                <Icon name="plus-circle-outline" size={18} color="#fff" />
                <Text style={S.primaryBtnText}>{t('add_to_my_meds', { defaultValue: 'Add to My Medicines' })}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={S.removeBtn} onPress={handleRemoveMedicine} activeOpacity={0.85}>
                <Icon name="minus-circle-outline" size={18} color="#C0392B" />
                <Text style={S.removeBtnText}>{t('remove_from_my_meds', { defaultValue: 'Remove from My Medicines' })}</Text>
              </TouchableOpacity>
            )}
          </View>

        ) : (
          /* ────────── REPORT VIEW ────────── */
          <View style={S.content}>

            {/* Verdict Banner */}
            <View style={[S.verdictBanner, { backgroundColor: sevCfg.bg, borderColor: sevCfg.border }]}>
              <View style={[S.verdictIconBox, { backgroundColor: sevCfg.iconBg }]}>
                <Text style={{ fontSize: 20 }}>{sevCfg.icon}</Text>
              </View>
              <TranslatedText style={[S.verdictText, { color: sevCfg.color }]}>
                {data.simple_verdict}
              </TranslatedText>
            </View>

            {/* Parameters Table */}
            {data.parameters?.length > 0 && (
              <>
                <Text style={S.sectionLabel}>
                  📊 {t('test_parameters', { defaultValue: 'Test Parameters' })}
                </Text>
                <View style={S.card}>
                  {/* Table header */}
                  <View style={S.tableHead}>
                    <Text style={[S.thCell, { flex: 2 }]}>{t('parameter', { defaultValue: 'Parameter' })}</Text>
                    <Text style={[S.thCell, { flex: 1.4, textAlign: 'center' }]}>{t('your_value', { defaultValue: 'Your Value' })}</Text>
                    <Text style={[S.thCell, { flex: 0.8, textAlign: 'right' }]}>{t('status', { defaultValue: 'Status' })}</Text>
                  </View>
                  {data.parameters.map((p: any, i: number) => (
                    <ParameterRow key={i} param={p} isLast={i === data.parameters.length - 1} />
                  ))}
                </View>
              </>
            )}

            {/* Insights */}
            <Text style={S.sectionLabel}>
              🔎 {t('insights', { defaultValue: 'Insights' })}
            </Text>
            <View style={S.card}>
              {[
                { icon: '🔍', key: 'findings', field: data.possible_conditions },
                { icon: '🥗', key: 'diet_advice', field: data.diet_advice },
                { icon: '🏃', key: 'lifestyle', field: data.lifestyle_advice },
                { icon: '👨‍⚕️', key: 'consult_doctor', field: data.specialist_to_see },
                { icon: '🗓', key: 'next_test_when', field: data.follow_up_when },
              ].map((row, i, arr) => (
                <InfoRow
                  key={row.key}
                  icon={row.icon}
                  title={t(row.key, { defaultValue: row.key.replace('_', ' ') })}
                  content={row.field}
                  isLast={i === arr.length - 1}
                />
              ))}
            </View>

            {/* Urgent Box */}
            {data.urgent_action ? (
              <View style={S.urgentBox}>
                <Text style={{ fontSize: 20 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.urgentTitle}>{t('urgent_action', { defaultValue: 'Urgent Action Required' })}</Text>
                  <TranslatedText style={S.urgentText}>{data.urgent_action}</TranslatedText>
                </View>
              </View>
            ) : null}

            {/* Save Button */}
            <TouchableOpacity
              style={[S.saveBtn, isSaved && S.saveBtnSaved]}
              onPress={toggleSaveReport}
              activeOpacity={0.85}
            >
              <Icon
                name={isSaved ? 'check-circle' : 'plus-circle-outline'}
                size={18}
                color={isSaved ? '#1B8A5A' : colors.textPrimary}
              />
              <Text style={[S.saveBtnText, isSaved && { color: '#1B8A5A' }]}>
                {isSaved
                  ? t('saved_to_profile', { defaultValue: 'Saved to Profile' })
                  : t('add_to_my_record', { defaultValue: 'Add to My Record' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-Screen Image Viewer */}
      <Modal visible={isZoomVisible} transparent animationType="fade" onRequestClose={() => setIsZoomVisible(false)}>
        <ZoomViewer uri={item.image_path} onClose={() => setIsZoomVisible(false)} t={t} />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Zoom Viewer ──────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

function ZoomViewer({ uri, onClose, t }: { uri: string; onClose: () => void; t: any }) {
  return (
    <View style={S.zoomContainer}>
      <SafeAreaView style={S.zoomBar}>
        <TouchableOpacity onPress={onClose} style={S.zoomCloseBtn}>
          <Icon name="close" size={20} color="#fff" />
          <Text style={S.zoomCloseText}>{t('close', { defaultValue: 'Close' })}</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.zoomContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        <Image source={{ uri }} style={{ width: SW, height: SH * 0.82 }} resizeMode="contain" />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F9' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 4 },
  backText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  headerTitle: {
    flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary,
    marginHorizontal: 6,
  },
  ttsBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#EBF3FF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Image
  scroll: { paddingBottom: 32 },
  imageBox: { width: '100%', height: 220, backgroundColor: '#111', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dateChip: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  dateText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  zoomTip: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  zoomTipText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  // Content wrapper
  content: { padding: 16, gap: 14 },

  // Medicine Card
  medCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#E5E7EB',
    padding: 14,
  },
  medIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F0EBFF',
    alignItems: 'center', justifyContent: 'center',
  },
  medTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap', 
    width: '100%',
    gap: 12,  
  },
  medName: { fontSize: 25, fontWeight: '600', color: colors.textPrimary, flexShrink: 1},
  medGeneric: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  howBadge: {
    flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F0EBFF', borderRadius: 20,
  },
  howEmoji: { fontSize: 14 },
  howLabel: { fontSize: 11, right: 0, fontWeight: '600', color: '#6C3FC5' },

  // Tab Card
  tabCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#E5E7EB', overflow: 'hidden', paddingHorizontal: 16,
  },
  tabBar: { borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
  tab: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, flexShrink: 1, },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabBody: { paddingVertical: 16, minHeight: 140 },
  tabBodyText: { fontSize: 14, color: colors.textPrimary, lineHeight: 24 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FDECEA',
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.25)',
  },
  removeBtnText: { fontSize: 14, fontWeight: '700', color: '#C0392B' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  saveBtnSaved: { backgroundColor: '#E6F7EF', borderColor: 'rgba(27,138,90,0.3)' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  // Report — Verdict
  verdictBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  verdictIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  verdictText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 22 },

  // Section Label
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: -6,
  },

  // Generic Card
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#E5E7EB', overflow: 'hidden',
  },

  // Parameters Table
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F8F9FB',
    borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  thCell: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  paramRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  paramName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  paramMeaning: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  paramValue: { fontSize: 14, fontWeight: '700' },
  paramRange: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Info Rows
  infoRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  infoRowIcon: { fontSize: 16, marginTop: 1 },
  infoRowTitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoRowText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },

  // Urgent Box
  urgentBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FDECEA',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(192,57,43,0.25)',
    padding: 14,
  },
  urgentTitle: { fontSize: 12, fontWeight: '700', color: '#C0392B', marginBottom: 4 },
  urgentText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },

  // Zoom Viewer
  zoomContainer: { flex: 1, backgroundColor: '#000' },
  zoomBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  zoomCloseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, justifyContent: 'flex-end',
  },
  zoomCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  zoomContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});