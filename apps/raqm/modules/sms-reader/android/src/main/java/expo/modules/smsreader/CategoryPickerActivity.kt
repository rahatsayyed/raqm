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
 *
 * Category + subcategory step: this mirrors CategorySheet in
 * apps/raqm/src/screens/main/TransactionDetailScreen.tsx (same picker UX, two runtimes —
 * native Kotlin Activity here vs. a React Native component there — that cannot share code and
 * must be kept in sync by hand). Where CategorySheet expands the subcategory list in place
 * below the tapped category row, this Activity swaps the whole card to a second "step" (see
 * showSubcategoryStep) since in-place re-layout of a raw View grid is more trouble than it's
 * worth here; the set of choices offered (no-subcategory / each subcategory) is the same.
 */
class CategoryPickerActivity : Activity() {
  private var db: SQLiteDatabase? = null
  private var notificationTag: String? = null
  private var notificationIntId: Int = -1

  private var txId: Int = -1
  private var categories: List<Triple<Int, String, String>> = emptyList() // id, name, emoji
  private var currentCategoryId: Int = -1
  private var currentSubcategoryId: Int = -1

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
    window.setGravity(Gravity.BOTTOM)
    window.setDimAmount(0f) // we draw our own scrim below, avoid double-dimming

    val txIdExtra = intent.getIntExtra(EXTRA_TX_ID, -1)
    if (txIdExtra == -1) {
      finish()
      return
    }
    txId = txIdExtra
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

    var txType = ""
    database.rawQuery(
      "SELECT category_id, subcategory_id, type FROM transactions WHERE id = ?",
      arrayOf(txId.toString()),
    ).use { cursor ->
      if (cursor.moveToFirst()) {
        if (!cursor.isNull(0)) currentCategoryId = cursor.getInt(0)
        if (!cursor.isNull(1)) currentSubcategoryId = cursor.getInt(1)
        txType = cursor.getString(2) ?: ""
      }
    }
    // Mirrors TransactionDetailScreen.tsx's isCredit(): INCOME/CREDIT -> "income" direction,
    // everything else (EXPENSE, TRANSFER, INVESTMENT, ...) -> "expense" direction. Same
    // direction-scoping the in-app category picker uses, so this notification-driven picker
    // offers the same list instead of every category in the table.
    val direction = if (txType == "INCOME" || txType == "CREDIT") "income" else "expense"

