package expo.modules.smsreader.widget

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import expo.modules.smsreader.DiagnosticLog
import expo.modules.smsreader.MonthStartDay
import java.io.File
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.max

data class BudgetStatus(
  val categoryName: String,
  val categoryEmoji: String,
  val spent: Double,
  val limit: Double,
  val pct: Double,
)

data class CategorySlice(
  val categoryId: Int,
  val name: String,
  val emoji: String,
  val total: Double,
)

data class RecentTx(
  val id: Int,
  val amount: Double,
  val label: String,
  val emoji: String,
  val timestamp: Long,
  val isCredit: Boolean,
)

/**
 * Read-only SQLite access for the four Glance widgets. Widgets run in a process with no
 * guarantee that the RN/JS engine is alive, so — exactly like CategoryPickerActivity and
 * NotificationActionReceiver — they read raqm.db straight from Kotlin.
 *
 * This is a hand-maintained port of the JS spend math (src/services/budgets.ts's
 * getBudgetStatuses/sumSpend, src/utils/period.ts's getMonthBounds/getWeekBounds,
 * src/services/txIntelligenceCore.ts's countsTowardTotals, src/utils/format.ts's
 * formatAmount). Two runtimes, no shared code — keep them in sync by hand, the same way
 * CategoryPickerActivity mirrors CategorySheet.
 *
 * Every public entry point returns an empty/zero result instead of throwing: a locked or
 * mid-migration database must degrade to an empty widget, never crash the widget host.
 */
object WidgetData {

  // --- database ------------------------------------------------------------------------

  // OPEN_READWRITE, matching CategoryPickerActivity/NotificationActionReceiver: expo-sqlite's
  // WAL journal mode needs write access to the -shm/-wal sidecar files even for a
  // connection that only ever issues SELECTs, or opens/reads can fail or see stale data.
  private fun openDb(context: Context): SQLiteDatabase? =
    try {
      val path = File(context.filesDir.canonicalPath, "SQLite/raqm.db").path
      SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
    } catch (e: Exception) {
      DiagnosticLog.write(context, "WidgetData", "Could not open raqm.db: ${e.message}")
      null
    }

  private fun <T> withDb(context: Context, fallback: T, block: (SQLiteDatabase) -> T): T {
    val db = openDb(context) ?: return fallback
    return try {
      block(db)
    } catch (e: Exception) {
      DiagnosticLog.write(context, "WidgetData", "Query failed: ${e.message}")
      fallback
    } finally {
      try { db.close() } catch (e: Exception) { /* ignore */ }
    }
  }

  // --- period math (port of src/utils/period.ts) ---------------------------------------

