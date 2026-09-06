package expo.modules.smsreader.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
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
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * A donut of this period's category spend plus a text legend. Category totals come from
 * WidgetData.categoryTotals — EXPENSE only with refunds netted, the same convention
 * CategoryDetailScreen/Analytics use (Dashboard's inclusion of TRANSFER/INVESTMENT is the
 * documented, accepted divergence).
 */
class CategoryPieWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val slices = WidgetData.categoryTotals(context).take(6)
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, slices, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, slices: List<CategorySlice>, appWidgetId: Int) {
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(14.dp)
        .clickable(quickAddAction(context)),
    ) {
      Text(
        text = "This period",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
        ),
      )
      Spacer(modifier = GlanceModifier.height(8.dp))

      if (slices.isEmpty()) {
        Text(
          text = "No spend recorded yet",
          style = TextStyle(color = ColorProvider(WidgetTheme.OnSurfaceVariant), fontSize = 13.sp),
        )
        return@Column
      }

      Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Image(
          provider = ImageProvider(donutBitmap(slices)),
          contentDescription = "Category spend donut",
          modifier = GlanceModifier.size(72.dp),
        )
        Spacer(modifier = GlanceModifier.height(8.dp))
        Column(modifier = GlanceModifier.defaultWeight().padding(start = 10.dp)) {
          slices.take(4).forEachIndexed { index, slice ->
            Text(
              text = "${slice.emoji} ${slice.name} · ${WidgetData.formatAmount(slice.total)}",
              style = TextStyle(
                color = ColorProvider(
                  WidgetTheme.SliceColors[index % WidgetTheme.SliceColors.size]
                ),
                fontSize = 11.sp,
              ),
              maxLines = 1,
            )
          }
        }
      }
    }
  }

  /**
   * Glance has no arc primitive, so the donut is drawn to an off-screen Bitmap and shown as
   * an Image. PorterDuff.Mode.CLEAR punches the centre hole so the widget's own surface
   * shows through instead of a painted-on fake background.
   */
  private fun donutBitmap(slices: List<CategorySlice>): Bitmap {
    val sizePx = 216 // 72dp at xxhdpi — one bitmap size for every density, scaled by Image.
    val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val total = slices.sumOf { it.total }
    if (total <= 0) return bitmap

    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    val rect = RectF(0f, 0f, sizePx.toFloat(), sizePx.toFloat())
    var startAngle = -90f

    slices.forEachIndexed { index, slice ->
      val sweep = ((slice.total / total) * 360.0).toFloat()
      paint.color = WidgetTheme.SliceArgb[index % WidgetTheme.SliceArgb.size]
      canvas.drawArc(rect, startAngle, sweep, true, paint)
      startAngle += sweep
    }

    // Punch the hole.
    val holePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
    }
    canvas.drawCircle(sizePx / 2f, sizePx / 2f, sizePx * 0.30f, holePaint)

    return bitmap
  }
}

class CategoryPieWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = CategoryPieWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}
