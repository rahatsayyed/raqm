package expo.modules.smsreader

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.content.ContextCompat
import com.facebook.react.HeadlessJsTaskService

private val KNOWN_SMS_PACKAGES = setOf(
  "com.google.android.apps.messaging",
  "com.samsung.android.messaging",
  "com.android.mms",
)

private val SENDER_CODE_PATTERN = Regex("\\b[A-Z]{2}-[A-Z0-9]{4,}\\b")

/** How long an identical notification from the same app is treated as a repost, not a new tx. */
private const val REPOST_WINDOW_MS = 60_000L
private const val REPOST_CACHE_MAX = 100

class RaqmNotificationListenerService : NotificationListenerService() {

  // Android reposts a notification whenever the app updates it (progress, grouping,
  // re-ranking) — every repost calls onNotificationPosted again with the same content.
  // Without this guard a single GPay payment could be inserted several times. Keyed on
  // package+title+text rather than sbn.key, because some apps recycle keys and others
  // mint a new one per update.
  private val recentlyForwarded = LinkedHashMap<String, Long>()

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    super.onNotificationPosted(sbn)

    try {
      val extras = sbn.notification.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
      val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

      if (sbn.packageName in KNOWN_SMS_PACKAGES) {
        if (looksLikeBankNotification(title, text, bigText)) {
          cancelNotification(sbn.key)
        }
        return
      }

      forwardIfMonitored(sbn, title, text.ifBlank { bigText })
    } catch (e: Exception) {
      // Never crash the listener — Android revokes notification access on crash
    }
  }

  private fun forwardIfMonitored(sbn: StatusBarNotification, title: String, text: String) {
    if (sbn.packageName !in MonitoredApps.get(this)) return

    // Group summaries repeat their children's text; ongoing notifications are progress
    // indicators, not events. Neither is a transaction.
    val flags = sbn.notification.flags
    if (flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    if (flags and Notification.FLAG_ONGOING_EVENT != 0) return
    if (title.isBlank() && text.isBlank()) return

    val dedupKey = "${sbn.packageName}|$title|$text"
    val now = System.currentTimeMillis()
    pruneRecentlyForwarded(now)
    if (recentlyForwarded.containsKey(dedupKey)) return
    recentlyForwarded[dedupKey] = now

    DiagnosticLog.write(this, "notifsrc.captured", "pkg=${sbn.packageName}")

    val intent = Intent(this, HeadlessSmsTaskService::class.java).apply {
      putExtra("task", "NotificationBackgroundTask")
      putExtra("packageName", sbn.packageName)
      putExtra("title", title)
      putExtra("text", text)
      putExtra("timestamp", sbn.postTime)
      putExtra("appWasForeground", AppProcess.isForeground(this@RaqmNotificationListenerService))
    }

    try {
      if (AppProcess.isForeground(this)) {
        startService(intent)
      } else {
        ContextCompat.startForegroundService(this, intent)
      }
      HeadlessJsTaskService.acquireWakeLockNow(this)
    } catch (e: IllegalStateException) {
      // The foreground check can race with the app being backgrounded a moment later —
      // fall back to the always-safe foreground-service path rather than dropping it.
      try {
        intent.putExtra("appWasForeground", false)
        ContextCompat.startForegroundService(this, intent)
        HeadlessJsTaskService.acquireWakeLockNow(this)
      } catch (e2: Exception) {
        DiagnosticLog.write(this, "notifsrc.forward_failed", "pkg=${sbn.packageName} ${e2.javaClass.simpleName}")
      }
    } catch (e: Exception) {
      DiagnosticLog.write(this, "notifsrc.forward_failed", "pkg=${sbn.packageName} ${e.javaClass.simpleName}")
    }
  }

  private fun pruneRecentlyForwarded(now: Long) {
    val iterator = recentlyForwarded.entries.iterator()
    while (iterator.hasNext()) {
      if (now - iterator.next().value > REPOST_WINDOW_MS) iterator.remove() else break
    }
    while (recentlyForwarded.size > REPOST_CACHE_MAX) {
      val oldest = recentlyForwarded.keys.firstOrNull() ?: break
      recentlyForwarded.remove(oldest)
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
