package expo.modules.smsreader

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
  }
}
