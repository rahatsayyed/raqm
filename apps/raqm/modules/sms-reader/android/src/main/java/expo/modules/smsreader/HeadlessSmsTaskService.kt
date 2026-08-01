package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

private const val CHANNEL_ID = "raqm_sms_processing"
private const val FOREGROUND_NOTIFICATION_ID = 9001
private const val TASK_TIMEOUT_MS = 30_000L

/**
 * Runs the JS-side "SmsBackgroundTask" (registered in index.ts) whenever
 * SmsBroadcastReceiver starts this service — the ONLY reliable way to process a bank SMS
 * once Android has killed the app's process. If the app's own JS instance is already
 * alive (foreground or not-yet-killed background), React Native reuses that instance
 * instead of spinning up a second one, so this is also the sole processing path when the
 * app is running — there is no separate/duplicate "live" path anymore (see
 * SmsBroadcastReceiver's comment for why that old dual-path design was retired).
 */
class HeadlessSmsTaskService : HeadlessJsTaskService() {

  // Starting a Service via startForegroundService requires calling startForeground()
  // within a few seconds or the system kills the app — this satisfies that requirement
  // with a MIN-importance, silent notification that shouldn't surface to the user.
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java)
      if (manager.getNotificationChannel(CHANNEL_ID) == null) {
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Background processing", NotificationManager.IMPORTANCE_MIN)
        )
      }
      val notification = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("Raqm")
        .setContentText("Analyzing new SMS…")
        .setSmallIcon(android.R.drawable.stat_notify_sync)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setCategory(Notification.CATEGORY_SERVICE)
        .build()
      startForeground(FOREGROUND_NOTIFICATION_ID, notification)
    }
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "SmsBackgroundTask",
      Arguments.fromBundle(extras),
      TASK_TIMEOUT_MS,
      true, // allowedInForeground — lets this run even while the app is in the foreground
    )
  }
}
