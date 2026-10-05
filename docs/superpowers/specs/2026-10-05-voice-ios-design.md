# iOS voice logging and shortcut (issue #9, part B)

## Goal

Give iOS the same on-device voice cash-spend as Android: a mic button on `QuickAddCashScreen` and a Home Screen Quick Action that opens it already listening. Builds on `2026-10-05-voice-logging-design.md` and `2026-10-05-voice-entry-points-design.md`.

## Constraints

- On-device only: `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true`; unavailable when `supportsOnDeviceRecognition` is false. No cloud fallback.
- iOS deployment target is 16.4 (podspec): no `AVAudioApplication`; use `AVAudioSession` for microphone permission.
- Code cannot be compiled or run in this environment (Command Line Tools only, no Xcode, `apps/raqm/ios` not generated). Verification here is: `tsc`, `swiftc -typecheck` of the Speech/AVAudioEngine logic against the macOS SDK where the APIs exist, Expo API signatures checked against `node_modules/expo-modules-core/ios`, and an independent review. Compile and device checks are pending Xcode or an EAS build and must be stated as such.
- Comments one line max. Android behaviour unchanged.
- No widget or tile equivalent on iOS (out of scope).

## Native (modules/sms-reader/ios)

- New `VoiceRecognizer.swift`: `SFSpeechRecognizer(locale: Locale.current)` + `AVAudioEngine` + `SFSpeechAudioBufferRecognitionRequest` (`shouldReportPartialResults = true`, `requiresOnDeviceRecognition = true`). Same error codes as Android: `NO_PERMISSION`, `OFFLINE_PACK_MISSING` (recognizer exists but no on-device model), `UNSUPPORTED` (no recognizer or unavailable), `NO_MATCH` (empty result), `CANCELLED`, `BUSY`, `ERROR`. Same 20 s watchdog re-armed on each partial, a per-session guard so late callbacks from a torn-down session are ignored, the promise settles once, teardown stops the engine, removes the tap and deactivates the audio session on every exit path. Nothing throws out of a callback.
- `SmsReaderModule.swift`: `Events("voicePartial")`; `Function("isVoiceAvailable")`; `AsyncFunction("startVoiceCapture") { (promise: Promise) in ... }`; `AsyncFunction("cancelVoiceCapture")`; `AsyncFunction("requestVoicePermission")` returning Bool (requests Speech authorization then microphone permission). Uses `promise.resolve(_:)`, `promise.reject(_ code: String, _ description: String)`, `sendEvent("voicePartial", ["text": ...])` (verified in expo-modules-core).
- `app.json` `ios.infoPlist`: `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription`.

## Shortcut

- `QuickAdd.swift`: `Pending` gains `startVoice: Bool`; second shortcut type `com.raqm.quickAddVoice`, title "Voice cash spend", icon `mic.circle`; `registerShortcut` sets both items; `handle` accepts both types (voice sets `openQuickAdd = true` and `startVoice = true`).
- `SmsReaderModule.swift` `consumeLaunchDeepLink` also returns `startVoice`. `SmsReaderAppDelegateSubscriber` needs no change (it already routes through `QuickAdd.handle`).

## JS

- `SmsReaderModule.ts`: `requestVoicePermission(): Promise<boolean>` calling the native function via optional chaining (undefined on Android).
- `src/utils/permissions.ts`: `requestRecordAudioPermission` returns `requestVoicePermission()` on iOS and keeps `PermissionsAndroid` on Android. Native prompts therefore happen inside the screen's existing permission-pending window, so the AppState handler does not cancel capture while an iOS permission dialog shows.
- New `src/utils/toast.ts`: `showToast(message)` uses `ToastAndroid` on Android and a short `Alert.alert` on iOS.
- `QuickAddCashScreen.tsx`: the voice messages use `showToast` (the "Cash spend saved" toast stays as is); the missing-model dialog uses platform copy and action: Android unchanged, iOS "Enable Dictation and download your language in Settings > General > Keyboard" with `Linking.openSettings()`.

## Out of scope

Widgets/tile on iOS, non-default locales beyond `Locale.current`, parser changes, changing Android behaviour.

## Pending verification (cannot be done here)

Compile of the Swift sources and pod, the permission flows, on-device recognition on a real iPhone, Quick Action cold and warm launch, behaviour when Dictation is disabled or the language model is missing.
