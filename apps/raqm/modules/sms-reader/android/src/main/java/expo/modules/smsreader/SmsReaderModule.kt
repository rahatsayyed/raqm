package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.smsreader.widget.WidgetRefresh

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

      // Dynamic (not manifest-static) shortcut, so it needs no build-time manifest entry and
      // could later be hidden behind a setting without a rebuild. pushDynamicShortcut replaces
      // by id, so re-pushing on every app start is idempotent. Wrapped: a shortcut failure
      // must never break module init.
      try {
        val shortcutIntent = context.packageManager
          .getLaunchIntentForPackage(context.packageName)
          ?.apply {
            action = Intent.ACTION_VIEW
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD, true)
          }
        if (shortcutIntent != null) {
          val shortcut = ShortcutInfoCompat.Builder(context, "quick_add_cash")
            .setShortLabel("Add Cash Spend")
            .setLongLabel("Add Cash Spend")
            .setIcon(IconCompat.createWithResource(context, R.drawable.ic_add_cash))
            .setIntent(shortcutIntent)
            .build()
          ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
      } catch (e: Exception) {
        DiagnosticLog.write(context, "error.caught", "pushDynamicShortcut: ${e.message}")
      }
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

    Function("isNotificationListenerEnabled") {
      val context = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    /**
     * Reads (and clears) the quick-add / open-transaction extras from MainActivity's current
     * intent. Called by JS on mount and on every background→active transition (see
     * src/navigation/deepLinks.ts). Clearing is what stops a single shortcut tap from
     * re-navigating on every later foreground — the same trap
     * getLastNotificationResponseAsync has (see notifications.ts).
     */
    Function("consumeLaunchDeepLink") {
      val activity = appContext.currentActivity ?: return@Function null
      val intent = activity.intent ?: return@Function null
      val quickAdd = intent.getBooleanExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD, false)
      val txId = intent.getIntExtra(QuickAdd.EXTRA_OPEN_TRANSACTION, -1)
      if (!quickAdd && txId == -1) return@Function null
      intent.removeExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD)
      intent.removeExtra(QuickAdd.EXTRA_OPEN_TRANSACTION)
      mapOf(
        "openQuickAdd" to quickAdd,
        "openTransaction" to if (txId == -1) null else txId,
      )
    }

    // Mirrors the user's app-picker selection into SharedPreferences, where
    // RaqmNotificationListenerService can read it with no JS engine and no DB open.
    AsyncFunction("setMonitoredNotificationPackages") { packages: List<String> ->
      val context = appContext.reactContext ?: throw Exception("No context available")
      MonitoredApps.set(context, packages)
    }

    /** Mirrors the JS month_start_day setting into SharedPreferences for the widgets. */
    AsyncFunction("setMonthStartDay") { day: Int ->
      val context = appContext.reactContext ?: return@AsyncFunction
      MonthStartDay.set(context, day)
    }

    /** Nudges every placed home-screen widget to recompose. Never throws (see WidgetRefresh). */
    AsyncFunction("refreshWidgets") {
      appContext.reactContext?.let { WidgetRefresh.refreshAll(it) }
    }

    /** Sends a single SMS via the platform SmsManager. Requires SEND_SMS, requested at
     * runtime from JS before this is ever called — throws if the permission isn't granted,
     * so callers (checkAndSendReminders / sendReminderNow) must catch and surface that. */
    AsyncFunction("sendSms") { phoneNumber: String, message: String ->
      val context = appContext.reactContext ?: throw Exception("No context available")
      if (context.checkSelfPermission(android.Manifest.permission.SEND_SMS) !=
          android.content.pm.PackageManager.PERMISSION_GRANTED) {
        throw Exception("SEND_SMS permission not granted")
      }
      // getSystemService(SmsManager::class.java) is API 31+ only; minSdk here is 24, so it
      // must fall back to the deprecated static getter on older devices.
      val smsManager = if (Build.VERSION.SDK_INT >= 31) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
      // A message over one GSM-7 segment (160 chars, or 70 if it has non-GSM-7 characters
      // like ₹ or —) truncates/fails silently with sendTextMessage — divide + multipart send
      // instead so the full reminder text always goes out.
      val parts = smsManager.divideMessage(message)
      smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
    }

    // Launchable, user-visible apps only — the picker is a list the user reads, and the
    // full getInstalledApplications() result is mostly system packages with no launcher
    // entry. Requires QUERY_ALL_PACKAGES (declared in the module's AndroidManifest).
    AsyncFunction("getInstalledApps") {
      val context = appContext.reactContext ?: throw Exception("No context available")
      val pm = context.packageManager
      pm.getInstalledApplications(0)
        .asSequence()
        .filter { it.packageName != context.packageName }
        .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
        .map { info: ApplicationInfo ->
          mapOf(
            "packageName" to info.packageName,
            "appName" to pm.getApplicationLabel(info).toString(),
          )
        }
        .sortedBy { it["appName"]?.lowercase() }
        .toList()
    }

    Function("getNativeLogPath") {
      DiagnosticLog.logFile(appContext.reactContext ?: return@Function "")
        .absolutePath
    }

    // Builds and posts the "₹500 at Swiggy" notification with all three actions — Category,
    // Add note, Not An Expense/Income — attached from the very first post, entirely natively.
    // expo-notifications' JS category API has no way to point an action's PendingIntent
    // anywhere but the app's launch intent (needed for Category to open CategoryPickerActivity
    // directly instead of MainActivity), and routing Add note/Not An Expense through
    // expo-task-manager to reach JS requires booting a full RN engine from a killed process —
    // exactly the kind of expensive wake-up aggressive OEM battery managers (MIUI, ColorOS,
    // etc.) are most likely to kill mid-flight. All three are handled natively instead:
    // Category by CategoryPickerActivity, the other two by NotificationActionReceiver — both
    // read/write SQLite directly, no JS involved. See TxNotifier.kt for why this posts the
    // whole notification in one call rather than posting via expo-notifications and patching
    // actions on afterward (that had an inherent race/delay window; this doesn't).
    AsyncFunction("postTxNotification") { title: String, body: String, color: String?, txId: Int, notExpenseLabel: String ->
      val context = appContext.reactContext ?: return@AsyncFunction ""
      TxNotifier.post(context, title, body, color, txId, notExpenseLabel)
    }

    AsyncFunction("cancelTxNotification") { notificationId: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      TxNotifier.cancel(context, notificationId)
    }
  }
}
