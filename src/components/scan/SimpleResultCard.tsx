import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TTSService } from '../../services/TTSService';
import { colors, typography, spacing, borderRadius, sizes } from '../../theme';

interface Props {
  result: any;
  onKnowMore: () => void;
  onAddToList: () => void;
  onScanAgain: () => void;
}

export default function SimpleResultCard({ result, onKnowMore, onAddToList, onScanAgain }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.iconBox}><Text style={{ fontSize: 36 }}>💊</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{result.medicine_name}</Text>
          {result.generic_name ? <Text style={styles.generic}>{result.generic_name}</Text> : null}
        </View>
      </View>
      <Text style={styles.desc}>{result.simple_description}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.speakBtn} onPress={() => TTSService.speak(result.simple_description)}>
          <Text style={styles.speakText}>🔊 Speak</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn} onPress={onKnowMore}>
          <Text style={styles.moreText}>Know More →</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={onAddToList}>
        <Text style={styles.addText}>+ Add to My Medicines</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.scanAgainBtn} onPress={onScanAgain}>
        <Text style={styles.scanAgainText}>Scan Another</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xxl, gap: spacing.lg },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  name: { ...typography.headingLarge, color: colors.textPrimary },
  generic: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  desc: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 28 },
  row: { flexDirection: 'row', gap: spacing.md },
  speakBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  speakText: { ...typography.labelMedium, color: colors.primary },
  moreBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  moreText: { ...typography.labelMedium, color: colors.primaryDark },
  addBtn: { backgroundColor: colors.primary, height: sizes.buttonHeight, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  addText: { ...typography.labelLarge, color: '#fff' },
  scanAgainBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  scanAgainText: { ...typography.bodyMedium, color: colors.textSecondary },
});
