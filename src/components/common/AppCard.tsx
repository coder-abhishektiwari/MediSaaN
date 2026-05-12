import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius } from '../../theme';

export default function AppCard({ children, onPress, style }: any) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden'
  }
});
