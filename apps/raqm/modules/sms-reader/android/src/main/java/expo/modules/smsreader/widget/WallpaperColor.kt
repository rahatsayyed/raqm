package expo.modules.smsreader.widget

import android.app.WallpaperManager
import android.content.Context
import android.os.Build
import androidx.compose.ui.graphics.Color
import expo.modules.smsreader.DiagnosticLog

/**
 * Best-effort dominant wallpaper color, using Android's own wallpaper color extraction
 * (WallpaperManager.getWallpaperColors, added API 27) — the same system-provided analysis
 * that powers Material You's dynamic theming, but available without requiring Android 12+ or
 * a launcher that supports dynamic color. Never throws — a locked-down device, no wallpaper
 * permission, or a live wallpaper that can't be sampled all fall back to null, and callers
 * (WidgetAppearance) use the static brand color instead. Matches the never-crash invariant
 * every other widget data source in this package follows.
 */
object WallpaperColor {
  fun accent(context: Context): Color? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) return null
    return try {
      val colors = WallpaperManager.getInstance(context)?.getWallpaperColors(WallpaperManager.FLAG_SYSTEM)
      colors?.primaryColor?.toArgb()?.let { Color(it) }
    } catch (e: Exception) {
      DiagnosticLog.write(context, "WallpaperColor", "Could not read wallpaper colors: ${e.message}")
      null
    }
  }
}
