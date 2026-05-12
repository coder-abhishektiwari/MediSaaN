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

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isProfileComplete } = usePatientStore();
  const { hasChosen, language } = useLanguageStore();
  const { shortcutsEnabled } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        initDatabase();
        await NotificationService.createChannel();
        await NotificationService.requestPermissions();
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

  if (!isReady) return null;

  const initialRoute = !hasChosen
    ? 'Language'
    : !isProfileComplete
    ? 'ProfileSetup'
    : 'Main';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash"        component={SplashScreen}       />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
