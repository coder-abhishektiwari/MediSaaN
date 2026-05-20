import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, SafeAreaView, StatusBar, ActivityIndicator, Modal
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { getScanHistory } from '../db/queries/reports';
import { useTranslation } from 'react-i18next';
import { getMedicines } from '../db/queries/medicines';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

interface ScanHistoryItem {
  id: number;
  type: 'medicine' | 'report';
  image_path: string;
  result_json: string;
  severity: string;
  is_saved: number;
  created_at: string;
}

export default function HistoryScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { type } = route.params; // 'medicine' or 'report'
  const { patient } = usePatientStore();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myMedicines, setMyMedicines] = useState<string[]>([]);

  const loadData = useCallback(() => {
    if (!patient?.id) return;
    setLoading(true);
    const data = getScanHistory(patient.id).filter((h: any) => h.type === type);
    setHistory(data);

    if (type === 'medicine') {
      const meds = getMedicines(patient.id);
      setMyMedicines(meds.map((m: any) => m.name.toLowerCase()));
    }
    setLoading(false);
  }, [patient?.id, type]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isMyMedicine = (name: string) => {
    return myMedicines.includes(name.toLowerCase());
  };

  const renderItem = ({ item }: { item: ScanHistoryItem }) => {
    let data: any = {};
    try {
      data = JSON.parse(item.result_json);
    } catch (e) {}

    const title = type === 'medicine' ? data.medicine_name : data.report_type;
    const strength = type === 'medicine' ? data.strength : null;
    const sub = type === 'medicine' ? data.simple_description : data.simple_verdict;
    const date = dayjs(item.created_at).format('DD MMM YYYY, hh:mm A');
    
    const isSaved = type === 'medicine' ? isMyMedicine(data.medicine_name || '') : item.is_saved === 1;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('HistoryDetail', { item })}
      >
        <Image source={{ uri: item.image_path }} style={styles.thumb} />
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title} numberOfLines={1}>{title || 'Unknown'}</Text>
              {strength && (
                <View style={styles.strengthBadge}>
                  <Text style={styles.strengthText}>{strength}</Text>
                </View>
              )}
            </View>
            {isSaved && (
              <View style={[styles.badge, { backgroundColor: type === 'medicine' ? colors.primaryLight : colors.successLight }]}>
                <Text style={[styles.badgeText, { color: type === 'medicine' ? colors.primary : colors.success }]}>
                  {type === 'medicine' ? 'My Medicine' : 'My Report'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>{sub || 'No description available'}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back', { defaultValue: 'Back' })}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === 'medicine' ? t('medicine_scans', { defaultValue: 'Medicine Scans' }) : t('report_scans', { defaultValue: 'Report Scans' })}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{type === 'medicine' ? '💊' : '📄'}</Text>
          <Text style={styles.emptyText}>{t('no_scans_found', { defaultValue: `No ${type} scans found` })}</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate(type === 'medicine' ? 'QuickScan' : 'ReportScan')}>
            <Text style={styles.scanBtnText}>{t('start_scanning', { defaultValue: 'Start Scanning' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.primary, fontWeight: '700' },
  headerTitle: { ...typography.headingSmall, color: colors.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  thumb: { width: 60, height: 60, borderRadius: borderRadius.md, backgroundColor: colors.background },
  cardInfo: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  strengthBadge: { backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  strengthText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  date: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  arrow: { fontSize: 24, color: colors.border, fontWeight: '300' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: 40 },
  emptyIcon: { fontSize: 64 },
  emptyText: { ...typography.bodyLarge, color: colors.textMuted },
  scanBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  scanBtnText: { color: '#fff', fontWeight: '700' },
});
