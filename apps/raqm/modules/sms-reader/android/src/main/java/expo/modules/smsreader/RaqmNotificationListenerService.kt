package expo.modules.smsreader

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

private val KNOWN_SMS_PACKAGES = setOf(
  "com.google.android.apps.messaging",
  "com.samsung.android.messaging",
  "com.android.mms",
)

private val SENDER_CODE_PATTERN = Regex("\\b[A-Z]{2}-[A-Z0-9]{4,}\\b")

class RaqmNotificationListenerService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    super.onNotificationPosted(sbn)

    try {
      if (sbn.packageName !in KNOWN_SMS_PACKAGES) return

      val extras = sbn.notification.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
      val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

      if (looksLikeBankNotification(title, text, bigText)) {
        cancelNotification(sbn.key)
      }
    } catch (e: Exception) {
      // Never crash the listener — Android revokes notification access on crash
    }
  }

  private fun looksLikeBankNotification(title: String, text: String, bigText: String): Boolean {
    val combined = "$title $text $bigText"
    // Note: MessagingStyle EXTRA_MESSAGES parsing not implemented (documented limitation)
    // Note: Group-summary notifications are not specially handled
    val lower = combined.lowercase()

    val hasBankKeyword = lower.contains("debited") ||
      lower.contains("credited") ||
      lower.contains("a/c") ||
      lower.contains("acct") ||
      lower.contains("upi") ||
      lower.contains("neft") ||
      lower.contains("imps")

    val hasSenderCodePattern = SENDER_CODE_PATTERN.containsMatchIn(combined)

    return hasBankKeyword || hasSenderCodePattern
  }
}
