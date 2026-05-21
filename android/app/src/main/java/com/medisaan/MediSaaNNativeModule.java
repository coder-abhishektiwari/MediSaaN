package com.medisaan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.os.Bundle;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import android.media.MediaPlayer;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

public class MediSaaNNativeModule extends ReactContextBaseJavaModule {
    private static MediaPlayer mediaPlayer = null;
    private SpeechRecognizer speechRecognizer;
    private Intent speechRecognizerIntent;

    public static String initialAlarmId = null;
    public static String initialAlarmMedicine = null;
    public static String initialAlarmScheduledTime = null;
    public static String initialVolumeShortcutAction = null;
    private static ReactApplicationContext reactContext = null;

    MediSaaNNativeModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "MediSaaNNativeModule";
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Context context = getCurrentActivity();
            if (context == null) context = getReactApplicationContext();
            promise.resolve(Settings.canDrawOverlays(context));
        } else {
            promise.resolve(true);
        }
    }

    public static void startAlarmSoundStatic(Context context) {
        try {
            if (mediaPlayer != null) {
                try {
                    mediaPlayer.stop();
                    mediaPlayer.release();
                } catch (Exception e) {}
                mediaPlayer = null;
            }
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            if (alarmUri != null) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(context, alarmUri);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build());
                } else {
                    mediaPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
                }
                mediaPlayer.setLooping(true);
                mediaPlayer.prepare();
                mediaPlayer.start();
            }
        } catch (Exception e) {
            android.util.Log.e("MediSaaN", "Failed to start static alarm sound: " + e.getMessage());
        }
    }

    @ReactMethod
    public void startAlarmSound(Promise promise) {
        try {
            Context context = getCurrentActivity();
            if (context == null) context = getReactApplicationContext();
            startAlarmSoundStatic(context);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SOUND_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopAlarmSound(Promise promise) {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SOUND_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scheduleAlarm(String id, double timestamp, String title, String body, String medicineJson, String scheduledTime, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("id", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("medicine", medicineJson);
            intent.putExtra("scheduledTime", scheduledTime);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id.hashCode(), intent, flags);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, (long) timestamp, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, (long) timestamp, pendingIntent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ALARM_ERROR", e.getMessage());
        }
    }

    public static void triggerAlarmEvent(String id, String medicineJson, String scheduledTime) {
        initialAlarmId = id;
        initialAlarmMedicine = medicineJson;
        initialAlarmScheduledTime = scheduledTime;

        if (reactContext != null) {
            try {
                WritableMap map = Arguments.createMap();
                map.putString("id", id);
                map.putString("medicine", medicineJson);
                map.putString("scheduledTime", scheduledTime);
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onAlarmTriggered", map);
            } catch (Exception e) {
                // React Context may not be initialized yet
            }
        }
    }

    public static void triggerVolumeShortcutEvent(String action) {
        initialVolumeShortcutAction = action;
        if (reactContext != null) {
            try {
                WritableMap map = Arguments.createMap();
                map.putString("action", action);
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onVolumeShortcut", map);
            } catch (Exception e) {
                // React Context may not be initialized yet
            }
        }
    }

    @ReactMethod
    public void getInitialAlarm(Promise promise) {
        if (initialAlarmId != null) {
            WritableMap map = Arguments.createMap();
            map.putString("id", initialAlarmId);
            map.putString("medicine", initialAlarmMedicine);
            map.putString("scheduledTime", initialAlarmScheduledTime);

            // Clear immediately on read
            initialAlarmId = null;
            initialAlarmMedicine = null;
            initialAlarmScheduledTime = null;

            promise.resolve(map);
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void getInitialVolumeShortcut(Promise promise) {
        if (initialVolumeShortcutAction != null) {
            WritableMap map = Arguments.createMap();
            map.putString("action", initialVolumeShortcutAction);
            initialVolumeShortcutAction = null;
            promise.resolve(map);
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void showTimePicker(int initialHour, int initialMinute, Promise promise) {
        android.app.Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Current Activity is null");
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    android.app.TimePickerDialog timePickerDialog = new android.app.TimePickerDialog(
                        activity,
                        new android.app.TimePickerDialog.OnTimeSetListener() {
                            @Override
                            public void onTimeSet(android.widget.TimePicker view, int hourOfDay, int minute) {
                                WritableMap map = Arguments.createMap();
                                map.putInt("hour", hourOfDay);
                                map.putInt("minute", minute);
                                promise.resolve(map);
                            }
                        },
                        initialHour,
                        initialMinute,
                        android.text.format.DateFormat.is24HourFormat(activity)
                    );
                    timePickerDialog.show();
                } catch (Exception e) {
                    promise.reject("TIME_PICKER_ERROR", e.getMessage());
                }
            }
        });
    }

    @ReactMethod
    public void clearInitialAlarm(Promise promise) {
        initialAlarmId = null;
        initialAlarmMedicine = null;
        initialAlarmScheduledTime = null;
        promise.resolve(true);
    }

    @ReactMethod
    public void startVoiceRecognition(String locale, Promise promise) {
        getCurrentActivity().runOnUiThread(() -> {
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getReactApplicationContext());
                
                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) {}
                    @Override public void onBeginningOfSpeech() {}
                    @Override public void onRmsChanged(float rmsdB) {}
                    @Override public void onBufferReceived(byte[] buffer) {}
                    @Override public void onEndOfSpeech() {}
                    @Override public void onError(int error) {
                        WritableMap map = Arguments.createMap();
                        map.putString("error", "Error code: " + error);
                        getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onVoiceError", map);
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            WritableMap map = Arguments.createMap();
                            map.putString("text", matches.get(0));
                            getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit("onVoiceResult", map);
                        }
                    }
                    @Override public void onPartialResults(Bundle partialResults) {}
                    @Override public void onEvent(int eventType, Bundle params) {}
                });
            }
            
            speechRecognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            speechRecognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            speechRecognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale); 
            speechRecognizer.startListening(speechRecognizerIntent);
            promise.resolve(true);
        });
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    public void stopVoiceRecognition(Promise promise) {
        getCurrentActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
            promise.resolve(true);
        });
    }
}
