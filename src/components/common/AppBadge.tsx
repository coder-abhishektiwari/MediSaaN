import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

export default function AppBadge({ label, color = colors.primary }: any) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm },
  text: { ...typography.caption, fontWeight: 'bold' }
});
