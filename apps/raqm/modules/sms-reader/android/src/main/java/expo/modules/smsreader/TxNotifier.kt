package expo.modules.smsreader

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import java.util.UUID

private const val TX_CHANNEL_ID = "raqm-tx"

/**
 * Builds and posts one of Raqm's own "₹500 at Swiggy" transaction notifications — Category /
 * Add note / Not An Expense-Income actions included from the very first post.
 *
 * This used to be posted through expo-notifications, then patched with actions afterward
 * (first via a bounded poll, later a poll racing a NotificationListenerService callback) —
 * because expo-notifications' native post is a fire-and-forget coroutine that resolves the JS
 * promise before the notification is actually visible to NotificationManager, there was always
 * a window, however small, where the buttons were visibly missing. "Always there, instantly"
 * only an atomic single post can guarantee — so this builds the complete notification, content
 * and actions together, and calls notify() exactly once. No polling, no race, no delay.
 *
 * Tapping the notification body deep-links via the same QuickAdd.mainActivityIntent channel
 * already used by widgets/shortcuts/the launcher (drained by attachDeepLinkHandler in
 * deepLinks.ts), rather than expo-notifications' own response listener — this notification is
 * never posted through expo-notifications for it to recognize.
 */
object TxNotifier {
  fun post(
    context: Context,
    title: String,
    body: String,
    colorHex: String?,
    txId: Int,
    notExpenseLabel: String,
  ): String {
    val notificationId = UUID.randomUUID().toString()

    try {
      return postInternal(context, title, body, colorHex, txId, notExpenseLabel, notificationId)
    } catch (e: Exception) {
      DiagnosticLog.write(context, "notif.actions_attached", "failed txId=$txId ${e.javaClass.simpleName}")
      return ""
    }
  }

  private fun postInternal(
    context: Context,
    title: String,
    body: String,
    colorHex: String?,
    txId: Int,
    notExpenseLabel: String,
    notificationId: String,
  ): String {
    // notification_icon is generated into the *app* module's res/ by expo-notifications' config
    // plugin (app.json), not this library module's — so it can't be referenced via this
    // module's own R class and has to be looked up by name at runtime. Falls back to a stock
    // system icon (same fallback already used in HeadlessSmsTaskService.kt) if that ever fails.
    val iconRes = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      .takeIf { it != 0 } ?: android.R.drawable.stat_notify_sync

    val contentIntent = QuickAdd.mainActivityPendingIntent(context, notificationId.hashCode(), false, txId)

    val builder = NotificationCompat.Builder(context, TX_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(iconRes)
      .setAutoCancel(true)
      .setContentIntent(contentIntent)

    if (colorHex != null) {
      try {
        builder.color = Color.parseColor(colorHex)
      } catch (e: IllegalArgumentException) {
        // Bad color string — post without one rather than drop the whole notification.
      }
    }

    val categoryIntent = Intent(context, CategoryPickerActivity::class.java).apply {
      putExtra(CategoryPickerActivity.EXTRA_TX_ID, txId)
      putExtra(CategoryPickerActivity.EXTRA_NOTIFICATION_TAG, notificationId)
      putExtra(CategoryPickerActivity.EXTRA_NOTIFICATION_INT_ID, 0)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    val categoryPendingIntent = PendingIntent.getActivity(
      context,
      notificationId.hashCode(),
      categoryIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    builder.addAction(0, "Category", categoryPendingIntent)

    fun receiverIntent(action: String) = Intent(context, NotificationActionReceiver::class.java).apply {
      this.action = action
      putExtra(NotificationActionReceiver.EXTRA_TX_ID, txId)
      putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_TAG, notificationId)
      putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_INT_ID, 0)
    }

    val notExpensePendingIntent = PendingIntent.getBroadcast(
      context,
      (notificationId + "notexpense").hashCode(),
      receiverIntent(NotificationActionReceiver.ACTION_NOT_EXPENSE),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    builder.addAction(0, notExpenseLabel, notExpensePendingIntent)

    // RemoteInput requires a mutable PendingIntent from API 31 onward — matches
    // expo-notifications' own conditional (NotificationsService.createNotificationResponseIntent).
    val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    val addNotePendingIntent = PendingIntent.getBroadcast(
      context,
      (notificationId + "addnote").hashCode(),
      receiverIntent(NotificationActionReceiver.ACTION_ADD_NOTE),
      PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag,
    )
    val remoteInput = RemoteInput.Builder(NotificationActionReceiver.EXTRA_NOTE_INPUT)
      .setLabel("Add a note…")
      .build()
    val addNoteAction = NotificationCompat.Action.Builder(0, "Add note", addNotePendingIntent)
      .addRemoteInput(remoteInput)
      .build()
    builder.addAction(addNoteAction)

    NotificationManagerCompat.from(context).notify(notificationId, 0, builder.build())
    DiagnosticLog.write(context, "notif.actions_attached", "success txId=$txId notificationId=$notificationId via=atomic")
    return notificationId
  }

  fun cancel(context: Context, notificationId: String) {
    NotificationManagerCompat.from(context).cancel(notificationId, 0)
  }
}