    val loadedCategories = mutableListOf<Triple<Int, String, String>>() // id, name, emoji
    try {
      database.rawQuery(
        "SELECT id, name, emoji FROM categories WHERE direction = ? OR direction = 'both' ORDER BY name ASC",
        arrayOf(direction),
      ).use { cursor ->
        while (cursor.moveToNext()) {
          loadedCategories.add(Triple(cursor.getInt(0), cursor.getString(1), cursor.getString(2)))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not read categories", e)
      closeAndFinish()
      return
    }

    if (loadedCategories.isEmpty()) {
      closeAndFinish()
      return
    }
    categories = loadedCategories

    showCategoryStep()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private fun querySubcategories(categoryId: Int): List<Pair<Int, String>> {
    val database = db ?: return emptyList()
    val subcategories = mutableListOf<Pair<Int, String>>() // id, name
    try {
      // Mirrors database.ts's getSubcategories() query.
      database.rawQuery(
        "SELECT id, name FROM subcategories WHERE category_id = ? ORDER BY id ASC",
        arrayOf(categoryId.toString()),
      ).use { cursor ->
        while (cursor.moveToNext()) {
          subcategories.add(Pair(cursor.getInt(0), cursor.getString(1)))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not read subcategories", e)
    }
    return subcategories
  }

  /** Step 1: the category grid. */
  private fun showCategoryStep() {
    setContentView(buildCardScrim { card ->
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
          val selected = catId == currentCategoryId
          rowLayout.addView(buildGridCell(name, emoji, selected) { handleCategoryTap(catId) })
        }
        repeat(3 - row.size) {
          rowLayout.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, 0, 1f)
          })
        }
        card.addView(rowLayout)
      }
    })
  }

  /**
   * Step 2: shown only when the tapped category has subcategories (see handleCategoryTap).
   * Reuses buildCardScrim for the same card chrome, and pill cells (mirroring CategorySheet's
   * subcategory pills in TransactionDetailScreen.tsx) instead of the step-1 grid cells.
   */
  private fun showSubcategoryStep(categoryId: Int, categoryName: String, subcategories: List<Pair<Int, String>>) {
    setContentView(buildCardScrim { card ->
      val header = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(0, 0, 0, dp(16))
      }
      val backView = TextView(this).apply {
        text = "← Back"
        setTextColor(Color.parseColor(COLOR_PRIMARY))
        textSize = 13f
        setPadding(0, dp(4), dp(12), dp(4))
        setOnClickListener { showCategoryStep() }
      }
      val titleView = TextView(this).apply {
        text = categoryName
        setTextColor(Color.parseColor(COLOR_ON_SURFACE))
        textSize = 16f
        setTypeface(typeface, android.graphics.Typeface.BOLD)
      }
      header.addView(backView)
      header.addView(titleView)
      card.addView(header)

      val pillWrap = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
      }

      // "Skip" finalizes with just the category, same as CategorySheet's "No sub-category" pill.
      pillWrap.addView(
        buildPillCell("No sub-category", selected = currentCategoryId == categoryId && currentSubcategoryId == -1) {
          selectCategory(categoryId, null)
        },
      )
      subcategories.forEach { (subId, subName) ->
        pillWrap.addView(
          buildPillCell(subName, selected = currentSubcategoryId == subId) {
            selectCategory(categoryId, subId)
          },
        )
      }
      card.addView(pillWrap)
    })
  }

  /** Shared card/scrim chrome for both steps; `content` populates the card body. */
  private fun buildCardScrim(content: (LinearLayout) -> Unit): View {
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

    content(card)

    val cardParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      gravity = Gravity.BOTTOM
    }
    scrim.addView(card, cardParams)
    return scrim
  }

  private fun buildGridCell(name: String, emoji: String, selected: Boolean, onTap: () -> Unit): View {
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
      setOnClickListener { onTap() }
    }
  }

  /**
   * Smaller pill-style cell for the subcategory step — mirrors CategorySheet's subcategory
   * chips (rounded-xs pills, no emoji) rather than the step-1 grid cells, using the same
   * COLOR_* constants as buildGridCell (no new hex values).
   */
  private fun buildPillCell(name: String, selected: Boolean, onTap: () -> Unit): View {
    val pillBg = GradientDrawable().apply {
      cornerRadius = dp(8).toFloat()
      if (selected) {
        setColor(Color.parseColor(COLOR_PRIMARY_10))
        setStroke(dp(1), Color.parseColor(COLOR_PRIMARY))
      } else {
        setColor(Color.parseColor(COLOR_SURFACE_CONTAINER_HIGH))
      }
    }
    val label = TextView(this).apply {
      text = name
      textSize = 13f
      setTextColor(Color.parseColor(if (selected) COLOR_ON_SURFACE else COLOR_ON_SURFACE_VARIANT))
    }
    return FrameLayout(this).apply {
      background = pillBg
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
        bottomMargin = dp(8)
      }
      setPadding(dp(14), dp(10), dp(14), dp(10))
      addView(label)
      setOnClickListener { onTap() }
    }
  }

  /**
   * Tapping a category: if it has no subcategories, finalize immediately (previous behavior);
   * otherwise swap to the subcategory step, mirroring CategorySheet's branch between "select
   * right away" and "expand subcategories" in TransactionDetailScreen.tsx.
   */
  private fun handleCategoryTap(categoryId: Int) {
    val subs = querySubcategories(categoryId)
    if (subs.isEmpty()) {
      selectCategory(categoryId, null)
      return
    }
    val categoryName = categories.firstOrNull { it.first == categoryId }?.second ?: ""
    showSubcategoryStep(categoryId, categoryName, subs)
  }

  private fun selectCategory(categoryId: Int, subcategoryId: Int?) {
    try {
      // Every other category-change path (see TransactionDetailScreen's CategorySheet
      // onSelect) clears subcategory_id when no subcategory is chosen — a subcategory only
      // makes sense scoped to its parent category, so leaving the old one here would point at
      // a subcategory belonging to whatever category this tx had before.
      val values = ContentValues().apply {
        put("category_id", categoryId)
        if (subcategoryId != null) put("subcategory_id", subcategoryId) else putNull("subcategory_id")
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
