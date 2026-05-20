package com.medisaan

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)

    // Check if launched by native alarm
    val intent = intent
    if (intent != null && intent.getBooleanExtra("isAlarmTrigger", false)) {
      val id = intent.getStringExtra("id")
      val medicine = intent.getStringExtra("medicine")
      val scheduledTime = intent.getStringExtra("scheduledTime")
      com.medisaan.MediSaaNNativeModule.triggerAlarmEvent(id, medicine, scheduledTime)
    }

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguardManager = getSystemService(android.content.Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
      keyguardManager.requestDismissKeyguard(this, null)
    } else {
      window.addFlags(
        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)

    if (intent != null && intent.getBooleanExtra("isAlarmTrigger", false)) {
      val id = intent.getStringExtra("id")
      val medicine = intent.getStringExtra("medicine")
      val scheduledTime = intent.getStringExtra("scheduledTime")
      com.medisaan.MediSaaNNativeModule.triggerAlarmEvent(id, medicine, scheduledTime)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MediSaaN"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
