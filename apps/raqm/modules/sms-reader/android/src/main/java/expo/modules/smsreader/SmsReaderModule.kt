package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsReaderModule : Module() {
  // ACTION_SCREEN_OFF is a protected broadcast — it can only be observed by registering a
  // receiver dynamically at runtime (context.registerReceiver), never declared in the
  // manifest. Used to tell App.tsx's re-lock logic apart from a mere background transition:
  // only a real screen-off (device locked) should force re-authentication on next foreground.
  private var screenOffReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    Events("screenLocked")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      if (screenOffReceiver != null) return@OnCreate
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          if (intent.action == Intent.ACTION_SCREEN_OFF) {
            sendEvent("screenLocked")
          }
        }
      }
      screenOffReceiver = receiver
      context.registerReceiver(receiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
    }

    OnDestroy {
      screenOffReceiver?.let { receiver ->
        try {
          appContext.reactContext?.unregisterReceiver(receiver)
        } catch (e: IllegalArgumentException) {
          // Already unregistered (e.g. context torn down first) — safe to ignore.
        }
      }
      screenOffReceiver = null
    }

    AsyncFunction("readInbox") { fromTimestamp: Double, toTimestamp: Double ->
      val context = appContext.reactContext ?: throw Exception("No context available")
      val resolver = context.contentResolver
      val uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(
        Telephony.Sms.BODY,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.DATE,
      )
      val selection = "${Telephony.Sms.DATE} >= ? AND ${Telephony.Sms.DATE} <= ?"
      val selectionArgs = arrayOf(fromTimestamp.toLong().toString(), toTimestamp.toLong().toString())
      val sortOrder = "${Telephony.Sms.DATE} DESC"

      val results = mutableListOf<Map<String, Any>>()
      resolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
        val bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val addressIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (cursor.moveToNext()) {
          results.add(
            mapOf(
              "body" to cursor.getString(bodyIdx),
              "sender" to (cursor.getString(addressIdx) ?: ""),
              "timestamp" to cursor.getLong(dateIdx),
            )
          )
        }
      }
      results
    }

    AsyncFunction("getEarliestMessageDate") {
      val context = appContext.reactContext ?: throw Exception("No context available")
      val resolver = context.contentResolver
      val uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(Telephony.Sms.DATE)
      resolver.query(uri, projection, null, null, "${Telephony.Sms.DATE} ASC")?.use { cursor ->
        if (cursor.moveToFirst()) cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)).toDouble()
        else 0.0
      } ?: 0.0
    }

    Function("openNotificationListenerSettings") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      }
    }

    Function("getNativeLogPath") {
      DiagnosticLog.logFile(appContext.reactContext ?: return@Function "")
        .absolutePath
    }

    // Appends all three tx notification actions — Category, Add note, Not An Expense/Income —
    // to an already-posted notification, entirely natively. expo-notifications' JS category API
    // has no way to point an action's PendingIntent anywhere but the app's launch intent (needed
    // for Category to open CategoryPickerActivity directly instead of MainActivity), and routing
    // Add note/Not An Expense through expo-task-manager to reach JS requires booting a full RN
    // engine from a killed process — exactly the kind of expensive wake-up aggressive OEM battery
    // managers (MIUI, ColorOS, etc.) are most likely to kill mid-flight. All three are handled
    // natively instead: Category by CategoryPickerActivity, the other two by
    // NotificationActionReceiver — both read/write SQLite directly, no JS involved.
    //
    // Mutates the existing Notification object's actions array in place and re-notifies with
    // that SAME object, rather than reconstructing one via Notification.Builder.recoverBuilder —
    // recoverBuilder rebuilds contentIntent/extras from scratch and isn't guaranteed to preserve
    // them faithfully (that's what broke tapping the notification body: the rebuilt contentIntent
    // lost the txId expo-notifications had marshalled into the original extras). Appending in
    // place touches nothing but the actions array, so contentIntent/extras are untouched.
    AsyncFunction("attachTxActions") { notificationId: String, txId: Int, notExpenseLabel: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val nm = context.getSystemService(NotificationManager::class.java) ?: return@AsyncFunction

      // expo-notifications' own scheduleNotification(), for an immediate (trigger: null)
      // notification, hands off to a fire-and-forget CoroutineScope(Dispatchers.IO).launch {}
      // that isn't awaited before the JS scheduleNotificationAsync() promise resolves (see
      // ExpoPresentationDelegate.presentNotification). So the notification this call is meant
      // to attach actions to may not have actually posted to the system yet — poll briefly
      // rather than looking up activeNotifications exactly once and silently no-op'ing.
      var pendingSbn = nm.activeNotifications.firstOrNull { it.tag == notificationId }
      var attempts = 0
      // Up to 20 tries at 45ms (~900ms total) — several SMS arriving close together are
      // processed sequentially (see database.ts's insertParsedTxs invariant), so a later
      // notification's post can take longer than the previous fixed 300ms budget allowed for.
      val pollIntervalMs = 45L
      while (pendingSbn == null && attempts < 20) {
        Thread.sleep(pollIntervalMs)
        pendingSbn = nm.activeNotifications.firstOrNull { it.tag == notificationId }
        attempts++
      }
      val sbn = pendingSbn
      if (sbn == null) {
        Log.e("SmsReaderModule", "attachTxActions: notification $notificationId never appeared after ${attempts * pollIntervalMs}ms")
        DiagnosticLog.write(context, "notif.actions_attached", "failed txId=$txId notificationId=$notificationId waitedMs=${attempts * pollIntervalMs}")
        return@AsyncFunction
      }
      DiagnosticLog.write(context, "notif.actions_attached", "success txId=$txId notificationId=$notificationId")

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
}
