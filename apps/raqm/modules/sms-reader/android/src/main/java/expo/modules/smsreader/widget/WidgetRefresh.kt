package expo.modules.smsreader.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Tells every placed Raqm widget to recompose right now, instead of waiting up to 30
 * minutes for the platform's updatePeriodMillis tick. Fired from txStore.refresh() — the
 * one chokepoint every insert/update/delete path already goes through, so no individual
 * mutation call site needs instrumenting.
 *
 * Broadcasting ACTION_APPWIDGET_UPDATE rather than GlanceAppWidget.updateAll() on purpose:
 * updateAll is a suspend function, and this has to be callable from a plain, never-throwing
 * synchronous native function.
 *
 * Never throws — a widget refresh failure must never disrupt the calling JS flow (same
 * invariant as attachTxActions).
 */
object WidgetRefresh {

  private val RECEIVERS = listOf(
    AddTransactionWidgetReceiver::class.java,
    BudgetWidgetReceiver::class.java,
    CategoryPieWidgetReceiver::class.java,
    RecentTransactionsWidgetReceiver::class.java,
  )

  fun refreshAll(context: Context) {
    try {
      val manager = AppWidgetManager.getInstance(context) ?: return
      for (receiver in RECEIVERS) {
        val ids = try {
          manager.getAppWidgetIds(ComponentName(context, receiver))
        } catch (e: Exception) {
          continue
        }
        if (ids == null || ids.isEmpty()) continue
        val intent = Intent(context, receiver).apply {
          action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)
      }
    } catch (e: Exception) {
      // Swallow — see the class doc. Never let widget refresh break the caller.
    }
  }

  /**
   * Refreshes one widget instance right after its config screen saves new appearance
   * settings, instead of waiting for the next event-driven or periodic refreshAll. Looks up
   * the widget's own provider component from AppWidgetManager rather than guessing which of
   * the four widget classes it belongs to.
   */
  fun refreshOne(context: Context, appWidgetId: Int) {
    try {
      val manager = AppWidgetManager.getInstance(context) ?: return
      val info = try {
        manager.getAppWidgetInfo(appWidgetId)
      } catch (e: Exception) {
        null
      } ?: return
      val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
        component = info.provider
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
      }
      context.sendBroadcast(intent)
    } catch (e: Exception) {
      // Swallow — see the class doc. Never let widget refresh break the caller.
    }
  }
}
