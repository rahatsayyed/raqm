package expo.modules.smsreader.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlin.math.max

/**
 * One budget's spend vs. limit, chosen at add-time in WidgetConfigActivity — unlike
 * BudgetWidget, which always shows every budget with no per-instance configuration.
 * The chosen category id is stored per appWidgetId in WidgetPrefs, same pattern as
 * opacity/wallpaper-color.
 */
class SingleBudgetWidget : GlanceAppWidget() {

  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    val categoryId = WidgetPrefs.getCategoryId(context, appWidgetId)
    val status = if (categoryId >= 0) WidgetData.singleBudgetStatus(context, categoryId) else null
    provideContent { Content(context, status, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, status: BudgetStatus?, appWidgetId: Int) {
    val detailed = LocalSize.current.height >= 100.dp

    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(14.dp)
        .clickable(quickAddAction(context)),
    ) {
      if (status == null) {
        Text(
          text = "No budget selected",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 13.sp),
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
          text = "Edit widget to choose one",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 10.sp),
        )
        return@Column
      }

      Text(
        text = "${status.categoryEmoji} ${status.categoryName}",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
        ),
        maxLines = 1,
      )
      Spacer(modifier = GlanceModifier.height(8.dp))

      Text(
        text = "${WidgetData.formatAmount(status.spent)} / ${WidgetData.formatAmount(status.limit)}",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurface),
          fontSize = if (detailed) 22.sp else 16.sp,
          fontWeight = FontWeight.Medium,
        ),
        maxLines = 1,
      )
      Spacer(modifier = GlanceModifier.height(6.dp))
      LinearProgressIndicator(
        progress = (status.pct / 100.0).coerceIn(0.0, 1.0).toFloat(),
        color = ColorProvider(WidgetTheme.Primary),
        backgroundColor = ColorProvider(WidgetTheme.SurfaceContainerHigh),
        modifier = GlanceModifier.fillMaxWidth().height(6.dp),
      )

      if (detailed) {
        Spacer(modifier = GlanceModifier.height(6.dp))
        val remaining = max(0.0, status.limit - status.spent)
        Text(
          text = "${WidgetData.formatAmount(remaining)} left",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 10.sp),
        )
      }
    }
  }
}

class SingleBudgetWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = SingleBudgetWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}
