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

public class MediSaaNNativeModule extends ReactContextBaseJavaModule {
    private SpeechRecognizer speechRecognizer;
    private Intent speechRecognizerIntent;

    MediSaaNNativeModule(ReactApplicationContext context) {
        super(context);
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

    @ReactMethod
    public void scheduleAlarm(String id, double timestamp, String title, String body, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("id", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);

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
