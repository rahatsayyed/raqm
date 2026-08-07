package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    AsyncFunction("readInbox") { fromTimestamp: Double, toTimestamp: Double ->
      val context = appContext.reactContext ?: throw Exception("No context available")
      val resolver = context.contentResolver
      val uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(
        Telephony.Sms.BODY,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.DATE,
      )
      val selection = "${Telephony.Sms.DATE} >= ? AND ${Telephony.Sms.DATE} <= ?"
      val selectionArgs = arrayOf(fromTimestamp.toLong().toString(), toTimestamp.toLong().toString())
      val sortOrder = "${Telephony.Sms.DATE} DESC"

      val results = mutableListOf<Map<String, Any>>()
      resolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
        val bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val addressIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (cursor.moveToNext()) {
          results.add(
            mapOf(
              "body" to cursor.getString(bodyIdx),
              "sender" to (cursor.getString(addressIdx) ?: ""),
              "timestamp" to cursor.getLong(dateIdx),
            )
          )
        }
      }
      results
    }

    AsyncFunction("getEarliestMessageDate") {
      val context = appContext.reactContext ?: throw Exception("No context available")
      val resolver = context.contentResolver
      val uri = Telephony.Sms.Inbox.CONTENT_URI
      val projection = arrayOf(Telephony.Sms.DATE)
      resolver.query(uri, projection, null, null, "${Telephony.Sms.DATE} ASC")?.use { cursor ->
        if (cursor.moveToFirst()) cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)).toDouble()
        else 0.0
      } ?: 0.0
    }

    Function("openNotificationListenerSettings") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      }
    }

    // Appends a "Category" action to an already-posted tx notification whose PendingIntent
    // opens CategoryPickerActivity directly (not MainActivity) — see that Activity's doc
    // comment for why. expo-notifications' JS category API has no way to point an action's
    // PendingIntent anywhere but the app's launch intent, so this action is added natively,
    // after the fact, instead of being registered through Notifications.setNotificationCategoryAsync.
    Function("addCategoryAction") { notificationId: String, txId: Int ->
      val context = appContext.reactContext ?: return@Function
      val nm = context.getSystemService(NotificationManager::class.java) ?: return@Function
      val sbn = nm.activeNotifications.firstOrNull { it.tag == notificationId } ?: return@Function

      val pickerIntent = Intent(context, CategoryPickerActivity::class.java).apply {
        putExtra(CategoryPickerActivity.EXTRA_TX_ID, txId)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        notificationId.hashCode(),
        pickerIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val action = Notification.Action.Builder(0, "Category", pendingIntent).build()
      val rebuilt = Notification.Builder.recoverBuilder(context, sbn.notification)
        .addAction(action)
        .build()
      nm.notify(sbn.tag, sbn.id, rebuilt)
    }
  }
}
