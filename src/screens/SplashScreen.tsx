import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, StatusBar, Dimensions,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.85)).current;
  const pulse      = useRef(new Animated.Value(1)).current;

  const { isProfileComplete } = usePatientStore();
  const { hasChosen } = useLanguageStore();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5,  useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      const dest = !hasChosen ? 'Language' : !isProfileComplete ? 'ProfileSetup' : 'Main';
      navigation.replace(dest);
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Background circles */}
      <View style={styles.circleBg1} />
      <View style={styles.circleBg2} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoRing, { transform: [{ scale: pulse }] }]}>
          <View style={styles.logoInner}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
        </Animated.View>

        <Text style={styles.appName}>MediSaaN</Text>
        <Text style={styles.appNameHindi}>मेडिसान</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Apni Sehat Ka Saathi</Text>
        <Text style={styles.taglineEn}>Your Trusted Health Companion</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBg1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -80,
  },
  circleBg2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 40,
    left: -60,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    ...typography.displayLarge,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  appNameHindi: {
    ...typography.headingMedium,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
    marginVertical: spacing.lg,
  },
  tagline: {
    ...typography.headingSmall,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
  },
  taglineEn: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
});
