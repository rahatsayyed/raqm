package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.HeadlessJsTaskService

private const val TAG = "RaqmSms"

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.d(TAG, "SmsBroadcastReceiver.onReceive fired, action=${intent.action}")
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    for (sms in messages) {
      val body = sms.messageBody ?: continue
      val sender = sms.originatingAddress ?: ""
      val timestamp = sms.timestampMillis
      Log.d(TAG, "starting HeadlessSmsTaskService, sender=$sender")

      // Previously this forwarded a local broadcast to a receiver registered dynamically
      // by SmsReaderModule's OnCreate — which only exists while the app's JS/React
      // context is alive. Once Android kills the process (no foreground service was
      // keeping it around), that receiver doesn't exist and the broadcast went nowhere —
      // exactly why live SMS only worked with the app open. HeadlessJsTaskService boots a
      // JS instance (or reuses the existing one, if the app is already running) to run
      // the "SmsBackgroundTask" registered in index.ts, independent of any mounted screen.
      try {
        val serviceIntent = Intent(context, HeadlessSmsTaskService::class.java).apply {
          putExtra("body", body)
          putExtra("sender", sender)
          putExtra("timestamp", timestamp)
        }
        ContextCompat.startForegroundService(context, serviceIntent)
        HeadlessJsTaskService.acquireWakeLockNow(context)
      } catch (e: Exception) {
        Log.e(TAG, "failed to start HeadlessSmsTaskService", e)
      }
    }
  }
}
