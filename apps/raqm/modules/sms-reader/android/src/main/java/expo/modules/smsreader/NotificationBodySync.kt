package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.database.sqlite.SQLiteDatabase

private const val NOTE_ELLIPSIS_MAX = 40

/**
 * Rebuilds a tx notification's body as "Bank • Category • Note" (whichever of category/note are
 * actually set) and re-notifies with the same (tag, id) — shared by NotificationActionReceiver
 * (after "Add note") and CategoryPickerActivity (after picking a category) so either action
 * updates the notification the same way, instead of only "Add note" doing it. Recomputed fresh
 * from SQLite each time rather than stashing an original body, since bank/category/note rarely
 * change together and this avoids any stash bookkeeping.
 */
fun refreshTxNotificationBody(context: Context, db: SQLiteDatabase, txId: Int, tag: String, id: Int) {
  val nm = context.getSystemService(NotificationManager::class.java) ?: return
  val sbn = nm.activeNotifications.firstOrNull { it.tag == tag && it.id == id } ?: return
  val notification = sbn.notification

  var bankLabel = ""
  var categoryName: String? = null
  var note: String? = null
  db.rawQuery(
    """
    SELECT t.bankName,
           (SELECT a.nickname FROM accounts a
            WHERE a.bank_name = t.bankName AND COALESCE(a.last4, '') = COALESCE(t.accountLast4, '')
            LIMIT 1) AS nickname,
           c.name AS categoryName,
           t.notes
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
      categoryName = cursor.getString(2)
      note = cursor.getString(3)
    }
  }

  // Always re-notify (even with the body unchanged) — the caller may be clearing a RemoteInput
  // "sending" spinner (a blank note submission) that still needs this notify() to resolve it,
  // regardless of whether there's a category/note to actually show.
  if (categoryName != null || !note.isNullOrEmpty()) {
    val parts = mutableListOf(bankLabel, categoryName ?: "Uncategorized")
    val currentNote = note
    if (!currentNote.isNullOrEmpty()) {
      parts.add(if (currentNote.length > NOTE_ELLIPSIS_MAX) currentNote.take(NOTE_ELLIPSIS_MAX).trimEnd() + "…" else currentNote)
    }
    val newBody = parts.joinToString(" • ")
    notification.extras.putCharSequence(Notification.EXTRA_TEXT, newBody)
    notification.extras.putCharSequence(Notification.EXTRA_BIG_TEXT, newBody)
  }
  nm.notify(tag, id, notification)
}
