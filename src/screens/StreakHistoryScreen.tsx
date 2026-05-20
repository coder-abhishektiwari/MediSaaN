import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { usePatientStore } from '../store/patientStore';
import { getDetailedAdherenceHistory, getAdherenceHistory } from '../db/queries/medicines';
import { colors, typography, borderRadius } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

export default function StreakHistoryScreen({ navigation }: any) {
  const { patient } = usePatientStore();
  const [history, setHistory] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState(100);
  const [showRules, setShowRules] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (patient?.id) {
        setHistory(getDetailedAdherenceHistory(patient.id));
        const details = getAdherenceHistory(patient.id);
        setCurrentScore(details.healthScore);
      }
    }, [patient?.id])
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Current Score Banner */}
        <LinearGradient
          colors={['#FFF9E6', '#FEF3C7']}
          style={styles.scoreBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.scoreBannerLeft}>
            <Text style={styles.scoreBannerLabel}>Current Health Score</Text>
            <View style={styles.scoreValueRow}>
              <Text style={styles.scoreValueText}>{currentScore}</Text>
              <Text style={styles.scoreFireIcon}>🔥</Text>
            </View>
            <Text style={styles.scoreRatingText}>
              {currentScore >= 120 ? '🥇 Gold Standard!' : currentScore >= 100 ? '✨ Great Consistency!' : currentScore >= 70 ? '⚠️ Keep Trying!' : '🚨 Needs Immediate Attention!'}
            </Text>
          </View>
          <View style={styles.scoreBannerRight}>
            <Icon 
              name={currentScore >= 100 ? 'medal' : 'heart-flash'} 
              size={64} 
              color={currentScore >= 100 ? '#D97706' : colors.danger} 
            />
          </View>
        </LinearGradient>

        {/* Rules Card */}
        <View style={styles.rulesCard}>
          <TouchableOpacity 
            style={styles.rulesHeader} 
            onPress={() => setShowRules(!showRules)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="information-outline" size={18} color={colors.primary} />
              <Text style={styles.rulesTitle}>Health Streak Rules</Text>
            </View>
            <Icon name={showRules ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {showRules && (
            <View style={styles.rulesContent}>
              <View style={styles.ruleItem}>
                <Icon name="plus-circle" size={16} color={colors.success} style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>
                  <Text style={{ fontWeight: '700', color: colors.success }}>+10 Points</Text> earned for every single day you take all your scheduled medicines.
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Icon name="minus-circle" size={16} color={colors.danger} style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>
                  <Text style={{ fontWeight: '700', color: colors.danger }}>-20 Points</Text> deducted on any day you skip even a single scheduled medicine.
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Icon name="star-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>
                  Your score starts at <Text style={{ fontWeight: '700' }}>100</Text>. Stay consistent to build up your points!
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Adherence Log</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPositive = item.scoreChange > 0;
    const isToday = item.date === dayjs().format('YYYY-MM-DD');
    const displayDate = isToday ? 'Today' : dayjs(item.date).format('MMMM D, YYYY');

    return (
      <View style={[styles.card, isPositive ? styles.cardPositive : styles.cardNegative]}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{displayDate}</Text>
          <View style={[styles.scoreBadge, isPositive ? styles.scoreBadgePositive : styles.scoreBadgeNegative]}>
            <Text style={[styles.scoreText, isPositive ? styles.scoreTextPositive : styles.scoreTextNegative]}>
              {isPositive ? '+10' : '-20'}
            </Text>
          </View>
        </View>

        {isPositive ? (
          <Text style={styles.successText}>✨ Great job! You took all your scheduled medicines.</Text>
        ) : (
          <View style={styles.skippedContainer}>
            <Text style={styles.skippedTitle}>Medicines missed or skipped:</Text>
            {item.skippedMedicines.map((m: any, i: number) => (
              <View key={i} style={styles.skippedRow}>
                <Icon name="close-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.skippedMedText}>{m.name} at {m.time}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streak History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank" size={60} color={colors.border} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Take your medicines to build your health streak!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  listContent: { padding: 20, paddingBottom: 100 },
  headerContainer: { marginBottom: 24 },
  scoreBanner: {
    padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#FDE68A',
    elevation: 3, shadowColor: '#F59E0B', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }
  },
  scoreBannerLeft: { flex: 1 },
  scoreBannerLabel: { fontSize: 13, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  scoreValueText: { fontSize: 36, fontWeight: '900', color: '#78350F' },
  scoreFireIcon: { fontSize: 28 },
  scoreRatingText: { fontSize: 12, fontWeight: '600', color: '#92400E', marginTop: 4 },
  scoreBannerRight: { paddingLeft: 10 },
  rulesCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: colors.border,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }
  },
  rulesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rulesTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  rulesContent: { marginTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 },
  ruleItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ruleText: { fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 24, marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  cardPositive: { borderColor: colors.success + '40', backgroundColor: '#F0FDF4' },
  cardNegative: { borderColor: colors.danger + '40', backgroundColor: '#FEF2F2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgePositive: { backgroundColor: colors.success + '20' },
  scoreBadgeNegative: { backgroundColor: colors.danger + '20' },
  scoreText: { fontSize: 13, fontWeight: '800' },
  scoreTextPositive: { color: colors.success },
  scoreTextNegative: { color: colors.danger },
  successText: { fontSize: 14, fontWeight: '500', color: '#166534' },
  skippedContainer: { marginTop: 4 },
  skippedTitle: { fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 8 },
  skippedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  skippedMedText: { fontSize: 14, fontWeight: '500', color: colors.ink },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
});
