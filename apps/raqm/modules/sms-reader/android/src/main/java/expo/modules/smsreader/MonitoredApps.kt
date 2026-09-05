package expo.modules.smsreader

import android.content.Context

/**
 * The set of app package names whose notifications should be turned into transactions.
 * Written by JS (SmsReaderModule.setMonitoredNotificationPackages) whenever the user
 * changes the app picker; read by RaqmNotificationListenerService on every posted
 * notification.
 *
 * SharedPreferences rather than the app's SQLite database on purpose: the listener runs
 * on every notification from every app on the device and must be cheap and, above all,
 * must never throw (Android revokes notification access on crash). An empty set means the
 * feature is off — which is also the default, so a user who never opts in pays one
 * in-memory prefs lookup and nothing more.
 */
object MonitoredApps {
  private const val PREFS = "raqm_notification_source"
  private const val KEY_PACKAGES = "monitored_packages"

  fun set(context: Context, packages: List<String>) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putStringSet(KEY_PACKAGES, packages.toSet())
      .apply()
  }

  fun get(context: Context): Set<String> =
    try {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getStringSet(KEY_PACKAGES, emptySet()) ?: emptySet()
    } catch (e: Exception) {
      emptySet()
    }
}
