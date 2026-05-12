import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, sizes, borderRadius } from '../../theme';

export default function AppButton({ title, onPress, variant = 'primary', loading, disabled, icon, accessibilityLabel }: any) {
  const getBgColor = () => {
    if (disabled) return colors.divider;
    if (variant === 'secondary') return colors.surface;
    if (variant === 'danger') return colors.danger;
    if (variant === 'ghost') return 'transparent';
    return colors.primary;
  };
  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (variant === 'secondary' || variant === 'ghost') return colors.primary;
    return colors.surface;
  };

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: getBgColor() }, variant === 'secondary' && { borderWidth: 1, borderColor: colors.primary }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || title}
    >
      {loading ? <ActivityIndicator color={getTextColor()} /> : (
        <>
          {icon && <Text style={{ color: getTextColor(), marginRight: 8 }}>{icon}</Text>}
          <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { height: sizes.buttonHeight, borderRadius: borderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  text: { ...typography.labelLarge, fontWeight: 'bold' }
});
