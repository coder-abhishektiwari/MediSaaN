package com.medisaan;

import android.provider.Settings;
import android.os.Build;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class OverlayPermissionModule extends ReactContextBaseJavaModule {
    
    OverlayPermissionModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "OverlayPermissionModule";
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(getReactApplicationContext()));
        } else {
            promise.resolve(true); // Always true on older Android versions
        }
    }
}
