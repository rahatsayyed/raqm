package expo.modules.smsreader

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.core.app.NotificationCompat

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    for (sms in messages) {
      val body = sms.messageBody ?: continue
      val sender = sms.originatingAddress ?: ""
      val timestamp = sms.timestampMillis

      if (!looksLikeBankSms(body)) continue

      showNotification(context, body, timestamp)

      // Forward to the module's dynamic receiver so JS gets an event when app is running
      context.sendBroadcast(
        Intent(NEW_SMS_ACTION).apply {
          `package` = context.packageName
          putExtra("body", body)
          putExtra("sender", sender)
          putExtra("timestamp", timestamp)
        }
      )
    }
  }

  private fun looksLikeBankSms(body: String): Boolean {
    val lower = body.lowercase()
    val hasAmount = lower.contains("rs.") || lower.contains("rs ") ||
        lower.contains("inr") || lower.contains("₹")
    val hasVerb = lower.contains("debited") || lower.contains("credited") ||
        lower.contains("payment") || lower.contains("transferred") ||
        lower.contains("withdrawn") || lower.contains("spent") ||
        lower.contains("upi") || lower.contains("neft") || lower.contains("imps")
    return hasAmount || hasVerb
  }

  private fun showNotification(context: Context, body: String, timestamp: Long) {
    val channelId = "raqm_transactions"
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val channel = NotificationChannel(
      channelId,
      "Transaction Alerts",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Alerts for new bank transactions"
      enableVibration(false)
    }
    nm.createNotificationChannel(channel)

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val pi = PendingIntent.getActivity(
      context, 0, launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val iconResId = context.resources
      .getIdentifier("ic_launcher", "mipmap", context.packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(iconResId)
      .setContentTitle("New bank message")
      .setContentText(body.take(100))
      .setStyle(NotificationCompat.BigTextStyle().bigText(body.take(300)))
      .setContentIntent(pi)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .build()

    nm.notify((timestamp % Int.MAX_VALUE).toInt(), notification)
  }
}
