package expo.modules.smsreader

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

class VoiceRecognizer(
  private val context: Context,
  private val onPartial: (String) -> Unit,
) {
  private val main = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var onDone: ((String?, String?) -> Unit)? = null

  fun isAvailable(): Boolean = try {
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
  } catch (e: Exception) {
    false
  }

  fun start(done: (String?, String?) -> Unit) {
    main.post {
      try {
        if (onDone != null) {
          done(null, "BUSY")
          return@post
        }
        if (!isAvailable()) {
          done(null, "UNSUPPORTED")
          return@post
        }
        onDone = done
        val r = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        recognizer = r
        r.setRecognitionListener(listener)
        r.startListening(
          Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          },
        )
      } catch (e: Exception) {
        DiagnosticLog.write(context, "error.caught", "voice.start: ${e.message}")
        finish(null, "ERROR")
      }
    }
  }

  fun cancel() {
    main.post { finish(null, "CANCELLED") }
  }

  private fun finish(transcript: String?, code: String?) {
    val cb = onDone ?: return
    onDone = null
    try {
      recognizer?.destroy()
    } catch (e: Exception) {
      DiagnosticLog.write(context, "error.caught", "voice.destroy: ${e.message}")
    }
    recognizer = null
    try {
      cb(transcript, code)
    } catch (e: Exception) {
      DiagnosticLog.write(context, "error.caught", "voice.callback: ${e.message}")
    }
  }

  private fun errorCode(error: Int): String = when (error) {
    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "NO_MATCH"
    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "OFFLINE_PACK_MISSING"
    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "NO_PERMISSION"
    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "BUSY"
    else -> "ERROR"
  }

  private fun firstResult(bundle: Bundle?): String? =
    bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onError(error: Int) {
      try {
        finish(null, errorCode(error))
      } catch (e: Exception) {
        DiagnosticLog.write(context, "error.caught", "voice.onError: ${e.message}")
      }
    }

    override fun onResults(results: Bundle?) {
      try {
        val text = firstResult(results)
        if (text.isNullOrBlank()) finish(null, "NO_MATCH") else finish(text, null)
      } catch (e: Exception) {
        DiagnosticLog.write(context, "error.caught", "voice.onResults: ${e.message}")
      }
    }

    override fun onPartialResults(partialResults: Bundle?) {
      try {
        firstResult(partialResults)?.takeIf { it.isNotBlank() }?.let(onPartial)
      } catch (e: Exception) {
        DiagnosticLog.write(context, "error.caught", "voice.onPartial: ${e.message}")
      }
    }
  }
}
