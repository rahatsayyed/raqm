import AVFoundation
import Foundation
import Speech

private enum VoiceError: Error {
  case badFormat
}

final class VoiceRecognizer {
  private static let watchdogSeconds: TimeInterval = 20
  private static let endAudioFallbackSeconds: TimeInterval = 3
  private static let noSpeechSeconds: TimeInterval = 8
  private static let pauseSeconds: TimeInterval = 1.5

  private let onPartial: (String) -> Void
  private let queue = DispatchQueue.main
  private var engine: AVAudioEngine?
  private var recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var onDone: ((String?, String?) -> Void)?
  private var sessionId = 0
  private var lastPartial = ""
  private var watchdog: DispatchWorkItem?
  private var endpoint: DispatchWorkItem?

  init(onPartial: @escaping (String) -> Void) {
    self.onPartial = onPartial
  }

  func isAvailable() -> Bool {
    guard let r = SFSpeechRecognizer(locale: Locale.current) else { return false }
    return r.isAvailable && r.supportsOnDeviceRecognition
  }

  func start(_ done: @escaping (String?, String?) -> Void) {
    queue.async {
      if self.onDone != nil {
        done(nil, "BUSY")
        return
      }
      guard let r = SFSpeechRecognizer(locale: Locale.current), r.isAvailable else {
        done(nil, "UNSUPPORTED")
        return
      }
      guard r.supportsOnDeviceRecognition else {
        done(nil, "OFFLINE_PACK_MISSING")
        return
      }
      guard SFSpeechRecognizer.authorizationStatus() == .authorized, self.micGranted() else {
        done(nil, "NO_PERMISSION")
        return
      }
      self.onDone = done
      self.sessionId += 1
      self.lastPartial = ""
      let id = self.sessionId
      do {
        try self.begin(r, id)
      } catch {
        self.finish(id, nil, "ERROR")
      }
    }
  }

  func cancel() {
    queue.async {
      self.finish(self.sessionId, nil, "CANCELLED")
    }
  }

  private func micGranted() -> Bool {
    #if os(iOS)
    return AVAudioSession.sharedInstance().recordPermission == .granted
    #else
    return true
    #endif
  }

  private func begin(_ r: SFSpeechRecognizer, _ id: Int) throws {
    #if os(iOS)
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.record, mode: .measurement, options: .duckOthers)
    try session.setActive(true, options: .notifyOthersOnDeactivation)
    #endif
    let eng = AVAudioEngine()
    let format = eng.inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else { throw VoiceError.badFormat }
    let req = SFSpeechAudioBufferRecognitionRequest()
    req.shouldReportPartialResults = true
    req.requiresOnDeviceRecognition = true
    request = req
    recognizer = r
    engine = eng
    eng.inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak req] buffer, _ in
      req?.append(buffer)
    }
    eng.prepare()
    try eng.start()
    task = r.recognitionTask(with: req) { [weak self] result, error in
      self?.queue.async { self?.handle(id, result, error) }
    }
    armWatchdog(id)
    armEndpoint(id, after: VoiceRecognizer.noSpeechSeconds, hadSpeech: false)
  }

  private func handle(_ id: Int, _ result: SFSpeechRecognitionResult?, _ error: Error?) {
    guard id == sessionId, onDone != nil else { return }
    if let result = result {
      let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
      if result.isFinal {
        finish(id, text.isEmpty ? nil : text, text.isEmpty ? "NO_MATCH" : nil)
        return
      }
      if !text.isEmpty && text != lastPartial {
        lastPartial = text
        armWatchdog(id)
        armEndpoint(id, after: VoiceRecognizer.pauseSeconds, hadSpeech: true)
        onPartial(text)
      }
      return
    }
    if let error = error {
      if !lastPartial.isEmpty {
        finish(id, lastPartial, nil)
      } else {
        finish(id, nil, VoiceRecognizer.mapError(error))
      }
    }
  }

  private static func mapError(_ error: Error) -> String {
    let ns = error as NSError
    NSLog("VoiceRecognizer error %@ %ld", ns.domain, ns.code)
    switch (ns.domain, ns.code) {
    case ("kLSRErrorDomain", 102), ("kLSRErrorDomain", 201):
      return "OFFLINE_PACK_MISSING"
    case ("kAFAssistantErrorDomain", 1110):
      return "NO_MATCH"
    default:
      return "ERROR"
    }
  }

  private func armWatchdog(_ id: Int, seconds: TimeInterval = VoiceRecognizer.watchdogSeconds) {
    watchdog?.cancel()
    let item = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      let text = self.lastPartial
      self.finish(id, text.isEmpty ? nil : text, text.isEmpty ? "ERROR" : nil)
    }
    watchdog = item
    queue.asyncAfter(deadline: .now() + seconds, execute: item)
  }

  private func armEndpoint(_ id: Int, after seconds: TimeInterval, hadSpeech: Bool) {
    endpoint?.cancel()
    let item = DispatchWorkItem { [weak self] in
      guard let self = self, id == self.sessionId, self.onDone != nil else { return }
      if hadSpeech {
        self.stopCapture()
        self.request?.endAudio()
        self.armWatchdog(id, seconds: VoiceRecognizer.endAudioFallbackSeconds)
      } else {
        self.finish(id, nil, "NO_MATCH")
      }
    }
    endpoint = item
    queue.asyncAfter(deadline: .now() + seconds, execute: item)
  }

  private func stopCapture() {
    guard let eng = engine else { return }
    if eng.isRunning { eng.stop() }
    eng.inputNode.removeTap(onBus: 0)
    engine = nil
  }

  private func finish(_ id: Int, _ transcript: String?, _ code: String?) {
    guard id == sessionId, let cb = onDone else { return }
    onDone = nil
    watchdog?.cancel()
    endpoint?.cancel()
    watchdog = nil
    endpoint = nil
    teardown()
    cb(transcript, code)
  }

  private func teardown() {
    stopCapture()
    request?.endAudio()
    task?.cancel()
    task = nil
    request = nil
    recognizer = nil
    #if os(iOS)
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    #endif
  }
}

enum VoicePermission {
  static func request(_ completion: @escaping (Bool) -> Void) {
    SFSpeechRecognizer.requestAuthorization { status in
      guard status == .authorized else {
        DispatchQueue.main.async { completion(false) }
        return
      }
      #if os(iOS)
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        DispatchQueue.main.async { completion(granted) }
      }
      #else
      DispatchQueue.main.async { completion(true) }
      #endif
    }
  }
}
