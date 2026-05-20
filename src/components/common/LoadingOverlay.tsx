import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

export default function LoadingOverlay({ message = 'Loading...', visible }: any) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  box: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  text: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 16 }
});