  /** Port of getMonthBounds(ref, startDay); startDay clamped to 1..28. */
  fun monthBounds(now: Long, startDay: Int): Pair<Long, Long> {
    val clamped = startDay.coerceIn(1, 28)
    val ref = Calendar.getInstance().apply { timeInMillis = now }
    val start = Calendar.getInstance().apply {
      timeInMillis = now
      if (ref.get(Calendar.DAY_OF_MONTH) < clamped) add(Calendar.MONTH, -1)
      set(Calendar.DAY_OF_MONTH, clamped)
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val end = (start.clone() as Calendar).apply {
      add(Calendar.MONTH, 1)
      add(Calendar.DAY_OF_MONTH, -1)
      set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59)
      set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999)
    }
    return start.timeInMillis to end.timeInMillis
  }

  /**
   * Whole days remaining in the current custom month-start-day period, floored at 1.
   * Uses monthBounds/MonthStartDay so this matches the same period spend/limit are computed
   * over — a plain calendar-month-end count would silently disagree for any user who set
   * month_start_day away from 1.
   */
  fun daysLeftInPeriod(context: Context): Int {
    val now = System.currentTimeMillis()
    val (_, to) = monthBounds(now, MonthStartDay.get(context))
    val remainingMs = to - now
    val remainingDays = (remainingMs / (24 * 60 * 60 * 1000)).toInt() + 1
    return max(1, remainingDays)
  }

  /** Port of getWeekBounds(ref): Monday 00:00:00.000 -> Sunday 23:59:59.999. */
  fun weekBounds(now: Long): Pair<Long, Long> {
    val ref = Calendar.getInstance().apply { timeInMillis = now }
    // Calendar.SUNDAY == 1 .. Calendar.SATURDAY == 7; JS getDay(): 0 = Sunday.
    val jsDay = ref.get(Calendar.DAY_OF_WEEK) - 1
    val diffToMonday = if (jsDay == 0) -6 else 1 - jsDay
    val monday = Calendar.getInstance().apply {
      timeInMillis = now
      add(Calendar.DAY_OF_MONTH, diffToMonday)
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val sunday = (monday.clone() as Calendar).apply {
      add(Calendar.DAY_OF_MONTH, 6)
      set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59)
      set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999)
    }
    return monday.timeInMillis to sunday.timeInMillis
  }

  // --- formatting (port of src/utils/format.ts formatAmount) ---------------------------

  private val amountFormat: NumberFormat =
    NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
      minimumFractionDigits = 0
      maximumFractionDigits = 2
    }

  /** "₹8,064.65" — en-IN grouping, decimals only when present, capped at 2. */
  fun formatAmount(value: Double): String = "₹" + amountFormat.format(Math.abs(value))

  // --- shared query --------------------------------------------------------------------

  // Mirrors loadTxRecords(): soft-deleted rows and rows on hidden accounts are excluded
  // everywhere in the app, so they are excluded here too.
  private const val TX_IN_BOUNDS = """
    SELECT t.id, t.amount, t.type, t.category_id, t.link_type, t.link_partner_id, t.link_settled
    FROM transactions t
    WHERE t.deleted_at IS NULL
      AND t.timestamp >= ? AND t.timestamp <= ?
      AND NOT EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.hidden_at IS NOT NULL
          AND a.bank_name = t.bankName
          AND IFNULL(a.last4, '') = IFNULL(t.accountLast4, '')
      )
  """

  private class TxRow(
    val amount: Double,
    val type: String,
    val categoryId: Int?,
    val linkType: String?,
    val linkPartnerId: Int?,
    val linkSettled: Boolean,
  )

  private fun readTxRows(db: SQLiteDatabase, from: Long, to: Long): List<TxRow> {
    val rows = mutableListOf<TxRow>()
    db.rawQuery(TX_IN_BOUNDS, arrayOf(from.toString(), to.toString())).use { c ->
      while (c.moveToNext()) {
        rows.add(
          TxRow(
            amount = c.getDouble(1),
            type = c.getString(2) ?: "",
            categoryId = if (c.isNull(3)) null else c.getInt(3),
            linkType = if (c.isNull(4)) null else c.getString(4),
            linkPartnerId = if (c.isNull(5)) null else c.getInt(5),
            linkSettled = !c.isNull(6) && c.getInt(6) == 1,
          )
        )
      }
    }
    return rows
  }

  /** Port of countsTowardTotals(tx): !linkSettled && linkType !== 'self_transfer'. */
  private fun countsTowardTotals(row: TxRow): Boolean =
    !row.linkSettled && row.linkType != "self_transfer"

  private fun isCreditType(type: String): Boolean = type == "INCOME" || type == "CREDIT"

  /** The category a refund credit should net against — the refunded expense's, via
   *  link_partner_id, since the credit itself usually carries no category_id. */
  private fun partnerCategoryId(db: SQLiteDatabase, partnerId: Int): Int? =
    try {
      db.rawQuery("SELECT category_id FROM transactions WHERE id = ?", arrayOf(partnerId.toString()))
        .use { c -> if (c.moveToFirst() && !c.isNull(0)) c.getInt(0) else null }
    } catch (e: Exception) {
      null
    }

  /**
   * Port of budgets.ts's sumSpend: EXPENSE rows in this category, minus refund credits
   * whose link partner belongs to it. Clamped at 0 so pct can't go negative.
   * ponytail: one query per budget per period (budgets are a handful of rows in practice);
   * batch into a single grouped query if the budget list ever grows large.
   */
  private fun sumSpend(db: SQLiteDatabase, categoryId: Int, from: Long, to: Long): Double {
    var total = 0.0
    for (row in readTxRows(db, from, to)) {
      if (!countsTowardTotals(row)) continue
      if (isCreditType(row.type) && row.linkType == "refund") {
        val effective = row.linkPartnerId?.let { partnerCategoryId(db, it) } ?: row.categoryId
        if (effective == categoryId) total -= row.amount
        continue
      }
      if (row.type != "EXPENSE") continue
      if (row.categoryId != categoryId) continue
      total += row.amount
    }
    return maxOf(0.0, total)
  }

  // --- public entry points --------------------------------------------------------------

  /** Port of getBudgetStatuses(): one status per budget, weekly rollover included. */
  fun budgetStatuses(context: Context): List<BudgetStatus> = withDb(context, emptyList()) { db ->
    val startDay = MonthStartDay.get(context)
    val now = System.currentTimeMillis()
    val statuses = mutableListOf<BudgetStatus>()

    db.rawQuery(
      """
      SELECT b.category_id, b.amount, b.period_type, b.rollover, c.name, c.emoji
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      ORDER BY b.id ASC
      """,
      null,
    ).use { c ->
      while (c.moveToNext()) {
        val categoryId = c.getInt(0)
        val budgetAmount = c.getDouble(1)
        val periodType = c.getString(2) ?: "monthly"
        val rollover = c.getInt(3) == 1
        val name = c.getString(4) ?: ""
        val emoji = c.getString(5) ?: "💰"

        val (from, to) = if (periodType == "weekly") weekBounds(now) else monthBounds(now, startDay)
        val spent = sumSpend(db, categoryId, from, to)

        var limit = budgetAmount
        if (periodType == "weekly" && rollover) {
          val lastWeekRef = Calendar.getInstance().apply {
            timeInMillis = now
            add(Calendar.DAY_OF_MONTH, -7)
          }.timeInMillis
          val (lastFrom, lastTo) = weekBounds(lastWeekRef)
          val lastWeekSpent = sumSpend(db, categoryId, lastFrom, lastTo)
          limit = budgetAmount + maxOf(0.0, budgetAmount - lastWeekSpent)
        }

        statuses.add(
          BudgetStatus(
            categoryName = name,
            categoryEmoji = emoji,
            spent = spent,
            limit = limit,
            pct = if (limit > 0) (spent / limit) * 100.0 else 0.0,
          )
        )
      }
    }
    statuses
  }

  /**
   * Per-category expense totals for the current custom month, refunds netted the same way
   * sumSpend does. EXPENSE only — the Analytics-side convention (Dashboard's inclusion of
   * TRANSFER/INVESTMENT is the documented, accepted divergence). Descending by total,
   * categories with a zero/negative net dropped. Uncategorized rows (categoryId null) are
   * bucketed under -1 rather than dropped, matching AnalyticsScreen.tsx's `tx.categoryId ?? -1`
   * convention — they still belong in the period spend total (periodSpendTotal sums this list),
   * just with no named category to slice into.
   */
  fun categoryTotals(context: Context): List<CategorySlice> = withDb(context, emptyList()) { db ->
    val (from, to) = monthBounds(System.currentTimeMillis(), MonthStartDay.get(context))
    val totals = mutableMapOf<Int, Double>()

    for (row in readTxRows(db, from, to)) {
      if (!countsTowardTotals(row)) continue
      if (isCreditType(row.type) && row.linkType == "refund") {
        val effective = row.linkPartnerId?.let { partnerCategoryId(db, it) } ?: row.categoryId ?: -1
        totals[effective] = (totals[effective] ?: 0.0) - row.amount
        continue
      }
      if (row.type != "EXPENSE") continue
      val categoryId = row.categoryId ?: -1
      totals[categoryId] = (totals[categoryId] ?: 0.0) + row.amount
    }

    val labels = mutableMapOf<Int, Pair<String, String>>()
    db.rawQuery("SELECT id, name, emoji FROM categories", null).use { c ->
      while (c.moveToNext()) {
        labels[c.getInt(0)] = (c.getString(1) ?: "") to (c.getString(2) ?: "💰")
      }
    }

    totals.entries
      .filter { it.value > 0 }
      .sortedByDescending { it.value }
      .map { (id, total) ->
        val (name, emoji) = labels[id] ?: ("Uncategorised" to "💰")
        CategorySlice(categoryId = id, name = name, emoji = emoji, total = total)
      }
  }

  /** Total spend for the current custom month — the Recent Transactions header summary. */
  fun periodSpendTotal(context: Context): Double =
    categoryTotals(context).sumOf { it.total }

  /** The `limit` most recent non-deleted transactions, newest first. */
  fun recentTransactions(context: Context, limit: Int): List<RecentTx> =
    withDb(context, emptyList()) { db ->
      val rows = mutableListOf<RecentTx>()
      db.rawQuery(
        """
        SELECT t.id, t.amount, t.type, t.merchant, t.bankName, t.timestamp, c.emoji
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.hidden_at IS NOT NULL
              AND a.bank_name = t.bankName
              AND IFNULL(a.last4, '') = IFNULL(t.accountLast4, '')
          )
        ORDER BY t.timestamp DESC
        LIMIT ?
        """,
        arrayOf(limit.toString()),
      ).use { c ->
        while (c.moveToNext()) {
          val merchant = if (c.isNull(3)) null else c.getString(3)
          val bank = c.getString(4) ?: ""
          val type = c.getString(2) ?: ""
          rows.add(
            RecentTx(
              id = c.getInt(0),
              amount = c.getDouble(1),
              label = merchant?.takeIf { it.isNotBlank() } ?: bank,
              emoji = if (c.isNull(6)) "💰" else (c.getString(6) ?: "💰"),
              timestamp = c.getLong(5),
              isCredit = isCreditType(type),
            )
          )
        }
      }
      rows
    }
}
