package expo.modules.smsreader

import android.content.Context

/**
 * Native-readable mirror of the JS `month_start_day` setting (canonically stored in the
 * app_settings SQLite table, written from MoreScreen). Same pattern as MonitoredApps: the
 * widget refresh path runs in a process with no JS engine and must not open a second SQLite
 * connection just to read one integer. Defaults to 1 when absent, matching budgets.ts's own
 * `startDayStr ? Number(startDayStr) : 1` fallback. Clamped 1..28 exactly like
 * src/utils/period.ts's getMonthBounds.
 */
object MonthStartDay {
  private const val PREFS = "raqm_period"
  private const val KEY_DAY = "month_start_day"

  fun set(context: Context, day: Int) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putInt(KEY_DAY, day.coerceIn(1, 28))
      .apply()
  }

  fun get(context: Context): Int =
    try {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getInt(KEY_DAY, 1)
        .coerceIn(1, 28)
    } catch (e: Exception) {
      1
    }
}
