package expo.modules.smsreader.widget

import android.content.Context

/**
 * Per-widget-instance appearance settings, keyed by appWidgetId so two copies of the same
 * widget can look different. Written by WidgetConfigActivity, read by each widget's
 * provideGlance via WidgetAppearance. Cleared on onDeleted so removed widgets don't leave
 * stale entries behind.
 */
object WidgetPrefs {
  private const val PREFS_NAME = "widget_prefs"
  private const val DEFAULT_OPACITY = 90
  // Floor at 10 so a widget can never be configured fully invisible-and-untappable.
  private const val MIN_OPACITY = 10
  private const val MAX_OPACITY = 100

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun getOpacity(context: Context, appWidgetId: Int): Int =
    prefs(context).getInt("opacity_$appWidgetId", DEFAULT_OPACITY)

  fun setOpacity(context: Context, appWidgetId: Int, value: Int) {
    prefs(context).edit().putInt("opacity_$appWidgetId", value.coerceIn(MIN_OPACITY, MAX_OPACITY)).apply()
  }

  fun getUseWallpaperColor(context: Context, appWidgetId: Int): Boolean =
    prefs(context).getBoolean("wallpaper_$appWidgetId", true)

  fun setUseWallpaperColor(context: Context, appWidgetId: Int, value: Boolean) {
    prefs(context).edit().putBoolean("wallpaper_$appWidgetId", value).apply()
  }

  fun clear(context: Context, appWidgetId: Int) {
    prefs(context).edit().remove("opacity_$appWidgetId").remove("wallpaper_$appWidgetId").apply()
  }
}
