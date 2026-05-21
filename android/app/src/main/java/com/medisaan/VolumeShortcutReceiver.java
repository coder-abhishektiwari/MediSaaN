package com.medisaan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class VolumeShortcutReceiver extends BroadcastReceiver {
    private static long lastVolumeTime = 0;
    private static String lastVolumeDir = "";
    private static Handler handler = null;
    private static Runnable holdRunnable = null;
    private static final long DOUBLE_PRESS_WINDOW_MS = 700;
    private static final long HOLD_DURATION_MS = 3000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
            return;
        }

        int streamType = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_TYPE", -1);
        if (streamType != AudioManager.STREAM_MUSIC && streamType != AudioManager.STREAM_RING && streamType != AudioManager.STREAM_ALARM && streamType != AudioManager.STREAM_SYSTEM) {
            return;
        }

        int newVolume = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_VALUE", -1);
        int oldVolume = intent.getIntExtra("android.media.EXTRA_PREV_VOLUME_STREAM_VALUE", -1);
        if (newVolume == -1 || oldVolume == -1 || newVolume == oldVolume) {
            return;
        }

        String dir = newVolume > oldVolume ? "up" : "down";
        long now = System.currentTimeMillis();

        if (handler != null && holdRunnable != null) {
            handler.removeCallbacks(holdRunnable);
            holdRunnable = null;
        }

        if (!lastVolumeDir.isEmpty() && !lastVolumeDir.equals(dir) && now - lastVolumeTime < DOUBLE_PRESS_WINDOW_MS) {
            triggerShortcut(context, "quickScan");
            lastVolumeDir = "";
            lastVolumeTime = 0;
            return;
        }

        if ("up".equals(dir)) {
            handler = new Handler(Looper.getMainLooper());
            holdRunnable = () -> {
                triggerShortcut(context, "reportScan");
                lastVolumeDir = "";
                lastVolumeTime = 0;
                holdRunnable = null;
            };
            handler.postDelayed(holdRunnable, HOLD_DURATION_MS);
        }

        lastVolumeDir = dir;
        lastVolumeTime = now;
    }

    private void triggerShortcut(Context context, String action) {
        try {
            Log.d("MediSaaN", "Volume shortcut triggered: " + action);
            Intent activityIntent = new Intent(context, MainActivity.class);
            activityIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            activityIntent.putExtra("volumeShortcutAction", action);
            context.startActivity(activityIntent);
        } catch (Exception e) {
            Log.e("MediSaaN", "Failed to launch MainActivity from volume shortcut", e);
        }
    }
}
