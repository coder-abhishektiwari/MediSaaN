import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

export default function StockBadge({ quantity }: { quantity: number }) {
  const low = quantity <= 5;
  return (
    <View style={[styles.badge, { backgroundColor: low ? colors.warningLight : colors.primaryLight }]}>
      <Text style={[styles.text, { color: low ? colors.warning : colors.primary }]}>
        {low ? '⚠️ ' : '📦 '}{quantity} left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  text: { ...typography.tiny, fontWeight: '700' },
});
