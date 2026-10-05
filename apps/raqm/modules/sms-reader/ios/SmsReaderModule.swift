import ExpoModulesCore

public class SmsReaderModule: Module {
  private lazy var voice = VoiceRecognizer(onPartial: { [weak self] text in
    self?.sendEvent("voicePartial", ["text": text])
  })

  public func definition() -> ModuleDefinition {
    Name("SmsReader")

    Events("voicePartial")

    OnCreate {
      QuickAdd.registerShortcut()
    }

    // Reads (and clears) the pending quick-add extra captured by
    // SmsReaderAppDelegateSubscriber. Mirrors the Android module's consumeLaunchDeepLink.
    Function("consumeLaunchDeepLink") { () -> [String: Any?]? in
      guard let pending = QuickAdd.pending else { return nil }
      QuickAdd.pending = nil
      return [
        "openQuickAdd": pending.openQuickAdd,
        "openTransaction": pending.openTransaction,
        "startVoice": pending.startVoice,
      ]
    }

    Function("isVoiceAvailable") { () -> Bool in
      self.voice.isAvailable()
    }

    AsyncFunction("startVoiceCapture") { (promise: Promise) in
      self.voice.start { text, code in
        if let text = text {
          promise.resolve(text)
        } else {
          promise.reject(code ?? "ERROR", code ?? "ERROR")
        }
      }
    }

    AsyncFunction("cancelVoiceCapture") { () -> Void in
      self.voice.cancel()
    }

    AsyncFunction("requestVoicePermission") { (promise: Promise) in
      VoicePermission.request { granted in
        promise.resolve(granted)
      }
    }
  }
}
