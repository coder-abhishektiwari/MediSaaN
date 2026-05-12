import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors, typography } from '../../theme';

export default function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ {t('no_internet')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.warning, padding: 8, alignItems: 'center', justifyContent: 'center' },
  text: { ...typography.labelLarge, color: colors.surface, fontWeight: 'bold' }
});
