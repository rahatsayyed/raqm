package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationManager
import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File

/**
 * Handles the "Not An Expense"/"Not An Income" and "Add note" tx notification actions natively —
 * reading/writing SQLite directly, never touching the JS/React Native layer. This is what makes
 * these actions reliable when the app process is fully killed: Android always delivers an
 * explicit-PendingIntent broadcast from a notification action tap regardless of Doze/battery-saver
 * state, but booting a full RN/JS engine (the previous expo-task-manager based path this replaces)
 * is exactly the kind of expensive wake-up aggressive OEM battery managers (MIUI, ColorOS, etc.)
 * are most likely to kill mid-flight. Mirrors CategoryPickerActivity's same reasoning.
 *
 * Known tradeoff: since this bypasses the JS layer entirely, useTxStore won't reflect the change
 * until whatever screen is showing this tx next reads from the DB (e.g. on focus) — acceptable
 * given the reliability this buys when the app is killed, which is the case that matters most.
 */
class NotificationActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val txId = intent.getIntExtra(EXTRA_TX_ID, -1)
    val tag = intent.getStringExtra(EXTRA_NOTIFICATION_TAG)
    val id = intent.getIntExtra(EXTRA_NOTIFICATION_INT_ID, -1)
    if (txId == -1 || tag == null || id == -1) return

    val dbPath = File(context.filesDir.canonicalPath, "SQLite/raqm.db").path
    val db = try {
      SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READWRITE)
    } catch (e: Exception) {
      Log.e(TAG, "Could not open raqm.db", e)
      return
    }

    try {
      when (intent.action) {
        ACTION_NOT_EXPENSE -> {
          db.execSQL("UPDATE transactions SET link_settled = 1 WHERE id = ?", arrayOf(txId))
          context.getSystemService(NotificationManager::class.java)?.cancel(tag, id)
        }
        ACTION_ADD_NOTE -> {
          val noteText = RemoteInput.getResultsFromIntent(intent)
            ?.getCharSequence(EXTRA_NOTE_INPUT)
            ?.toString()
            ?.trim()
          if (!noteText.isNullOrEmpty()) {
            db.update(
              "transactions",
              ContentValues().apply { put("notes", noteText) },
              "id = ?",
              arrayOf(txId.toString()),
            )
          }
          // Re-notify with the same (tag, id) regardless of whether text was empty — Android's
          // RemoteInput contract requires this to clear the inline input's "sending" spinner.
          updateNoteNotification(context, db, txId, tag, id, noteText)
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Failed handling ${intent.action} for tx $txId", e)
    } finally {
      db.close()
    }
  }

  private fun updateNoteNotification(
    context: Context,
    db: SQLiteDatabase,
    txId: Int,
    tag: String,
    id: Int,
    noteText: String?,
  ) {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    val sbn = nm.activeNotifications.firstOrNull { it.tag == tag && it.id == id } ?: return
    val notification = sbn.notification

    if (!noteText.isNullOrEmpty()) {
      var bankLabel = ""
      var categoryName = "Uncategorized"
      // Mirrors accountLabel.ts (nickname override else raw bank name) and the "Bank • Category
      // • Note" echo line the old JS path built — recomputed fresh each time rather than stashing
      // an original body, since bank/category rarely change and this avoids any stash bookkeeping.
      db.rawQuery(
        """
        SELECT t.bankName,
               (SELECT a.nickname FROM accounts a
                WHERE a.bank_name = t.bankName AND COALESCE(a.last4, '') = COALESCE(t.accountLast4, '')
                LIMIT 1) AS nickname,
               c.name AS categoryName
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.id = ?
        """.trimIndent(),
        arrayOf(txId.toString()),
      ).use { cursor ->
        if (cursor.moveToFirst()) {
          val bankName = cursor.getString(0) ?: ""
          val nickname = cursor.getString(1)
          bankLabel = if (!nickname.isNullOrEmpty()) nickname else bankName
          categoryName = cursor.getString(2) ?: "Uncategorized"
        }
      }
      val ellipsized = if (noteText.length > 40) noteText.take(40).trimEnd() + "…" else noteText
      val newBody = "$bankLabel • $categoryName • $ellipsized"
      notification.extras.putCharSequence(Notification.EXTRA_TEXT, newBody)
      notification.extras.putCharSequence(Notification.EXTRA_BIG_TEXT, newBody)
    }
    nm.notify(tag, id, notification)
  }

  companion object {
    private const val TAG = "NotificationActionReceiver"
    const val ACTION_NOT_EXPENSE = "expo.modules.smsreader.NOT_EXPENSE"
    const val ACTION_ADD_NOTE = "expo.modules.smsreader.ADD_NOTE"
    const val EXTRA_TX_ID = "txId"
    const val EXTRA_NOTIFICATION_TAG = "notificationTag"
    const val EXTRA_NOTIFICATION_INT_ID = "notificationIntId"
    const val EXTRA_NOTE_INPUT = "noteInput"
  }
}
