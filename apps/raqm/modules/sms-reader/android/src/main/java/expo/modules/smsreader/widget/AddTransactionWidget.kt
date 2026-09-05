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
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import expo.modules.smsreader.QuickAdd

/**
 * The simplest of the four widgets: one tappable card that opens the quick-add screen.
 * No data, nothing to refresh — it exists so logging a cash spend is one home-screen tap.
 */
class AddTransactionWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    provideContent { Content(context) }
  }

  @Composable
  private fun Content(context: Context) {
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetTheme.Surface)
        .cornerRadius(20.dp)
        .padding(12.dp)
        .clickable(quickAddAction(context)),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Text(
        text = "+",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.Primary),
          fontSize = 30.sp,
          fontWeight = FontWeight.Bold,
        ),
      )
      Text(
        text = "Add",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 12.sp,
        ),
      )
    }
  }
}

class AddTransactionWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = AddTransactionWidget()
}

/**
 * Shared "open quick-add" click action for every widget surface. Reuses QuickAdd's intent
 * builder — the same MainActivity trampoline the launcher shortcut and the QS tile use.
 * Glance only offers an Intent overload of actionStartActivity (no PendingIntent one), so a
 * bare Intent is the fallback if the launcher can't be resolved: a no-op tap, never a throw.
 */
internal fun quickAddAction(context: Context) =
  actionStartActivity(QuickAdd.mainActivityIntent(context, quickAdd = true) ?: Intent())
