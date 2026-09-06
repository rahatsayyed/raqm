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
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
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
 * Spend vs. limit for every configured budget, with a progress bar per budget. At larger
 * widget sizes each row also shows the remaining amount and a daily allowance (remaining
 * divided by whole days left in the period).
 *
 * All numbers come from WidgetData.budgetStatuses, which is the hand-maintained Kotlin port
 * of src/services/budgets.ts's getBudgetStatuses — same period bounds (honouring the custom
 * month-start-day), same countsTowardTotals filter, same refund netting.
 */
class BudgetWidget : GlanceAppWidget() {

  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val statuses = WidgetData.budgetStatuses(context)
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, statuses, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, statuses: List<BudgetStatus>, appWidgetId: Int) {
    val detailed = LocalSize.current.height >= 140.dp

    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(14.dp)
        .clickable(quickAddAction(context)),
    ) {
      Text(
        text = "Budgets",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
        ),
      )
      Spacer(modifier = GlanceModifier.height(8.dp))

      if (statuses.isEmpty()) {
        Text(
          text = "No budgets set yet",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 13.sp),
        )
        return@Column
      }

      val shown = if (detailed) statuses.take(4) else statuses.take(2)
      val daysLeft = if (detailed) WidgetData.daysLeftInPeriod(context) else 1
      shown.forEach { status ->
        BudgetRow(status, detailed, daysLeft)
        Spacer(modifier = GlanceModifier.height(10.dp))
      }
    }
  }

  @Composable
  private fun BudgetRow(status: BudgetStatus, detailed: Boolean, daysLeft: Int) {
    Column(modifier = GlanceModifier.fillMaxWidth()) {
      Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Text(
          text = "${status.categoryEmoji} ${status.categoryName}",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurface), fontSize = 13.sp),
          maxLines = 1,
          modifier = GlanceModifier.defaultWeight(),
        )
        Text(
          text = "${WidgetData.formatAmount(status.spent)} / ${WidgetData.formatAmount(status.limit)}",
          style = TextStyle(
            color = ColorProvider(WidgetTheme.OnSurfaceVariant),
            fontSize = 11.sp,
          ),
          maxLines = 1,
        )
      }
      Spacer(modifier = GlanceModifier.height(4.dp))
      ProgressBar(status.pct)

      if (detailed) {
        Spacer(modifier = GlanceModifier.height(4.dp))
        val remaining = max(0.0, status.limit - status.spent)
        val perDay = remaining / daysLeft
        Text(
          text = "${WidgetData.formatAmount(remaining)} left · ${WidgetData.formatAmount(perDay)}/day",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 10.sp),
        )
      }
    }
  }

  /**
   * Glance ships a LinearProgressIndicator in androidx.glance.appwidget (not the .components
   * subpackage, which only holds Scaffold/TitleBar/Button) that takes explicit color providers — no need to fake a bar out of nested
   * Boxes. `progress` is 0f..1f, so an over-budget category pins at a full bar.
   */
  @Composable
  private fun ProgressBar(pct: Double) {
    LinearProgressIndicator(
      progress = (pct / 100.0).coerceIn(0.0, 1.0).toFloat(),
      color = ColorProvider(WidgetTheme.Primary),
      backgroundColor = ColorProvider(WidgetTheme.SurfaceContainerHigh),
      modifier = GlanceModifier.fillMaxWidth().height(6.dp),
    )
  }
}

class BudgetWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = BudgetWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}
