import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

const TABS = ['Uses', 'Dosage', 'Side Effects', 'Warnings', 'How to Take'];
const HOW_MAP: Record<string, string> = {
  before_food: '🍽 Before Food', after_food: '🍽 After Food',
  with_food: '🍽 With Food', anytime: '⏰ Anytime',
};

export default function DetailedMedicineResult({ result }: { result: any }) {
  const [tab, setTab] = useState(0);
  const tabContent = [
    result.uses, result.dosage_instructions, result.side_effects,
    result.warnings, (HOW_MAP[result.how_to_take] || result.how_to_take) + (result.drug_interactions ? '\n\n⚠️ Drug Interactions:\n' + result.drug_interactions : ''),
  ];
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.bodyText}>{tabContent[tab] || 'No information available.'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { ...typography.labelMedium, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  body: { padding: spacing.xl },
  bodyText: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 30 },
});
