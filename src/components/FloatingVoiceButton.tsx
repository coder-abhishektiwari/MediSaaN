import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useVoiceStore } from '../store/voiceStore';
import { navigationRef } from '../navigation/navigationRef';
import { colors, spacing, borderRadius, sizes } from '../theme';

export default function FloatingVoiceButton() {
  const { isVoiceModeActive } = useVoiceStore();

  if (!isVoiceModeActive) return null;

  return (
    <TouchableOpacity
      style={styles.floatingBtn}
      onPress={() => (navigationRef as any).navigate('Chat')}
      activeOpacity={0.8}
    >
      <Icon name="microphone" size={18} color="#fff" />
      <Text style={styles.label}>Voice Active</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    bottom: sizes.tabBarHeight + 20,
    right: 20,
    backgroundColor: colors.primaryDark,
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
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
