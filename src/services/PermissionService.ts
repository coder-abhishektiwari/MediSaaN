import { Platform, Linking, NativeModules } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import notifee from '@notifee/react-native';

const { MediSaaNNativeModule } = NativeModules;

export class PermissionService {
  static async checkAll() {
    const results = {
      camera: false,
      notifications: false,
      alarm: false,
      battery: false,
      voice: false,
      location: false,
      overlay: false,
    };

    // 1. Camera
    const cameraRes = await check(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA
    );
    results.camera = cameraRes === RESULTS.GRANTED;

    // 2. Notifications
    const settings = await notifee.getNotificationSettings();
    results.notifications = settings.authorizationStatus >= 1;

    // 3. Exact Alarm (Android 12+)
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      results.alarm = settings?.android?.alarm === 1;
    } else {
      results.alarm = true;
    }

    // 4. Battery Optimization
    try {
      const power = await notifee.getPowerManagerInfo();
      results.battery = !(power as any)?.batteryOptimizationEnabled;
    } catch (e) {
      results.battery = true; // Fallback to safe
    }

    // 5. Voice (Record Audio)
    const voiceRes = await check(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.RECORD_AUDIO : PERMISSIONS.IOS.MICROPHONE
    );
    results.voice = voiceRes === RESULTS.GRANTED;

    // 6. Location
    const locRes = await check(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    );
    results.location = locRes === RESULTS.GRANTED;

    // 7. Overlay (Appear on Top / System Alert Window) - Android Only
    if (Platform.OS === 'android') {
      if (MediSaaNNativeModule) {
        results.overlay = await MediSaaNNativeModule.canDrawOverlays();
      } else {
        results.overlay = true; // Fallback if module is not built yet
      }
    } else {
      results.overlay = true;
    }

    return results;
  }

  static async requestCamera() {
    const res = await request(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA
    );
    return res === RESULTS.GRANTED;
  }

  static async requestNotifications() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  }

  static async requestBattery() {
    await notifee.openBatteryOptimizationSettings();
  }

  static async requestAlarm() {
    if (Platform.OS === 'android') {
      try {
        Linking.openSettings();
      } catch (e) {
        Linking.openSettings();
      }
    }
  }

  static async requestVoice() {
    const res = await request(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.RECORD_AUDIO : PERMISSIONS.IOS.MICROPHONE
    );
    return res === RESULTS.GRANTED;
  }

  static async requestLocation() {
    const res = await request(
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    );
    return res === RESULTS.GRANTED;
  }

  static async requestOverlay() {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION');
      } catch (e) {
        Linking.openSettings();
      }
    }
  }
}
