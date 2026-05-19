import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Handle notification launch
    notifee.getInitialNotification().then(notification => {
      if (notification?.notification.data?.type === 'alarm') {
        const data = notification.notification.data;
        setTimeout(() => {
          (navigationRef as any).navigate('Alarm', {
            medicine: JSON.parse(data.medicine as string),
            scheduledTime: data.scheduledTime,
            notificationId: notification.notification.id
          });
        }, 1000);
      }
    });

    // Handle foreground notifications
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data?.type === 'alarm') {
        const data = detail.notification.data;
        (navigationRef as any).navigate('Alarm', {
          medicine: JSON.parse(data.medicine as string),
          scheduledTime: data.scheduledTime,
          notificationId: detail.notification.id
        });
      }
    });
  }, []);

  if (!isReady) return null;

  const initialRoute = needsPerms
    ? 'Permission'
    : !hasChosen
    ? 'Language'
    : !isProfileComplete
    ? 'ProfileSetup'
    : 'Main';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash"        component={SplashScreen}       />
        <Stack.Screen name="Permission"    component={PermissionScreen}   />
        <Stack.Screen name="Language"      component={LanguagePickerScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen}  options={{ animation: 'slide_from_right' }} />
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
      </Stack.Navigator>
      <FloatingVoiceButton />
    </NavigationContainer>
  );
}
