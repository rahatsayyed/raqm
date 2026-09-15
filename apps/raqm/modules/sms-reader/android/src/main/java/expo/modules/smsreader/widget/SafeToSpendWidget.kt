package expo.modules.smsreader.widget

import android.content.Context
import android.content.Intent
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
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import expo.modules.smsreader.QuickAdd

/**
 * One derived number: budget remaining across every active budget (see
 * WidgetData.safeToSpend — a port of DashboardScreen.tsx's safe-to-spend card, minus the
 * upcoming-bills netting, which has no Kotlin port yet).
 *
 * Tap opens the app rather than quick-add, since this widget is a status check, not an
 * entry point for logging a transaction.
 */
class SafeToSpendWidget : GlanceAppWidget() {

  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val amount = WidgetData.safeToSpend(context)
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, amount, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, amount: Double?, appWidgetId: Int) {
    val detailed = LocalSize.current.height >= 100.dp
    val openApp = actionStartActivity(QuickAdd.mainActivityIntent(context, quickAdd = false) ?: Intent())

    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(14.dp)
        .clickable(openApp),
    ) {
      Text(
        text = "Safe to spend",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
        ),
      )
      Spacer(modifier = GlanceModifier.height(8.dp))

      if (amount == null) {
        Text(
          text = "No budgets set yet",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 13.sp),
        )
        return@Column
      }

      Text(
        text = WidgetData.formatAmount(amount),
        style = TextStyle(
          color = ColorProvider(if (amount < 0) WidgetTheme.ErrorMuted else WidgetTheme.OnSurface),
          fontSize = if (detailed) 28.sp else 20.sp,
          fontWeight = FontWeight.Medium,
        ),
        maxLines = 1,
      )
      if (detailed) {
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
          text = "left across your budgets",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 10.sp),
        )
      }
    }
  }
}

class SafeToSpendWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = SafeToSpendWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}
