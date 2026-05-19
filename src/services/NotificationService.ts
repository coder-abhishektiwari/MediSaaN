import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  TriggerType,
  RepeatFrequency,
  AuthorizationStatus,
} from '@notifee/react-native';
import dayjs from 'dayjs';

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  static async createChannel() {
    await notifee.createChannel({
      id: 'medisaan_alarms',
      name: 'Critical Medicine Alarms',
      sound: 'default', 
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
    });
  }

  static async isBatteryOptimizationEnabled(): Promise<boolean> {
    const settings = await notifee.getPowerManagerInfo();
    return (settings as any).batteryOptimizationEnabled || false;
  }

  static async openBatteryOptimizationSettings() {
    await notifee.openBatteryOptimizationSettings();
  }

  static async scheduleOneTimeAlarm(medicine: any, scheduledTime: string, delayMinutes: number) {
    const triggerDate = dayjs().add(delayMinutes, 'minute');
    const notifId = `snooze_${medicine.id}_${Date.now()}`;

    await notifee.createTriggerNotification(
      {
        id: notifId,
        title: `⏰ SNOOZE: ${medicine.name}`,
        body: `Follow-up reminder for your dose`,
        data: {
          medicine: JSON.stringify(medicine),
          scheduledTime: scheduledTime,
          type: 'alarm',
          isSnooze: 'true'
        },
        android: {
          channelId: 'medisaan_alarms',
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          ongoing: true,
          autoCancel: false,
          color: '#3B82F6',
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: {
            id: 'default',
            mainComponent: 'MediSaaN',
          },
          pressAction: { id: 'default' },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.valueOf(),
        alarmManager: { allowWhileIdle: true },
      },
    );
  }

  static async scheduleMedicineReminder(
    medicine: any,
    timeStr: string,
    repeatDaily: boolean,
  ) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let triggerDate = dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
    if (triggerDate.isBefore(dayjs())) {
      triggerDate = triggerDate.add(1, 'day');
    }

    const notifId = `med_${medicine.id}_${timeStr.replace(':', '')}`;
    const title = `💊 MEDICINE ALARM: ${medicine.name}`;
    const body = `URGENT: Time to take your ${medicine.dose_amount} ${medicine.dose_unit}`;

    const { MediSaaNNativeModule } = require('react-native').NativeModules;
    
    if (MediSaaNNativeModule) {
      // Use native AlarmManager for 100% reliable wake-ups
      await MediSaaNNativeModule.scheduleAlarm(notifId, triggerDate.valueOf(), title, body);
    } else {
      // Fallback to notifee if module is missing
      await notifee.createTriggerNotification(
        {
          id: notifId,
          title, body,
          data: {
            medicine: JSON.stringify(medicine),
            scheduledTime: timeStr,
            type: 'alarm'
          },
          android: {
            channelId: 'medisaan_alarms',
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.ALARM,
            ongoing: true,
            autoCancel: false,
            color: '#EF4444',
            visibility: AndroidVisibility.PUBLIC,
            fullScreenAction: { id: 'default', mainComponent: 'MediSaaN' },
            pressAction: { id: 'default' },
            vibrationPattern: [300, 500, 300, 500],
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerDate.valueOf(),
          repeatFrequency: repeatDaily ? RepeatFrequency.DAILY : undefined,
          alarmManager: { allowWhileIdle: true },
        },
      );
    }
  }

  static async cancelMedicineReminders(medicineId: number) {
    const notifications = await notifee.getTriggerNotifications();
    for (const n of notifications) {
      if (n.notification.id?.startsWith(`med_${medicineId}_`) || n.notification.id?.startsWith(`snooze_${medicineId}_`)) {
        await notifee.cancelTriggerNotification(n.notification.id);
      }
    }
  }

  static async cancelAll() {
    await notifee.cancelAllNotifications();
  }
}
