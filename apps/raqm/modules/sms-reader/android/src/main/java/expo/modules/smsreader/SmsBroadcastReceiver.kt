package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    for (sms in messages) {
      val body = sms.messageBody ?: continue
      val sender = sms.originatingAddress ?: ""
      val timestamp = sms.timestampMillis

      // Forward every SMS to JS — BankParserFactory.isKnownBankSender()/parse() there is
      // the same authoritative sender-based check Re-scan and onboarding scan use. JS
      // (DashboardScreen) parses, inserts, and posts the rich actionable transaction
      // notification itself (postTxNotification in notifications.ts) — this receiver no
      // longer builds its own notification, since a native body-keyword heuristic here
      // used to gate a plain "New bank message" alert and silently dropped real bank
      // messages worded differently than the keyword list expected.
      context.sendBroadcast(
        Intent(NEW_SMS_ACTION).apply {
          `package` = context.packageName
          putExtra("body", body)
          putExtra("sender", sender)
          putExtra("timestamp", timestamp)
        }
      )
    }
  }
}
