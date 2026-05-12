import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

const PROMPTS = [
  { id: '1', label: '💊 Forgot medicine', text: 'I forgot to take my medicine. What should I do?' },
  { id: '2', label: '🤕 I have pain',    text: 'I am having pain. What should I do?' },
  { id: '3', label: '⚠️ Side effects?',  text: 'What are the side effects of my medicines?' },
  { id: '4', label: '👨‍⚕️ See doctor?',   text: 'When should I see a doctor?' },
  { id: '5', label: '🥗 Diet advice',    text: 'What diet should I follow for my conditions?' },
];

export default function QuickPromptChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <FlatList
      horizontal data={PROMPTS} keyExtractor={i => i.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.chip} onPress={() => onSelect(item.text)}>
          <Text style={styles.chipText}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  chipText: { ...typography.caption, color: colors.textSecondary },
});
