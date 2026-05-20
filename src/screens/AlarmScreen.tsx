import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  SafeAreaView, StatusBar, Animated, Dimensions, Vibration, Platform, Alert, NativeModules
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../theme';
import { logReminderAction } from '../db/queries/medicines';
import { NotificationService } from '../services/NotificationService';
import { TTSService } from '../services/TTSService';
import { VolumeManager } from 'react-native-volume-manager';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import notifee from '@notifee/react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AlarmScreen({ route, navigation }: any) {
  const { medicine, scheduledTime, notificationId } = route.params || {};
  const [currentTime, setCurrentTime] = useState(dayjs().format('hh:mm:ss A'));
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { t } = useTranslation();
  const [delayText, setDelayText] = useState('');

  useEffect(() => {
    if (scheduledTime) {
      const calculateDelay = () => {
        const now = dayjs();
        const [h, m] = scheduledTime.split(':').map(Number);
        let scheduled = dayjs().hour(h).minute(m).second(0).millisecond(0);
        
        // Correctly calculate delay across midnight
        if (scheduled.isAfter(now)) {
          scheduled = scheduled.subtract(1, 'day');
        }
        
        const diffMinutes = now.diff(scheduled, 'minute');

        // Auto-miss after 3 hours (180 minutes)
        if (diffMinutes >= 180) {
          Vibration.cancel();
          TTSService.stop();
          if (notificationId) {
            notifee.cancelNotification(notificationId);
          }
          logReminderAction(medicine?.id, scheduledTime, 'skipped');
          Alert.alert(t('window_closed_title'), t('window_closed_msg'), [
            { text: t('done'), onPress: () => navigation.replace('Main') }
          ]);
          return;
        }

        if (diffMinutes > 0) {
          const hours = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          let text = '';
          if (hours > 0) {
            text = `${hours}h ${mins}m late`;
          } else {
            text = `${mins}m late`;
          }
          setDelayText(text);
        } else {
          setDelayText('');
        }
      };

      calculateDelay();
      const delayInterval = setInterval(calculateDelay, 10000); // update every 10s for faster auto-miss checks
      return () => clearInterval(delayInterval);
    }
  }, [scheduledTime, medicine]);

  useEffect(() => {
    // 1. Clock update
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('hh:mm:ss A'));
    }, 1000);

    let ttsTimer: any;

    // 2. Battery Optimization Warning
    const checkBattery = async () => {
      if (Platform.OS === 'android') {
        const isOptimized = await NotificationService.isBatteryOptimizationEnabled();
        if (isOptimized) {
          Alert.alert(
            t('battery_warning_title'),
            t('battery_warning_msg'),
            [
              { text: t('settings'), onPress: () => NotificationService.openBatteryOptimizationSettings() },
              { text: t('later'), style: 'cancel' }
            ]
          );
        }
      }
    };

    // 3. Alarm Effects
    const startEffects = async () => {
      await checkBattery();
      await VolumeManager.setVolume(1.0, { type: 'music', showUI: false });
      
      // Play native alarm ringtone
      if (NativeModules.MediSaaNNativeModule && NativeModules.MediSaaNNativeModule.startAlarmSound) {
        try {
          await NativeModules.MediSaaNNativeModule.startAlarmSound();
        } catch (e) {
          console.warn('Failed to play native alarm sound:', e);
        }
      }

      Vibration.vibrate([1000, 1000, 1000, 1000], true);
      
      const speakMsg = t('emergency_speak', { name: medicine?.name });
      TTSService.speak(speakMsg);
      ttsTimer = setInterval(() => TTSService.speak(speakMsg), 10000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    };

    startEffects();

    // 4. Cleanup on Unmount
    return () => {
      clearInterval(timer);
      clearInterval(ttsTimer);
      Vibration.cancel();
      TTSService.stop();
      if (NativeModules.MediSaaNNativeModule && NativeModules.MediSaaNNativeModule.stopAlarmSound) {
        NativeModules.MediSaaNNativeModule.stopAlarmSound().catch(() => {});
      }
      pulseAnim.stopAnimation();
    };
  }, [medicine]);

  const stopAlarm = async () => {
    Vibration.cancel();
    TTSService.stop();
    
    // Stop native alarm ringtone
    if (NativeModules.MediSaaNNativeModule && NativeModules.MediSaaNNativeModule.stopAlarmSound) {
      try {
        await NativeModules.MediSaaNNativeModule.stopAlarmSound();
      } catch (e) {
        console.warn('Failed to stop native alarm sound:', e);
      }
    }

    if (notificationId) {
      await notifee.cancelNotification(notificationId);
    }
  };

  const handleTake = async () => {
    await stopAlarm();
    logReminderAction(medicine.id, scheduledTime, 'taken');
    navigation.replace('Main');
  };

  const handleSnooze = async () => {
    await stopAlarm();
    
    const now = dayjs();
    const [h, m] = scheduledTime.split(':').map(Number);
    let scheduled = dayjs().hour(h).minute(m).second(0).millisecond(0);
    
    // Correctly calculate midnight boundary
    if (scheduled.isAfter(now)) {
      scheduled = scheduled.subtract(1, 'day');
    }
    const windowEnd = scheduled.add(3, 'hour');

    if (now.add(30, 'minute').isBefore(windowEnd)) {
      await NotificationService.scheduleOneTimeAlarm(medicine, scheduledTime, 30);
      Alert.alert(t('snoozed_title'), t('snoozed_msg'), [
        { text: t('done'), onPress: () => navigation.replace('Main') }
      ]);
    } else {
      logReminderAction(medicine.id, scheduledTime, 'skipped');
      Alert.alert(t('window_closed_title'), t('window_closed_msg'), [
        { text: t('done'), onPress: () => navigation.replace('Main') }
      ]);
    }
  };

  return (
    <LinearGradient colors={[colors.primaryDark, '#0B5462', colors.primary]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        
        <View style={styles.header}>
          <Text style={styles.alertTitle}>{t('alarm_title')}</Text>
          <Text style={styles.currentTime}>{currentTime}</Text>
        </View>
        
        <View style={styles.main}>
          <Animated.View style={[styles.imageContainer, { transform: [{ scale: pulseAnim }] }]}>
            {medicine?.image_path ? (
              <Image source={{ uri: medicine.image_path }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}><Text style={styles.placeholderText}>💊</Text></View>
            )}
          </Animated.View>

          <Text style={styles.medName}>{medicine?.name || t('medicine_name')}</Text>
          <Text style={styles.medDose}>{medicine?.dose_amount} {medicine?.dose_unit} • {t('dose_time')}: {scheduledTime}</Text>
          
          {delayText ? (
            <View style={styles.lateBadge}>
              <Text style={styles.lateBadgeText}>⚠️ {delayText}</Text>
            </View>
          ) : null}

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{t('alarm_warning')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.takeBtn} onPress={handleTake} activeOpacity={0.8}>
            <Text style={styles.takeBtnText}>{t('take_now')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} activeOpacity={0.8}>
            <Text style={styles.snoozeBtnText}>{t('remind_30m')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  alertTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 4, opacity: 0.8 },
  currentTime: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 10 },
  
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  imageContainer: { 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    backgroundColor: '#fff', 
    padding: 8, 
    elevation: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 8 }, 
    marginBottom: 40 
  },
  image: { width: '100%', height: '100%', borderRadius: 92 },
  placeholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 92, 
    backgroundColor: '#E6F7F8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  placeholderText: { fontSize: 70 },
  
  medName: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center' },
  medDose: { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 10 },
  
  warningBox: { 
    marginTop: 30, 
    backgroundColor: 'rgba(255,255,255,0.12)', 
    padding: 16, 
    borderRadius: 16,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    maxWidth: SCREEN_WIDTH - 80,
  },
  warningText: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  
  footer: { padding: 40, gap: 16 },
  takeBtn: { 
    backgroundColor: '#fff', 
    height: 64, 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  takeBtnText: { color: colors.primary, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  snoozeBtn: { 
    backgroundColor: 'rgba(255,255,255,0.12)', 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  snoozeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lateBadge: {
    marginTop: 15,
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  lateBadgeText: {
    color: colors.warning,
    fontWeight: '800',
    fontSize: 14,
  },
});
