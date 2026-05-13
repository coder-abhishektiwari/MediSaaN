package com.medisaan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // Just route to MainActivity, since that has our wake screen flags
        // In a real app we'd pass the notification ID and show a full screen
        Intent activityIntent = new Intent(context, MainActivity.class);
        activityIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        // Pass alarm data to MainActivity so React Native can handle it
        activityIntent.putExtras(intent);
        
        context.startActivity(activityIntent);
        Log.d("MediSaaN", "Native Alarm Fired! Launching MainActivity");
    }
}
