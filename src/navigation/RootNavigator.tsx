import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { useSettingsStore } from '../store/settingsStore';
import { initDatabase } from '../db/schema';
import { NotificationService } from '../services/NotificationService';
import { initVolumeShortcuts } from '../services/VolumeShortcutService';
import { TTSService } from '../services/TTSService';
import notifee, { EventType } from '@notifee/react-native';
import { NativeModules, DeviceEventEmitter } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import LanguagePickerScreen from '../screens/LanguagePickerScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import MainTabNavigator from './MainTabNavigator';
import QuickScanScreen from '../screens/QuickScanScreen';
import ReportScanScreen from '../screens/ReportScanScreen';
import ChatScreen from '../screens/ChatScreen';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import MedicineHistoryScreen from '../screens/MedicineHistoryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HistoryDetailScreen from '../screens/HistoryDetailScreen';
import MedicineInsightScreen from '../screens/MedicineInsightScreen';
import AlarmScreen from '../screens/AlarmScreen';
import PermissionScreen from '../screens/PermissionScreen';
import ApiSetupScreen from '../screens/ApiSetupScreen';
import StreakHistoryScreen from '../screens/StreakHistoryScreen';
import FloatingVoiceButton from '../components/FloatingVoiceButton';
import { PermissionService } from '../services/PermissionService';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isProfileComplete } = usePatientStore();
  const { hasChosen, language } = useLanguageStore();
  const { shortcutsEnabled } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);
  const [needsPerms, setNeedsPerms] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        initDatabase();
        await NotificationService.createChannel();
        
        // Permission Check
        const perms = await PermissionService.checkAll();
        if (!perms.camera || !perms.notifications) {
          setNeedsPerms(true);
        }

        await TTSService.init(language);
        initVolumeShortcuts(shortcutsEnabled);
      } catch (e) {
        console.warn('Setup error:', e);
      } finally {
        setIsReady(true);
      }
    };
    setup();
  }, []);

  const handleVolumeShortcut = useCallback((action: string) => {
    if (!navigationRef.isReady()) {
      (globalThis as any).pendingVolumeShortcut = action;
      return;
    }

    const routeName = action === 'quickScan' ? 'QuickScan' : action === 'reportScan' ? 'ReportScan' : null;
    if (!routeName) return;

    const currentRoute = navigationRef.getCurrentRoute() as any;
    if (currentRoute?.name !== routeName) {
      (navigationRef as any).navigate(routeName as never);
    }
  }, []);

  useEffect(() => {
    const { MediSaaNNativeModule } = NativeModules;

    // Handle notification launch (Notifee)
    notifee.getInitialNotification().then(notification => {
      if (notification?.notification.data?.type === 'alarm') {
        const data = notification.notification.data;
        const alarmPayload = {
          medicine: JSON.parse(data.medicine as string),
          scheduledTime: data.scheduledTime,
          notificationId: notification.notification.id
        };
        (globalThis as any).pendingAlarm = alarmPayload;
      }
    });

    // Handle Native Alarm Manager Launch (Cold Start)
    if (MediSaaNNativeModule && MediSaaNNativeModule.getInitialAlarm) {
      MediSaaNNativeModule.getInitialAlarm().then((alarm: any) => {
        if (alarm && alarm.medicine) {
          try {
            const medObj = typeof alarm.medicine === 'string' ? JSON.parse(alarm.medicine) : alarm.medicine;
            const alarmPayload = {
              medicine: medObj,
              scheduledTime: alarm.scheduledTime,
              notificationId: alarm.id
            };
            (globalThis as any).pendingAlarm = alarmPayload;
          } catch (e) {
            console.error('Failed to parse initial alarm medicine:', e);
          }
        }
      });
    }

    // Handle Native Volume Shortcut Launch (Cold Start)
    if (MediSaaNNativeModule && MediSaaNNativeModule.getInitialVolumeShortcut) {
      MediSaaNNativeModule.getInitialVolumeShortcut().then((shortcut: any) => {
        if (shortcut?.action) {
          handleVolumeShortcut(shortcut.action);
        }
      }).catch(() => {});
    }

    // Listen for Foreground Native Alarm Manager events
    const alarmSubscription = DeviceEventEmitter.addListener(
      'onAlarmTriggered',
      (alarm: any) => {
        if (alarm && alarm.medicine) {
          try {
            const medObj = typeof alarm.medicine === 'string' ? JSON.parse(alarm.medicine) : alarm.medicine;
            if (navigationRef.isReady()) {
              const currentRoute = navigationRef.getCurrentRoute() as any;
              if (currentRoute?.name !== 'Alarm') {
                (navigationRef as any).navigate('Alarm', {
                  medicine: medObj,
                  scheduledTime: alarm.scheduledTime,
                  notificationId: alarm.id
                });
              }
            }
          } catch (e) {
            console.error('Failed to parse triggered alarm medicine:', e);
          }
        }
      }
    );

    const volumeSubscription = DeviceEventEmitter.addListener(
      'onVolumeShortcut',
      (event: any) => {
        if (event?.action) {
          handleVolumeShortcut(event.action);
        }
      }
    );

    // Handle foreground notifications (Notifee)
    const notifeeSubscription = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data?.type === 'alarm') {
        const data = detail.notification.data;
        if (navigationRef.isReady()) {
          const currentRoute = navigationRef.getCurrentRoute() as any;
          if (currentRoute?.name !== 'Alarm') {
            (navigationRef as any).navigate('Alarm', {
              medicine: JSON.parse(data.medicine as string),
              scheduledTime: data.scheduledTime,
              notificationId: detail.notification.id
            });
          }
        }
      }
    });

    return () => {
      alarmSubscription.remove();
      volumeSubscription.remove();
      notifeeSubscription();
    };
  }, [handleVolumeShortcut]);

  if (!isReady) return null;

  const initialRoute = needsPerms
    ? 'Permission'
    : !hasChosen
    ? 'Language'
    : !isProfileComplete
    ? 'ProfileSetup'
    : 'Main';

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const pendingVolume = (globalThis as any).pendingVolumeShortcut;
        if (pendingVolume) {
          handleVolumeShortcut(pendingVolume);
          (globalThis as any).pendingVolumeShortcut = null;
        }
      }}
    >
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash"        component={SplashScreen}       />
        <Stack.Screen name="Permission"    component={PermissionScreen}   />
        <Stack.Screen name="Language"      component={LanguagePickerScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen}  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ApiSetup"      component={ApiSetupScreen}      options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Main"          component={MainTabNavigator}    />
        <Stack.Screen name="QuickScan"     component={QuickScanScreen}     options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ReportScan"    component={ReportScanScreen}    options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Chat"          component={ChatScreen}          options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AddMedicine"   component={AddMedicineScreen}   options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MedicineHistory" component={MedicineHistoryScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ScanHistory"     component={HistoryScreen}         options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="HistoryDetail"   component={HistoryDetailScreen}   options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MedicineInsight" component={MedicineInsightScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Alarm"           component={AlarmScreen}           options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="StreakHistory"   component={StreakHistoryScreen}   options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
      <FloatingVoiceButton />
    </NavigationContainer>
  );
}
