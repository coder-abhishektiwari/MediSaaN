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

const TABS = ['uses', 'dosage', 'side_effects', 'warnings', 'interactions'];

const HOW_TO_LABEL = (val: string, t: any) => {
  if (val === 'before_food') return `🍽 ${t('before_food', { defaultValue: 'Before Food' })}`;
  if (val === 'after_food') return `🍽 ${t('after_food', { defaultValue: 'After Food' })}`;
  if (val === 'with_food') return `🍽 ${t('with_food', { defaultValue: 'With Food' })}`;
  return `🕒 ${t('anytime', { defaultValue: 'Anytime' })}`;
};

const ParameterRow = ({ param, t }: { param: any, t: any }) => {
  const isNormal = param.status === 'normal';
  const color = isNormal ? colors.success : colors.danger;
  return (
    <View style={styles.paramRow}>
      <View style={{ flex: 2 }}>
        <TranslatedText style={styles.paramName}>{param.name}</TranslatedText>
        <TranslatedText style={styles.paramMeaning}>{param.meaning}</TranslatedText>
      </View>
      <View style={{ flex: 1.5, alignItems: 'center' }}>
        <Text style={[styles.paramValue, { color }]}>{param.value} {param.unit}</Text>
        <Text style={styles.paramRange}>Ref: {param.normal_range}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <View style={[styles.statusBadge, { backgroundColor: color + '15', borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{param.status?.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
};

const InfoSection = ({ icon, title, content }: any) => {
  if (!content) return null;
  return (
    <View style={styles.infoSection}>
      <View style={styles.infoHead}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <TranslatedText style={styles.infoBody}>{content}</TranslatedText>
    </View>
  );
};

export default function HistoryDetailScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { item } = route.params;
  const { patient } = usePatientStore();
  const [isSaved, setIsSaved] = useState(item.is_saved === 1);
  const [activeTab, setActiveTab] = useState(0);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [isAlreadyInSchedule, setIsAlreadyInSchedule] = useState(false);
  
  let data: any = {};
  try {
    data = JSON.parse(item.result_json);
  } catch {}

  const isMedicine = item.type === 'medicine';
  const translatedDesc = useTranslateAIResponse(isMedicine ? data.simple_description || '' : data.simple_verdict || '');

  React.useEffect(() => {
    if (isMedicine && patient?.id && data.medicine_name) {
      const currentMeds = getMedicines(patient.id);
      const exists = currentMeds.some((m: any) => m.name.toLowerCase() === data.medicine_name.toLowerCase());
      setIsAlreadyInSchedule(exists);
    }
  }, [isMedicine, patient?.id, data.medicine_name]);
  const date = dayjs(item.created_at).format('DD MMMM YYYY, hh:mm A');

  const sevColor = 
    item.severity === 'urgent' ? colors.danger :
    item.severity === 'needs_attention' ? colors.warning :
    colors.success;

  const toggleSaveReport = () => {
    const newState = !isSaved;
    markScanAsSaved(item.id, newState);
    setIsSaved(newState);
  };

  const handleAddMedicine = () => {
    if (!patient?.id) return;
    addMedicine({
      patient_id: patient.id, name: data.medicine_name,
      generic_name: data.generic_name, image_path: item.image_path,
      dose_amount: 1, dose_unit: data.medicine_form || 'tablet',
      times_per_day: 1, dose_times: ['08:00'], days_type: 'daily',
      custom_days: [], start_date: new Date().toISOString().split('T')[0],
      end_date: null, stock_quantity: 0, notes: data.simple_description,
      scan_cache_json: JSON.stringify(data),
    });
    setIsAlreadyInSchedule(true);
    Alert.alert(`✅ ${t('added', { defaultValue: 'Added' })}`, `${data.medicine_name} ${t('added_to_meds', { defaultValue: 'has been added to your medicine list.' })}`);
  };

  const handleRemoveMedicine = () => {
    if (!patient?.id) return;
    deleteMedicineByName(patient.id, data.medicine_name);
    setIsAlreadyInSchedule(false);
    Alert.alert(`✅ ${t('removed', { defaultValue: 'Removed' })}`, `${data.medicine_name} ${t('removed_from_meds', { defaultValue: 'has been removed from your medicine list.' })}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back', { defaultValue: 'Back' })}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isMedicine ? data.medicine_name : t('report_analysis', { defaultValue: 'Report Analysis' })}</Text>
        <TouchableOpacity onPress={() => TTSService.speak(translatedDesc)}>
          <Text style={{ fontSize: 24 }}>🔊</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.imageBox} activeOpacity={0.9} onPress={() => setIsZoomVisible(true)}>
          <Image source={{ uri: item.image_path }} style={styles.image} resizeMode="contain" />
          <View style={styles.dateChip}>
            <Text style={styles.dateText}>{date}</Text>
          </View>
          <View style={styles.zoomTip}>
            <Text style={styles.zoomTipText}>🔍 {t('tap_to_zoom', { defaultValue: 'Tap to Zoom' })}</Text>
          </View>
        </TouchableOpacity>

        {isMedicine ? (
          <View style={styles.medContent}>
            <View style={styles.medHeader}>
              <View style={styles.medIconBig}><Text style={{ fontSize: 36 }}>💊</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{data.medicine_name}</Text>
                {data.generic_name ? <Text style={styles.genericName}>{data.generic_name}</Text> : null}
              </View>
              {data.how_to_take ? (
                <View style={styles.howBadge}>
                  <Text style={styles.howBadgeText}>{HOW_TO_LABEL(data.how_to_take, t)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.tabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TABS.map((tab, i) => (
                  <TouchableOpacity key={tab} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
                    <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t(tab, { defaultValue: tab.replace('_', ' ') })}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.tabContent}>
              {activeTab === 4 ? (
                <>
                  {data.how_to_take ? <Text style={styles.tabBody}>{HOW_TO_LABEL(data.how_to_take, t)}{'\n\n'}</Text> : null}
                  <TranslatedText style={styles.tabBody}>{data.drug_interactions || ''}</TranslatedText>
                </>
              ) : (
                <TranslatedText style={styles.tabBody}>
                  {activeTab === 0 ? data.uses :
                   activeTab === 1 ? data.dosage_instructions :
                   activeTab === 2 ? data.side_effects :
                   data.warnings}
                </TranslatedText>
              )}
              {data.drug_interactions && activeTab === 4 && (
                <View style={styles.interactionBox}>
                  <Text style={styles.interactionTitle}>⚠️ {t('drug_interactions', { defaultValue: 'Drug Interactions' })}</Text>
                  <TranslatedText style={styles.interactionText}>{data.drug_interactions}</TranslatedText>
                </View>
              )}
            </View>

            {!isAlreadyInSchedule ? (
              <TouchableOpacity style={styles.actionBtn} onPress={handleAddMedicine}>
                <Text style={styles.actionBtnText}>+ {t('add_to_my_meds', { defaultValue: 'Add to My Medicines' })}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={handleRemoveMedicine}>
                <Text style={styles.removeBtnText}>✕ {t('remove_from_my_meds', { defaultValue: 'Remove from My Medicines' })}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.reportContent}>
            <View style={[styles.verdictBanner, { backgroundColor: sevColor }]}>
              <Text style={styles.verdictIcon}>{item.severity === 'urgent' ? '🚨' : item.severity === 'needs_attention' ? '⚠️' : '✅'}</Text>
              <TranslatedText style={styles.verdictText}>{data.simple_verdict}</TranslatedText>
            </View>

            {data.parameters?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 {t('test_parameters', { defaultValue: 'Test Parameters' })}</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thCell, { flex: 2 }]}>{t('parameter', { defaultValue: 'Parameter' })}</Text>
                  <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>{t('your_value', { defaultValue: 'Your Value' })}</Text>
                  <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>{t('status', { defaultValue: 'Status' })}</Text>
                </View>
                {data.parameters.map((p: any, i: number) => <ParameterRow key={i} param={p} t={t} />)}
              </View>
            )}

            <View style={styles.infoSections}>
              <InfoSection icon="🔍" title={t('findings', { defaultValue: 'Findings' })}        content={data.possible_conditions} />
              <InfoSection icon="🥗" title={t('diet_advice', { defaultValue: 'Diet Advice' })}     content={data.diet_advice} />
              <InfoSection icon="🏃" title={t('lifestyle', { defaultValue: 'Lifestyle' })}       content={data.lifestyle_advice} />
              <InfoSection icon="👨‍⚕️" title={t('consult_doctor', { defaultValue: 'Consult Doctor' })} content={data.specialist_to_see} />
              <InfoSection icon="🗓" title={t('next_test_when', { defaultValue: 'Next Test When' })}  content={data.follow_up_when} />
              {data.urgent_action && (
                <View style={styles.urgentBox}>
                  <Text style={styles.urgentTitle}>🚨 {t('urgent_action', { defaultValue: 'Urgent Action Required' })}</Text>
                  <TranslatedText style={styles.urgentText}>{data.urgent_action}</TranslatedText>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, isSaved && { borderColor: colors.success, backgroundColor: colors.success + '10' }]} 
              onPress={toggleSaveReport}
            >
              <Text style={[styles.actionBtnText, isSaved && { color: colors.success }]}>
                {isSaved ? `✓ ${t('saved_to_profile', { defaultValue: 'Saved to Profile' })}` : `➕ ${t('add_to_my_record', { defaultValue: 'Add to My Record' })}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Screen Image Viewer */}
      <Modal visible={isZoomVisible} transparent animationType="fade" onRequestClose={() => setIsZoomVisible(false)}>
        <ZoomViewer uri={item.image_path} onClose={() => setIsZoomVisible(false)} t={t} />
      </Modal>
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ZoomViewer({ uri, onClose, t }: { uri: string, onClose: () => void, t: any }) {
  return (
    <View style={styles.zoomContainer}>
      <SafeAreaView style={styles.zoomHeader}>
        <TouchableOpacity onPress={onClose} style={styles.zoomClose}>
          <Icon name="close" size={22} color="#fff" />
          <Text style={styles.zoomCloseText}>{t('close', { defaultValue: 'Close' })}</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      <ScrollView
        style={styles.zoomScroll}
        contentContainerStyle={styles.zoomContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        <Image 
          source={{ uri }} 
          style={styles.zoomImage} 
          resizeMode="contain" 
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  headerTitle: { ...typography.headingSmall, color: colors.textPrimary, flex: 1, marginHorizontal: 12 },
  scroll: { paddingBottom: 40 },
  imageBox: { width: '100%', height: 250, backgroundColor: '#000', position: 'relative' },
  image: { width: '100%', height: '100%' },
  dateChip: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  dateText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  zoomTip: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  zoomTipText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  medContent: { padding: spacing.lg, gap: spacing.lg },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  medIconBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  medName: { ...typography.headingMedium, color: colors.textPrimary },
  genericName: { ...typography.bodySmall, color: colors.textSecondary },
  howBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  howBadgeText: { ...typography.tiny, color: colors.textPrimary, fontWeight: '700' },
  tabBar: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.labelMedium, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabContent: { padding: spacing.md, minHeight: 200 },
  tabBody: { ...typography.bodyMedium, color: colors.textPrimary, lineHeight: 26 },
  interactionBox: { marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.warningLight, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.warning },
  interactionTitle: { ...typography.labelMedium, color: colors.warning, marginBottom: 4 },
  interactionText: { ...typography.bodySmall, color: colors.textPrimary },
  reportContent: { padding: spacing.lg, gap: spacing.lg },
  verdictBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, borderRadius: borderRadius.lg },
  verdictIcon: { fontSize: 32 },
  verdictText: { flex: 1, ...typography.bodyLarge, color: '#fff', fontWeight: '700', lineHeight: 24 },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.labelLarge, color: colors.textPrimary },
  tableHeader: { flexDirection: 'row', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  thCell: { ...typography.tiny, color: colors.textMuted, textTransform: 'uppercase' },
  paramRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  paramName: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  paramMeaning: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  paramValue: { ...typography.bodyMedium, fontWeight: '800' },
  paramRange: { ...typography.tiny, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '800' },
  infoSections: { gap: spacing.md },
  infoSection: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  infoIcon: { fontSize: 20 },
  infoTitle: { ...typography.labelMedium, color: colors.textPrimary },
  infoBody: { ...typography.bodyMedium, color: colors.textSecondary, lineHeight: 22 },
  urgentBox: { backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.danger },
  urgentTitle: { ...typography.labelMedium, color: colors.danger, marginBottom: 4 },
  urgentText: { ...typography.bodySmall, color: colors.textPrimary },
  actionBtn: { 
    marginTop: spacing.xl, paddingVertical: 16, borderRadius: borderRadius.full, 
    borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', backgroundColor: '#fff' 
  },
  actionBtnText: { ...typography.labelLarge, color: colors.primary },
  removeBtn: { borderColor: colors.danger, backgroundColor: colors.danger + '10' },
  removeBtnText: { ...typography.labelLarge, color: colors.danger },
  alreadyBadge: { 
    marginTop: spacing.xl, paddingVertical: 12, borderRadius: borderRadius.md, 
    backgroundColor: colors.success + '15', alignItems: 'center', borderWidth: 1, borderColor: colors.success 
  },
  alreadyText: { ...typography.labelMedium, color: colors.success, fontWeight: '700' },
  zoomContainer: { flex: 1, backgroundColor: '#000' },
  zoomHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  zoomClose: { padding: 16, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', gap: 8 },
  zoomCloseText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  zoomScroll: { flex: 1 },
  zoomContent: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  zoomImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
});
