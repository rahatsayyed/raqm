package expo.modules.smsreader.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView

/**
 * Standard Android "widget configuration" screen: launched by the system when a widget is
 * added, or later via the launcher's "Edit widget" (each widget XML declares
 * widgetFeatures="configuration_optional" so configuring is never mandatory before placement).
 * Lets the user set that one widget instance's background opacity and whether it tints toward
 * the current wallpaper's dominant color (WallpaperColor) or the static brand color.
 *
 * Same visual pattern as CategoryPickerActivity: a bottom-anchored translucent card built from
 * plain Views with hardcoded hex colors mirroring WidgetTheme — Glance's Compose colors aren't
 * reachable from a plain Activity.
 */
class WidgetConfigActivity : Activity() {
  private var appWidgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)

    appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
    window.setGravity(Gravity.BOTTOM)
    window.setDimAmount(0f)
    setContentView(buildContent())
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private fun buildContent(): View {
    val scrim = FrameLayout(this).apply {
      layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
      setBackgroundColor(Color.parseColor("#99000000"))
      isClickable = true
      setOnClickListener { finish() }
    }

    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      isClickable = true
      setOnClickListener { /* swallow taps on the card so they don't fall through to the scrim */ }
      background = GradientDrawable().apply {
        setColor(Color.parseColor(COLOR_SURFACE))
        cornerRadii = floatArrayOf(
          dp(20).toFloat(), dp(20).toFloat(),
          dp(20).toFloat(), dp(20).toFloat(),
          0f, 0f, 0f, 0f,
        )
      }
      setPadding(dp(20), dp(20), dp(20), dp(28))
    }

    card.addView(
      TextView(this).apply {
        text = "Widget appearance"
        setTextColor(Color.parseColor(COLOR_ON_SURFACE))
        textSize = 18f
      },
    )

    val currentOpacity = WidgetPrefs.getOpacity(this, appWidgetId)

    val opacityLabel = TextView(this).apply {
      text = "Background opacity: $currentOpacity%"
      setTextColor(Color.parseColor(COLOR_ON_SURFACE_VARIANT))
      setPadding(0, dp(16), 0, dp(4))
    }
    card.addView(opacityLabel)

    val seekBar = SeekBar(this).apply {
      max = MAX_OPACITY - MIN_OPACITY
      progress = (currentOpacity - MIN_OPACITY).coerceIn(0, MAX_OPACITY - MIN_OPACITY)
      setOnSeekBarChangeListener(
        object : SeekBar.OnSeekBarChangeListener {
          override fun onProgressChanged(bar: SeekBar?, progress: Int, fromUser: Boolean) {
            opacityLabel.text = "Background opacity: ${progress + MIN_OPACITY}%"
          }
          override fun onStartTrackingTouch(bar: SeekBar?) {}
          override fun onStopTrackingTouch(bar: SeekBar?) {}
        },
      )
    }
    card.addView(seekBar)

    val wallpaperSwitch = Switch(this).apply {
      isChecked = WidgetPrefs.getUseWallpaperColor(this@WidgetConfigActivity, appWidgetId)
    }
    val wallpaperRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(12), 0, dp(4))
      addView(
        TextView(this@WidgetConfigActivity).apply {
          text = "Match wallpaper color"
          setTextColor(Color.parseColor(COLOR_ON_SURFACE))
          layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        },
      )
      addView(wallpaperSwitch)
    }
    card.addView(wallpaperRow)

    val saveButton = Button(this).apply {
      text = "Save"
      isAllCaps = false
      setTextColor(Color.parseColor(COLOR_ON_PRIMARY))
      background = GradientDrawable().apply {
        setColor(Color.parseColor(COLOR_PRIMARY))
        cornerRadius = dp(12).toFloat()
      }
      setPadding(dp(16), dp(10), dp(16), dp(10))
      setOnClickListener {
        val opacity = seekBar.progress + MIN_OPACITY
        WidgetPrefs.setOpacity(this@WidgetConfigActivity, appWidgetId, opacity)
        WidgetPrefs.setUseWallpaperColor(this@WidgetConfigActivity, appWidgetId, wallpaperSwitch.isChecked)
        WidgetRefresh.refreshOne(this@WidgetConfigActivity, appWidgetId)

        val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(RESULT_OK, resultValue)
        finish()
      }
    }
    val buttonParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      topMargin = dp(20)
      gravity = Gravity.END
    }
    card.addView(saveButton, buttonParams)

    val cardParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      gravity = Gravity.BOTTOM
    }
    scrim.addView(card, cardParams)
    return scrim
  }

  companion object {
    private const val MIN_OPACITY = 10
    private const val MAX_OPACITY = 100
    private const val COLOR_SURFACE = "#0e1512"
    private const val COLOR_ON_SURFACE = "#dde4df"
    private const val COLOR_ON_SURFACE_VARIANT = "#bdcac0"
    private const val COLOR_PRIMARY = "#75daa8"
    private const val COLOR_ON_PRIMARY = "#0e1512"
  }
}
