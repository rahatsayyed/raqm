package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.StatusBarNotification
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

private data class PendingAttach(val txId: Int, val notExpenseLabel: String)

/**
 * Attaches the Category / Add note / Not An Expense actions to one of Raqm's own tx
 * notifications.
 *
 * The notification is posted by expo-notifications, whose native post is a fire-and-forget
 * coroutine not awaited before the JS promise resolves (see SmsReaderModule.attachTxActions) —
 * so there's no guarantee the notification is visible in NotificationManager the instant JS
 * asks to attach actions to it. This used to be handled with a single bounded poll
 * (Thread.sleep loop, ~1.35s ceiling) that permanently gave up whenever the real post lagged
 * past that ceiling — exactly what kept showing up in the field as "the notification buttons
 * are missing," recurring under load (see diagnostic logs' repeated
 * `notif.actions_attached failed ... waitedMs=1350`).
 *
 * Now two paths race to attach, and whichever gets there first wins via the atomic
 * [pending] removal below — the other becomes a no-op:
 *  - RaqmNotificationListenerService.onNotificationPosted fires the instant Android actually
 *    posts the notification (near-instant whenever the user has granted Notification access,
 *    which most users already have for the notification-tx-source feature).
 *  - SmsReaderModule.attachTxActions' poll loop remains as a fallback for users without that
 *    permission granted, or the rare case the listener callback itself lags.
 */
object TxActionAttacher {
  private val pending = ConcurrentHashMap<String, PendingAttach>()

  fun register(notificationId: String, txId: Int, notExpenseLabel: String) {
    pending[notificationId] = PendingAttach(txId, notExpenseLabel)
  }

  /**
   * Attaches now if [notificationId] is still pending and posted. Returns true once resolved —
   * either attached by this call, already attached by the other path, or never registered.
   * Returns false only to mean "still pending, not posted yet" (the poll loop's cue to keep
   * waiting).
   */
  fun tryAttach(
    context: Context,
    notificationId: String,
    via: String,
    sbn: StatusBarNotification? = null,
  ): Boolean {
    if (!pending.containsKey(notificationId)) return true
    val nm = context.getSystemService(NotificationManager::class.java) ?: return true
    val target = sbn ?: nm.activeNotifications.firstOrNull { it.tag == notificationId } ?: return false
    val req = pending.remove(notificationId) ?: return true // the other path won the race
    attach(context, nm, target, notificationId, req.txId, req.notExpenseLabel)
    DiagnosticLog.write(
      context,
      "notif.actions_attached",
      "success txId=${req.txId} notificationId=$notificationId via=$via",
    )
    return true
  }

  /** Called by the poll loop once it exhausts its attempts. No-op if the other path already won. */
  fun giveUp(context: Context, notificationId: String, txId: Int, waitedMs: Long) {
    if (pending.remove(notificationId) == null) return
    Log.e("SmsReaderModule", "attachTxActions: notification $notificationId never appeared after ${waitedMs}ms")
    DiagnosticLog.write(context, "notif.actions_attached", "failed txId=$txId notificationId=$notificationId waitedMs=$waitedMs")
  }

  private fun attach(
    context: Context,
    nm: NotificationManager,
    sbn: StatusBarNotification,
    notificationId: String,
    txId: Int,
    notExpenseLabel: String,
  ) {
    val categoryIntent = Intent(context, CategoryPickerActivity::class.java).apply {
      putExtra(CategoryPickerActivity.EXTRA_TX_ID, txId)
      putExtra(CategoryPickerActivity.EXTRA_NOTIFICATION_TAG, sbn.tag)
      putExtra(CategoryPickerActivity.EXTRA_NOTIFICATION_INT_ID, sbn.id)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    val categoryPendingIntent = PendingIntent.getActivity(
      context,
      notificationId.hashCode(),
      categoryIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val categoryAction = Notification.Action.Builder(0, "Category", categoryPendingIntent).build()

    fun receiverIntent(action: String) = Intent(context, NotificationActionReceiver::class.java).apply {
      this.action = action
      putExtra(NotificationActionReceiver.EXTRA_TX_ID, txId)
      putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_TAG, sbn.tag)
      putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_INT_ID, sbn.id)
    }

    val notExpensePendingIntent = PendingIntent.getBroadcast(
      context,
      (notificationId + "notexpense").hashCode(),
      receiverIntent(NotificationActionReceiver.ACTION_NOT_EXPENSE),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notExpenseAction = Notification.Action.Builder(0, notExpenseLabel, notExpensePendingIntent).build()

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
    val addNoteAction = Notification.Action.Builder(0, "Add note", addNotePendingIntent)
      .addRemoteInput(remoteInput)
      .build()

    val notification = sbn.notification
    notification.actions = arrayOf(categoryAction, addNoteAction, notExpenseAction)
    nm.notify(sbn.tag, sbn.id, notification)
  }
}
