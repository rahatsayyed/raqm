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
  private var isSingleBudgetWidget: Boolean = false
  private var categoryStatuses: List<BudgetStatus> = emptyList()
  private var selectedCategoryId: Int? = null
  private val categoryRowViews = mutableListOf<Pair<Int, TextView>>()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)

    appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    val providerName = try {
      AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId)?.provider?.className
    } catch (e: Exception) {
      null
    }
    isSingleBudgetWidget = providerName == SingleBudgetWidgetReceiver::class.java.name

    window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
    window.setGravity(Gravity.BOTTOM)
    window.setDimAmount(0f)
    setContentView(buildContent())
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private fun rowBackground(selected: Boolean): GradientDrawable = GradientDrawable().apply {
    cornerRadius = dp(12).toFloat()
    if (selected) {
      setColor(Color.parseColor(COLOR_PRIMARY_MUTED))
      setStroke(dp(1), Color.parseColor(COLOR_PRIMARY))
    } else {
      setColor(Color.parseColor(COLOR_SURFACE_VARIANT))
    }
  }

  private fun buildCategoryPicker(): View {
    categoryStatuses = WidgetData.budgetStatuses(this)
    val savedId = WidgetPrefs.getCategoryId(this, appWidgetId)
    selectedCategoryId = categoryStatuses.firstOrNull { it.categoryId == savedId }?.categoryId
      ?: categoryStatuses.firstOrNull()?.categoryId

    val section = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    section.addView(
      TextView(this).apply {
        text = "Choose a budget"
        setTextColor(Color.parseColor(COLOR_ON_SURFACE))
        textSize = 18f
      },
    )

    if (categoryStatuses.isEmpty()) {
      section.addView(
        TextView(this).apply {
          text = "No budgets set up yet — add one in the app first."
          setTextColor(Color.parseColor(COLOR_ON_SURFACE_VARIANT))
          setPadding(0, dp(8), 0, 0)
        },
      )
      return section
    }

    categoryRowViews.clear()
    val list = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(0, dp(8), 0, 0)
    }
    categoryStatuses.forEach { status ->
      val row = TextView(this).apply {
        text = "${status.categoryEmoji}  ${status.categoryName}"
        setTextColor(Color.parseColor(COLOR_ON_SURFACE))
        setPadding(dp(12), dp(10), dp(12), dp(10))
        background = rowBackground(status.categoryId == selectedCategoryId)
        setOnClickListener {
          selectedCategoryId = status.categoryId
          categoryRowViews.forEach { (id, view) -> view.background = rowBackground(id == selectedCategoryId) }
        }
      }
      categoryRowViews.add(status.categoryId to row)
      list.addView(
        row,
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          topMargin = dp(6)
        },
      )
    }
    section.addView(list)
    return section
  }

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

    if (isSingleBudgetWidget) {
      card.addView(buildCategoryPicker())
      card.addView(
        View(this).apply {
          layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)).apply {
            topMargin = dp(4)
            bottomMargin = dp(16)
          }
          setBackgroundColor(Color.parseColor(COLOR_DIVIDER))
        },
      )
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
        if (isSingleBudgetWidget) {
          selectedCategoryId?.let { WidgetPrefs.setCategoryId(this@WidgetConfigActivity, appWidgetId, it) }
        }
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
    private const val COLOR_SURFACE_VARIANT = "#152019"
    private const val COLOR_PRIMARY_MUTED = "#2675daa8"
    private const val COLOR_DIVIDER = "#22bdcac0"
  }
}
