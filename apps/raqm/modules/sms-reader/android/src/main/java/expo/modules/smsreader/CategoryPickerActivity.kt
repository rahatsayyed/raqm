package expo.modules.smsreader

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.os.Bundle
import android.util.Log
import java.io.File

/**
 * A translucent, no-history Activity that lets the user pick a category straight from the
 * "Category" notification action, without ever bringing Raqm's real UI to the foreground —
 * see AndroidManifest.xml's taskAffinity="" + excludeFromRecents on this entry, and
 * SmsReaderModule.addCategoryAction which points the action's PendingIntent here directly.
 * Reads/writes SQLite directly rather than going through the JS layer so this keeps working
 * even when the app process is fully killed (the JS/TaskManager background path is unreliable
 * in that state — see notes on the "Add note" action).
 */
class CategoryPickerActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val txId = intent.getIntExtra(EXTRA_TX_ID, -1)
    if (txId == -1) {
      finish()
      return
    }

    val dbPath = File(filesDir.canonicalPath, "SQLite/raqm.db").path
    val db = try {
      SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READWRITE)
    } catch (e: Exception) {
      Log.e("CategoryPickerActivity", "Could not open raqm.db", e)
      finish()
      return
    }

    val ids = mutableListOf<Int>()
    val labels = mutableListOf<String>()
    try {
      db.rawQuery("SELECT id, name, emoji FROM categories ORDER BY name ASC", null).use { cursor ->
        while (cursor.moveToNext()) {
          ids.add(cursor.getInt(0))
          labels.add("${cursor.getString(2)}  ${cursor.getString(1)}")
        }
      }
    } catch (e: Exception) {
      Log.e("CategoryPickerActivity", "Could not read categories", e)
      db.close()
      finish()
      return
    }

    if (labels.isEmpty()) {
      db.close()
      finish()
      return
    }

    AlertDialog.Builder(this)
      .setTitle("Set category")
      .setItems(labels.toTypedArray()) { _, index ->
        try {
          // Every other category-change path (see TransactionDetailScreen's CategorySheet
          // onSelect) clears subcategory_id alongside category_id — a subcategory only makes
          // sense scoped to its parent category, so leaving the old one here would point at a
          // subcategory belonging to whatever category this tx had before.
          val values = ContentValues().apply {
            put("category_id", ids[index])
            putNull("subcategory_id")
          }
          db.update("transactions", values, "id = ?", arrayOf(txId.toString()))
        } catch (e: Exception) {
          Log.e("CategoryPickerActivity", "Could not update category", e)
        } finally {
          db.close()
          finish()
        }
      }
      .setOnCancelListener {
        db.close()
        finish()
      }
      .show()
  }

  companion object {
    const val EXTRA_TX_ID = "txId"
  }
}
