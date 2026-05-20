package com.medisaan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String medicine = intent.getStringExtra("medicine");
        String scheduledTime = intent.getStringExtra("scheduledTime");

        Log.d("MediSaaN", "Native Alarm Fired! ID: " + id);

        // Play looping native alarm sound immediately on receive
        MediSaaNNativeModule.startAlarmSoundStatic(context);

        // 1. Ensure notification channel exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "medisaan_alarms",
                "Critical Medicine Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Critical Medicine Alarms Channel");
            
            // Set sound explicitly for high-priority full-screen intent trigger
            Uri defaultAlarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (defaultAlarmUri == null) {
                defaultAlarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(defaultAlarmUri, audioAttributes);
            
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 250, 500});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }

        // 2. Create the full-screen Intent pointing to MainActivity
        Intent activityIntent = new Intent(context, MainActivity.class);
        activityIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        activityIntent.putExtra("isAlarmTrigger", true);
        activityIntent.putExtra("id", id);
        activityIntent.putExtra("title", title);
        activityIntent.putExtra("body", body);
        activityIntent.putExtra("medicine", medicine);
        activityIntent.putExtra("scheduledTime", scheduledTime);

        // Attempt to launch activity to foreground automatically
        try {
            context.startActivity(activityIntent);
        } catch (Exception e) {
            Log.e("MediSaaN", "Failed to start MainActivity automatically from background: " + e.getMessage());
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }

        int requestCode = id != null ? id.hashCode() : (int) System.currentTimeMillis();
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            activityIntent,
            flags
        );

        // 3. Build and display the high priority full-screen notification
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, "medisaan_alarms");
        } else {
            builder = new Notification.Builder(context);
        }

        int iconId = context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName());
        if (iconId == 0) {
            iconId = android.R.drawable.ic_lock_idle_alarm;
        }

        builder.setSmallIcon(iconId)
            .setContentTitle(title != null ? title : "Medicine Alarm")
            .setContentText(body != null ? body : "Time to take your medicine")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVibrate(new long[]{0, 500, 250, 500})
            .setVisibility(Notification.VISIBILITY_PUBLIC);

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(requestCode, builder.build());
        }
    }
}
