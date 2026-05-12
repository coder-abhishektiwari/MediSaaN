import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, Animated,
} from 'react-native';
import { useLanguageStore, LANGUAGES } from '../store/languageStore';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import i18n from '../utils/i18n';

export default function LanguagePickerScreen({ navigation }: any) {
  const [selected, setSelected] = useState('en');
  const { setLanguage } = useLanguageStore();
  const scaleAnims = useRef(LANGUAGES.map(() => new Animated.Value(1))).current;

  const handleSelect = (code: string, index: number) => {
    setSelected(code);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = () => {
    setLanguage(selected);
    i18n.changeLanguage(selected);
    navigation.replace('ProfileSetup');
  };

  const renderItem = ({ item, index }: { item: typeof LANGUAGES[0]; index: number }) => {
    const isSelected = item.code === selected;
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnims[index] }], flex: 1, margin: 6 }}>
        <TouchableOpacity
          style={[styles.langCard, isSelected && styles.langCardSelected]}
          onPress={() => handleSelect(item.code, index)}
          activeOpacity={0.8}
          accessibilityLabel={`Select ${item.roman}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
          <Text style={[styles.nativeText, isSelected && { color: colors.primary }]} numberOfLines={1}>
            {item.native}
          </Text>
          <Text style={[styles.romanText, isSelected && { color: colors.primaryDark }]}>
            {item.roman}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>

        <View style={styles.header}>
          <View style={styles.logoSmall}><Text style={{ fontSize: 28 }}>🌿</Text></View>
          <Text style={styles.title}>अपनी भाषा चुनें</Text>
          <Text style={styles.subtitle}>Choose your language</Text>
        </View>

        <FlatList
          data={LANGUAGES}
          keyExtractor={item => item.code}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueBtnText}>Aage Badhein  →</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>आप बाद में भाषा बदल सकते हैं • You can change this later</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  logoSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 80,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  langCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    elevation: 4,
    shadowOpacity: 0.1,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  nativeText: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  romanText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    height: sizes.buttonHeight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  continueBtnText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
