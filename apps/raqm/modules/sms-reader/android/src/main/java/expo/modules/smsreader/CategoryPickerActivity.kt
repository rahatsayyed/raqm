package expo.modules.smsreader

import android.app.Activity
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import java.io.File

/**
 * A translucent, no-history Activity that lets the user pick a category straight from the
 * "Category" notification action, without ever bringing Raqm's real UI to the foreground —
 * see AndroidManifest.xml's taskAffinity="" + excludeFromRecents on this entry, and
 * SmsReaderModule.attachTxActions which points the action's PendingIntent here directly.
 * Reads/writes SQLite directly rather than going through the JS layer so this keeps working
 * even when the app process is fully killed — see NotificationActionReceiver for the same
 * reasoning applied to the other two tx notification actions.
 *
 * The picker itself is a bottom-anchored grid built to visually match the in-app category
 * picker (TransactionDetailScreen's CategorySheet: 3-column grid, rounded cells, emoji, dark
 * theme colors) rather than a plain system AlertDialog list — colors are hardcoded from
 * src/theme/colors.ts since this Activity has no access to NativeWind/theme tokens.
 */
class CategoryPickerActivity : Activity() {
  private var db: SQLiteDatabase? = null
  private var notificationTag: String? = null
  private var notificationIntId: Int = -1

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
    window.setGravity(Gravity.BOTTOM)
    window.setDimAmount(0f) // we draw our own scrim below, avoid double-dimming

    val txId = intent.getIntExtra(EXTRA_TX_ID, -1)
    if (txId == -1) {
      finish()
      return
    }
    notificationTag = intent.getStringExtra(EXTRA_NOTIFICATION_TAG)
    notificationIntId = intent.getIntExtra(EXTRA_NOTIFICATION_INT_ID, -1)

