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
    } catch (e) { }

    const title = type === 'medicine' ? data.medicine_name : data.report_type;
    const strength = type === 'medicine' ? data.strength : null;
    const sub = type === 'medicine' ? data.simple_description : data.simple_verdict;
    const date = dayjs(item.created_at).format('DD MMM YYYY • hh:mm A');

    const isSaved = type === 'medicine' ? isMyMedicine(data.medicine_name || '') : item.is_saved === 1;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('HistoryDetail', { item })}
        activeOpacity={0.85}
      >
        {/* Left Side: Designer Image Glass Wrapper */}
        <View style={styles.imageWrapper}>
          {/* Strict string length check */}
          {item.image_path && item.image_path.trim().length > 0 ? (
            <Image source={{ uri: item.image_path }} style={styles.thumb} />
          ) : (
            <Text style={{ fontSize: 40 }}>{type === 'medicine' ? '💊' : '📄'}</Text>
          )}

          {/* Subtle overlay accent icon for micro-designing */}
          <View style={styles.typeIndicator}>
            <Text style={{ fontSize: 10 }}>{type === 'medicine' ? '💊' : '📄'}</Text>
          </View>
        </View>

        {/* Right Side: Information Matrix */}
        <View style={styles.cardInfo}>
          {/* Top Info Layout */}
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title || 'Unknown'}
            </Text>

            {/* {strength && (
              <View style={styles.strengthBadge}>
                <Text style={styles.strengthText}>{strength}</Text>
              </View>
            )} */}
          </View>

          {/* Description Section */}
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            {sub || 'No description available'}
          </Text>

          {/* Designer Bottom Footer Line */}
          <View style={styles.cardFooter}>
            <View style={styles.dateRow}>
              <Text style={styles.dateIcon}>🕒</Text>
              <Text style={styles.date}>{date}</Text>
            </View>

            {isSaved && (
              <View style={[styles.badge, {
                backgroundColor: type === 'medicine' ? '#EEF2F6' : '#ECFDF5',
                borderColor: type === 'medicine' ? '#CBD5E1' : '#A7F3D0'
              }]}>
                <View style={[styles.badgeDot, { backgroundColor: type === 'medicine' ? colors.primary : colors.success }]} />
                <Text style={[styles.badgeText, { color: type === 'medicine' ? '#334155' : '#065F46' }]}>
                  {type === 'medicine' ? 'My Medicine' : 'Saved'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Minimalist Neo-Chevron Indicator */}
        <View style={styles.arrowContainer}>
          <View style={styles.arrowCircle}>
            <Text style={styles.arrow}>➔</Text>
          </View>
        </View>
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
  // --- Updated Professional Card Layout Styles ---
  // --- Modern Designer Aesthetics ---
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Rounded smooth corners
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F1F1F4', // Ultra soft premium border
    // High-end soft shadow layering
    shadowColor: '#1E293B',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    resizeMode: 'cover',
  },
  typeIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A', // Slate-900 typography
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  strengthBadge: {
    backgroundColor: '#F0F5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3E4FF',
    height: 25,
    maxWidth: 90,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB', // Vibrant sapphire micro text
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B', // Elegant slate descriptions
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateIcon: {
    fontSize: 10,
    opacity: 0.6,
  },
  date: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  arrowContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  arrow: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
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
