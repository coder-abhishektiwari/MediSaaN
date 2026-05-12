import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ParameterRow from './ParameterRow';
import SeverityBadge from './SeverityBadge';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function DetailedReportResult({ result }: { result: any }) {
  if (!result) return null;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.verdictRow}>
        <SeverityBadge severity={result.severity} />
        <Text style={styles.verdict}>{result.simple_verdict}</Text>
      </View>
      {result.parameters?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Parameters</Text>
          {result.parameters.map((p: any, i: number) => <ParameterRow key={i} param={p} />)}
        </View>
      )}
      {[
        { icon: '🔍', title: 'Findings', val: result.possible_conditions },
        { icon: '🥗', title: 'Diet',     val: result.diet_advice },
        { icon: '🏃', title: 'Lifestyle',val: result.lifestyle_advice },
        { icon: '👨‍⚕️', title: 'Consult', val: result.specialist_to_see },
        { icon: '🗓', title: 'Next Test',val: result.follow_up_when },
      ].filter(x => x.val).map(x => (
        <View key={x.title} style={styles.infoCard}>
          <Text style={styles.infoTitle}>{x.icon} {x.title}</Text>
          <Text style={styles.infoBody}>{x.val}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, padding: spacing.xl },
  verdictRow: { gap: spacing.md },
  verdict: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 26 },
  section: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { ...typography.headingSmall, color: colors.textPrimary, marginBottom: spacing.md },
  infoCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  infoTitle: { ...typography.headingSmall, color: colors.textPrimary },
  infoBody: { ...typography.bodyMedium, color: colors.textSecondary, lineHeight: 26 },
});
