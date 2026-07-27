package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

const val NEW_SMS_ACTION = "expo.modules.smsreader.NEW_SMS"
private const val TAG = "RaqmSms"

class SmsReaderModule : Module() {
  private var internalReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    Events("onNewSms")

    OnCreate {
      val context = appContext.reactContext
      if (context == null) {
        // If reactContext isn't attached yet when this module initializes, registration
        // is silently skipped — nothing else in this pipeline would log or throw, it
        // would just look like a receiver that registered fine but never got a broadcast.
        Log.w(TAG, "OnCreate: appContext.reactContext is NULL — internal receiver NOT registered")
        return@OnCreate
      }
      internalReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          val body = intent.getStringExtra("body") ?: return
          val sender = intent.getStringExtra("sender") ?: ""
          val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())
          Log.d(TAG, "internal receiver fired, sender=$sender, dispatching sendEvent(onNewSms)")
          sendEvent(
            "onNewSms", mapOf(
              "body" to body,
              "sender" to sender,
              "timestamp" to timestamp,
            )
          )
        }
      }
      // Context#registerReceiver(receiver, filter, flags: Int) only exists on API 33+ —
      // calling it directly on this project's minSdkVersion 24 throws NoSuchMethodError
      // at runtime on any Android 7–12 device, silently killing this OnCreate block (and
      // with it, the only listener that lets a live-arriving SMS ever reach JS).
      // ContextCompat.registerReceiver branches correctly per API level.
      ContextCompat.registerReceiver(
        context,
        internalReceiver,
        IntentFilter(NEW_SMS_ACTION),
        ContextCompat.RECEIVER_NOT_EXPORTED,
      )
      Log.d(TAG, "OnCreate: internal receiver registered for $NEW_SMS_ACTION")
    }

    OnDestroy {
      Log.d(TAG, "OnDestroy firing — unregistering internal receiver")
      val context = appContext.reactContext ?: return@OnDestroy
      internalReceiver?.let {
        try { context.unregisterReceiver(it) } catch (_: Exception) {}
      }
      internalReceiver = null
    }

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
