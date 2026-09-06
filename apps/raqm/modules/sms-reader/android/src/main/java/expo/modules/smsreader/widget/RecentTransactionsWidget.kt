package expo.modules.smsreader.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
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
import expo.modules.smsreader.QuickAdd
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The most recent transactions, scrollable, with a header summary line and an embedded "+"
 * that opens quick-add.
 *
 * **Each row's tap target deep-links to that specific transaction's detail screen** via the
 * openTransaction intent extra (QuickAdd.kt + src/navigation/deepLinks.ts). That per-row
 * link is the concrete improvement over the competing app this widget set mirrors, whose
 * rows are inert.
 */
class RecentTransactionsWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val txs = WidgetData.recentTransactions(context, ROW_LIMIT)
    val total = WidgetData.periodSpendTotal(context)
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, txs, total, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, txs: List<RecentTx>, periodTotal: Double, appWidgetId: Int) {
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(14.dp),
    ) {
      Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(
            text = "Recent",
            style = TextStyle(
              color = ColorProvider(WidgetTheme.OnSurfaceVariant),
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium,
            ),
          )
          Text(
            text = "${WidgetData.formatAmount(periodTotal)} this period",
            style = TextStyle(color = ColorProvider(WidgetTheme.OnSurface), fontSize = 14.sp),
            maxLines = 1,
          )
        }
        Text(
          text = "+",
          style = TextStyle(
            color = ColorProvider(WidgetTheme.Primary),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
          ),
          modifier = GlanceModifier
            .padding(horizontal = 10.dp, vertical = 2.dp)
            .background(WidgetTheme.SurfaceContainerHigh)
            .cornerRadius(10.dp)
            .clickable(quickAddAction(context)),
        )
      }

      Spacer(modifier = GlanceModifier.height(8.dp))

      if (txs.isEmpty()) {
        Text(
          text = "No transactions yet",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 13.sp),
        )
        return@Column
      }

      LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
        items(txs, itemId = { it.id.toLong() }) { tx ->
          TxRow(context, tx)
        }
      }
    }
  }

  @Composable
  private fun TxRow(context: Context, tx: RecentTx) {
    // Each row carries its own transaction id as an intent extra, so every row's action is a
    // distinct intent — this is what makes the rows individually deep-linkable instead of all
    // opening the app generically. QuickAdd.mainActivityIntent already builds this (same flags,
    // same extra, plus exception-safety around getLaunchIntentForPackage).
    val rowIntent = QuickAdd.mainActivityIntent(context, false, tx.id) ?: Intent()

    val modifier = GlanceModifier
      .fillMaxWidth()
      .padding(vertical = 6.dp)
      .clickable(actionStartActivity(rowIntent))

    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
      Text(text = tx.emoji, style = TextStyle(fontSize = 15.sp))
      Column(modifier = GlanceModifier.defaultWeight().padding(start = 8.dp)) {
        Text(
          text = tx.label,
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurface), fontSize = 13.sp),
          maxLines = 1,
        )
        Text(
          text = dayFormat.format(Date(tx.timestamp)),
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 10.sp),
          maxLines = 1,
        )
      }
      Text(
        text = (if (tx.isCredit) "+" else "−") + WidgetData.formatAmount(tx.amount),
        style = TextStyle(
          color = ColorProvider(if (tx.isCredit) WidgetTheme.Primary else WidgetTheme.OnSurface),
          fontSize = 13.sp,
          fontWeight = FontWeight.Medium,
        ),
        maxLines = 1,
      )
    }
  }

  private companion object {
    const val ROW_LIMIT = 25
    val dayFormat = SimpleDateFormat("d MMM", Locale("en", "IN"))
  }
}

class RecentTransactionsWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = RecentTransactionsWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}