    val dbPath = File(filesDir.canonicalPath, "SQLite/raqm.db").path
    val database = try {
      SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READWRITE)
    } catch (e: Exception) {
      Log.e(TAG, "Could not open raqm.db", e)
      finish()
      return
    }
    db = database

    var currentCategoryId = -1
    var txType = ""
    database.rawQuery("SELECT category_id, type FROM transactions WHERE id = ?", arrayOf(txId.toString())).use { cursor ->
      if (cursor.moveToFirst()) {
        if (!cursor.isNull(0)) currentCategoryId = cursor.getInt(0)
        txType = cursor.getString(1) ?: ""
      }
    }
    // Mirrors TransactionDetailScreen.tsx's isCredit(): INCOME/CREDIT -> "income" direction,
    // everything else (EXPENSE, TRANSFER, INVESTMENT, ...) -> "expense" direction. Same
    // direction-scoping the in-app category picker uses, so this notification-driven picker
    // offers the same list instead of every category in the table.
    val direction = if (txType == "INCOME" || txType == "CREDIT") "income" else "expense"

    val categories = mutableListOf<Triple<Int, String, String>>() // id, name, emoji
    try {
      database.rawQuery(
        "SELECT id, name, emoji FROM categories WHERE direction = ? OR direction = 'both' ORDER BY name ASC",
        arrayOf(direction),
      ).use { cursor ->
        while (cursor.moveToNext()) {
          categories.add(Triple(cursor.getInt(0), cursor.getString(1), cursor.getString(2)))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not read categories", e)
      closeAndFinish()
      return
    }

    if (categories.isEmpty()) {
      closeAndFinish()
      return
    }

    setContentView(buildPickerView(categories, currentCategoryId, txId))
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private fun buildPickerView(
    categories: List<Triple<Int, String, String>>,
    currentCategoryId: Int,
    txId: Int,
  ): View {
    val scrim = FrameLayout(this).apply {
      layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
      setBackgroundColor(Color.parseColor("#99000000"))
      isClickable = true
      setOnClickListener { closeAndFinish() }
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
          0f, 0f,
          0f, 0f,
        )
      }
      setPadding(dp(20), dp(20), dp(20), dp(28))
    }

    val title = TextView(this).apply {
      text = "Set category"
      setTextColor(Color.parseColor(COLOR_ON_SURFACE))
      textSize = 16f
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, 0, 0, dp(16))
    }
    card.addView(title)

    categories.chunked(3).forEach { row ->
      val rowLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          bottomMargin = dp(8)
        }
      }
      row.forEach { (catId, name, emoji) ->
        rowLayout.addView(buildCell(catId, name, emoji, selected = catId == currentCategoryId, txId = txId))
      }
      repeat(3 - row.size) {
        rowLayout.addView(View(this).apply {
          layoutParams = LinearLayout.LayoutParams(0, 0, 1f)
        })
      }
      card.addView(rowLayout)
    }

    val cardParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      gravity = Gravity.BOTTOM
    }
    scrim.addView(card, cardParams)
    return scrim
  }

  private fun buildCell(catId: Int, name: String, emoji: String, selected: Boolean, txId: Int): View {
    val cellBg = GradientDrawable().apply {
      cornerRadius = dp(10).toFloat()
      if (selected) {
        setColor(Color.parseColor(COLOR_PRIMARY_10))
        setStroke(dp(1), Color.parseColor(COLOR_PRIMARY))
      } else {
        setColor(Color.parseColor(COLOR_SURFACE_CONTAINER_HIGH))
      }
    }

    val emojiView = TextView(this).apply {
      text = emoji
      textSize = 24f
      gravity = Gravity.CENTER
    }
    val nameView = TextView(this).apply {
      text = name
      textSize = 11f
      gravity = Gravity.CENTER
      maxLines = 1
      ellipsize = android.text.TextUtils.TruncateAt.END
      setTextColor(Color.parseColor(if (selected) COLOR_ON_SURFACE else COLOR_ON_SURFACE_VARIANT))
      setPadding(dp(2), dp(4), dp(2), 0)
    }

    return LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      background = cellBg
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
        marginStart = dp(4)
        marginEnd = dp(4)
      }
      setPadding(dp(8), dp(10), dp(8), dp(10))
      addView(emojiView)
      addView(nameView)
      setOnClickListener {
        selectCategory(catId, txId)
      }
    }
  }

  private fun selectCategory(categoryId: Int, txId: Int) {
    try {
      // Every other category-change path (see TransactionDetailScreen's CategorySheet
      // onSelect) clears subcategory_id alongside category_id — a subcategory only makes
      // sense scoped to its parent category, so leaving the old one here would point at a
      // subcategory belonging to whatever category this tx had before.
      val values = ContentValues().apply {
        put("category_id", categoryId)
        putNull("subcategory_id")
      }
      db?.update("transactions", values, "id = ?", arrayOf(txId.toString()))
      val database = db
      val tag = notificationTag
      if (database != null && tag != null && notificationIntId != -1) {
        refreshTxNotificationBody(this, database, txId, tag, notificationIntId)
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not update category", e)
    } finally {
      closeAndFinish()
    }
  }

  private fun closeAndFinish() {
    db?.close()
    db = null
    finish()
  }

  override fun onDestroy() {
    db?.close()
    super.onDestroy()
  }

  companion object {
    private const val TAG = "CategoryPickerActivity"
    const val EXTRA_TX_ID = "txId"
    const val EXTRA_NOTIFICATION_TAG = "notificationTag"
    const val EXTRA_NOTIFICATION_INT_ID = "notificationIntId"

    // Mirrors src/theme/colors.ts — this Activity has no access to NativeWind/theme tokens.
    private const val COLOR_SURFACE = "#0e1512"
    private const val COLOR_SURFACE_CONTAINER_HIGH = "#242c28"
    private const val COLOR_ON_SURFACE = "#dde4df"
    private const val COLOR_ON_SURFACE_VARIANT = "#bdcac0"
    private const val COLOR_PRIMARY = "#75daa8"
    private const val COLOR_PRIMARY_10 = "#1a75daa8" // primary at ~10% alpha, matches bg-primary/10
  }
}
