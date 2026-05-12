import notifee, {
  AndroidImportance,
  AndroidVisibility,
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
      id: 'medisaan_reminders',
      name: 'Medicine Reminders',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
    });
  }

  static async scheduleMedicineReminder(
    medicineId: number,
    medicineName: string,
    dose: string,
    timeStr: string,
    repeatDaily: boolean,
  ) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let triggerDate = dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
    if (triggerDate.isBefore(dayjs())) {
      triggerDate = triggerDate.add(1, 'day');
    }

    const notifId = `med_${medicineId}_${timeStr.replace(':', '')}`;

    await notifee.createTriggerNotification(
      {
        id: notifId,
        title: `💊 ${medicineName}`,
        body: `Dose: ${dose} — Time to take your medicine`,
        android: {
          channelId: 'medisaan_reminders',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          actions: [
            { title: '✅ Taken',    pressAction: { id: 'taken' } },
            { title: '⏭ Skip',     pressAction: { id: 'skipped' } },
            { title: '⏰ 10 min',   pressAction: { id: 'snooze' } },
          ],
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.valueOf(),
        repeatFrequency: repeatDaily ? RepeatFrequency.DAILY : undefined,
      },
    );
  }

  static async cancelMedicineReminders(medicineId: number) {
    const notifications = await notifee.getTriggerNotifications();
    for (const n of notifications) {
      if (n.notification.id?.startsWith(`med_${medicineId}_`)) {
        await notifee.cancelTriggerNotification(n.notification.id);
      }
    }
  }

  static async cancelAll() {
    await notifee.cancelAllNotifications();
  }
}
