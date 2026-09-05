package expo.modules.smsreader.widget

import androidx.compose.ui.graphics.Color

/**
 * Mirrors src/theme/colors.ts, using exactly the hex values already duplicated in
 * CategoryPickerActivity.kt's companion object — Glance has no access to NativeWind/theme
 * tokens, and no new colors are introduced here. Raqm is dark-only, so there is no light
 * variant.
 */
object WidgetTheme {
  val Surface = Color(0xFF0E1512)
  val SurfaceContainerHigh = Color(0xFF242C28)
  val OnSurface = Color(0xFFDDE4DF)
  val OnSurfaceVariant = Color(0xFFBDCAC0)
  val Primary = Color(0xFF75DAA8)
  val OnPrimary = Color(0xFF0E1512)

  /** The donut/pie slice ramp — the primary green plus tints of it, so the palette stays
   *  inside the existing brand colors rather than inventing new ones. */
  val SliceColors = listOf(
    Color(0xFF75DAA8),
    Color(0xFF4FB98A),
    Color(0xFF3A9670),
    Color(0xFF2C7458),
    Color(0xFF215540),
    Color(0xFF17392B),
  )

  /** The same ramp as ARGB ints. android.graphics.Paint (the donut bitmap) needs ints, and
   *  unpacking Compose's packed-ULong Color by hand is brittle — keep the two lists in sync. */
  val SliceArgb = listOf(
    0xFF75DAA8.toInt(),
    0xFF4FB98A.toInt(),
    0xFF3A9670.toInt(),
    0xFF2C7458.toInt(),
    0xFF215540.toInt(),
    0xFF17392B.toInt(),
  )
}
