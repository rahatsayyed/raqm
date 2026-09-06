package expo.modules.smsreader.widget

import android.content.Context
import androidx.compose.ui.graphics.Color

/**
 * The one place that turns a widget's per-instance settings (WidgetPrefs) into the actual
 * background Color each widget's Content() draws — so the four widget files each need only
 * one call here instead of duplicating the "wallpaper color, or fall back to brand color, then
 * apply opacity" logic four times.
 */
object WidgetAppearance {
  fun background(context: Context, appWidgetId: Int): Color {
    val base = if (WidgetPrefs.getUseWallpaperColor(context, appWidgetId)) {
      WallpaperColor.accent(context) ?: WidgetTheme.Surface
    } else {
      WidgetTheme.Surface
    }
    val opacity = WidgetPrefs.getOpacity(context, appWidgetId) / 100f
    return base.copy(alpha = opacity)
  }
}
