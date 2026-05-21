import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { PermissionService } from '../services/PermissionService';

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

    const checkAndNavigate = async () => {
      // 1. Wait for up to 1500ms (1.5 seconds) for globalThis.pendingAlarm to be populated
      let attempts = 0;
      while (attempts < 15 && !(globalThis as any).pendingAlarm) {
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // 2. If an alarm was found/delivered, intercept immediately and redirect to AlarmScreen
      if ((globalThis as any).pendingAlarm) {
        const alarm = (globalThis as any).pendingAlarm;
        (globalThis as any).pendingAlarm = null; // Clear immediately on launch intercept
        navigation.replace('Alarm', alarm);
        return;
      }
      
      // 3. Otherwise, proceed with standard checks
      const perms = await PermissionService.checkAll();
      if (!perms.camera || !perms.notifications) {
        navigation.replace('Permission');
      } else if (!hasChosen) {
        navigation.replace('Language');
      } else if (!isProfileComplete) {
        navigation.replace('ProfileSetup');
      } else {
        navigation.replace('Main');
      }
    };

    checkAndNavigate();
  }, [fadeAnim, hasChosen, isProfileComplete, navigation, pulse, scaleAnim]);

  return (
    <LinearGradient colors={[colors.primaryDark, '#0B5462', colors.primary]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.logoRing, { transform: [{ scale: pulse }] }]}>
          <View style={styles.logoInner}>
            <Icon name="leaf" size={42} color="#fff" />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xxl,
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
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
