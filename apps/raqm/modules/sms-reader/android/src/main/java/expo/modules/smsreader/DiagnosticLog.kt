package expo.modules.smsreader

import android.content.Context
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Single native-side diagnostic log writer. Writes ONLY to native.log — js.log is
 * JS's own file, written only by JS (src/services/logger.ts). Two separate files
 * avoid interleaved/corrupted writes from two independent processes on one file.
 * Never throws: a logging failure must never break the caller (same invariant as
 * NotificationListenerService must never throw — see CLAUDE.md).
 */
object DiagnosticLog {
    private const val MAX_BYTES = 3 * 1024 * 1024 // 3 MB
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun logFile(context: Context): File = File(context.filesDir, "native.log")

    @Synchronized
    fun write(context: Context, tag: String, message: String) {
        try {
            val file = logFile(context)
            if (file.exists() && file.length() > MAX_BYTES) {
                trimOldestHalf(file)
            }
            // Strip embedded tabs/newlines so one write is always exactly one line.
            val safeMessage = message.replace("\t", " ").replace("\n", " ")
            val timestamp = isoFormat.format(Date())
            FileWriter(file, true).use { it.appendLine("$timestamp\t$tag\t$safeMessage") }
        } catch (e: Exception) {
            // Swallow — logging must never crash the caller.
        }
    }

    private fun trimOldestHalf(file: File) {
        try {
            val lines = file.readLines()
            val keepFrom = lines.size / 2
            file.writeText(lines.subList(keepFrom, lines.size).joinToString("\n", postfix = "\n"))
        } catch (e: Exception) {
            // If trimming fails, leave the file as-is rather than losing everything —
            // the next successful write will just re-attempt the trim.
        }
    }
}
