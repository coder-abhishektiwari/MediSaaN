import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useVoiceStore } from '../store/voiceStore';
import { navigationRef } from '../navigation/navigationRef';
import { colors, spacing, borderRadius, sizes } from '../theme';

const { width, height } = Dimensions.get('window');

export default function FloatingVoiceButton() {
  const { isVoiceModeActive } = useVoiceStore();

  if (!isVoiceModeActive) return null;

  return (
    <TouchableOpacity
      style={styles.floatingBtn}
      onPress={() => (navigationRef as any).navigate('Chat')}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>🎙</Text>
      <Text style={styles.label}>Voice Active</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    bottom: sizes.tabBarHeight + 20,
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1000,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});