package expo.modules.smsreader

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat

private const val TAG = "RaqmSms"

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.d(TAG, "SmsBroadcastReceiver.onReceive fired, action=${intent.action}")
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    Log.d(TAG, "SmsBroadcastReceiver: ${messages.size} message part(s) in this broadcast")
    for (sms in messages) {
      val body = sms.messageBody ?: continue
      val sender = sms.originatingAddress ?: ""
      val timestamp = sms.timestampMillis
      Log.d(TAG, "SmsBroadcastReceiver: forwarding from sender=$sender bodyLen=${body.length}")

      // Forward every SMS to JS — BankParserFactory.isKnownBankSender()/parse() there is
      // the same authoritative sender-based check Re-scan and onboarding scan use. A
      // body-keyword heuristic here used to gate this forward and silently dropped real
      // bank messages worded differently than the keyword list expected (e.g. some
      // transfer SMS formats) — live detection would miss them, though a Re-scan (which
      // reads the inbox directly) still caught them. The heuristic now only decides
      // whether to show Raqm's own heads-up notification, a much lower-stakes miss.
      context.sendBroadcast(
        Intent(NEW_SMS_ACTION).apply {
          `package` = context.packageName
          putExtra("body", body)
          putExtra("sender", sender)
          putExtra("timestamp", timestamp)
        }
      )

      if (looksLikeBankSms(body)) {
        showNotification(context, body, timestamp)
      }
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
