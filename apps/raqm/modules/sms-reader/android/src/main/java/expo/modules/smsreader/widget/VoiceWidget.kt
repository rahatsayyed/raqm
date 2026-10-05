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

class VoiceWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, appWidgetId: Int) {
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(12.dp)
        .clickable(voiceAction(context)),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Text(
        text = "🎤",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.Primary),
          fontSize = 28.sp,
          fontWeight = FontWeight.Bold,
        ),
      )
      Text(
        text = "Voice",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 12.sp,
        ),
      )
    }
  }
}

class VoiceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = VoiceWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}

internal fun voiceAction(context: Context) =
  actionStartActivity(QuickAdd.mainActivityIntent(context, quickAdd = true, startVoice = true) ?: Intent())
