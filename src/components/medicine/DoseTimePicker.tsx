import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface Props { times: string[]; onChange: (times: string[]) => void; }

export default function DoseTimePicker({ times, onChange }: Props) {
  const update = (i: number, v: string) => {
    const arr = [...times]; arr[i] = v; onChange(arr);
  };
  return (
    <View style={styles.wrap}>
      {times.map((t, i) => (
        <View key={i} style={styles.timeWrap}>
          <Text style={styles.label}>Dose {i + 1}</Text>
          <TextInput style={styles.input} value={t} onChangeText={v => update(i, v)}
            placeholder="HH:MM" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeWrap: { alignItems: 'center', gap: 4 },
  label: { ...typography.tiny, color: colors.textMuted },
  input: {
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.sm, height: 48, paddingHorizontal: 12, minWidth: 80,
    ...typography.headingSmall, color: colors.primary, textAlign: 'center',
  },
});
