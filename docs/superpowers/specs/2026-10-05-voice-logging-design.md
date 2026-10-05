# Voice logging for quick cash add (issue #9, voice piece)

## Goal

Let the user log a cash spend by speaking, from the existing `QuickAddCashScreen`, with speech recognition fully on-device. Widget and Android shortcuts from issue #9 are a separate follow-up that reuses this.

## Decisions (approved)

- Scope: voice logging only. Widget and shortcuts come after.
- Speech engine: Android `SpeechRecognizer`, on-device only (`EXTRA_PREFER_OFFLINE`, `createOnDeviceSpeechRecognizer` on Android 13+). No cloud fallback.
- Parsing: rule-based, pure TS. Result prefills the form; the user reviews and saves. No auto-save.
- Entry point: mic button on `src/screens/main/QuickAddCashScreen.tsx` only.

## Components

### Native: `modules/sms-reader`

- New Kotlin `VoiceRecognizer` inside `expo.modules.smsreader`.
- JS API in `src/SmsReaderModule.ts`: `startVoiceCapture(): Promise<string>` resolves with the final transcript; `cancelVoiceCapture()`.
- Partial results are emitted as a `voicePartial` event, same pattern as `screenLocked` (`SmsReaderModule.kt:29`).
- Rejects with typed errors: `NO_PERMISSION`, `OFFLINE_PACK_MISSING`, `NO_MATCH`, `CANCELLED`, `BUSY`. Never throws uncaught from the recognizer callbacks.
- `RECORD_AUDIO` added to `app.json` `android.permissions`; runtime request helper in `src/utils/permissions.ts`.
- Web stub and `SmsReader.types.ts` updated.
- Requires native rebuild (`npm run raqm:android`).

### Parser: `src/services/voiceParse.ts`

- Pure, Node-runnable. `parseVoiceTx(text) => { amount: number | null; merchant: string; categoryText: string }`.
- Amount: digits, decimals, `k` suffix, spoken numbers ("two fifty", "one and a half thousand"), optional rupee words.
- Merchant: text after "at/on/for/to/from", else remaining words with amount and filler stripped.
- Category: caller runs the existing word-match / merchant-rule lookups in `src/db/database.ts` on the text; no new categorization path.

### UI: `QuickAddCashScreen`

- Mic button next to the amount field, NativeWind `className`, theme tokens only.
- "Listening…" caption driven by `voicePartial`.
- Final transcript goes to `parseVoiceTx`, which prefills amount, merchant and category.
- Route param (`startVoice?: boolean`) lets the future widget/shortcut open the screen already listening.

## Flow and errors

1. Tap mic. Missing `RECORD_AUDIO` triggers a request; denial shows a toast and stops.
2. Partial text streams into the caption.
3. Final transcript is parsed and the form prefilled.
4. No amount parsed: toast "Didn't catch an amount", transcript saved into Notes, form otherwise untouched.
5. Save uses the existing `handleSave` path (duplicate check, in-flight guard).
6. `OFFLINE_PACK_MISSING`: explain it and offer to open Android speech settings.
7. Leaving the screen mid-capture calls `cancelVoiceCapture()`.

## Constraints from CLAUDE.md

- Comments one line max.
- NativeWind `className` with `cn()`, no hardcoded hex.
- Mic handler needs an in-flight guard against double-tap.
- Text input stays inside `KeyboardAwareScrollView`.
- Kotlin must never throw out of recognizer callbacks.

## Testing

- `voiceParse`: throwaway `npx tsx` table of phrases ("200 rupees at Swiggy", "spent two fifty on chai", "1.5k groceries", "swiggy 300").
- `cd apps/raqm && npx tsc --noEmit`.
- Kotlin: `./gradlew :app:compileDebugKotlin` after prebuild, plus native-module-reviewer.
- Device checks: permission grant and deny, airplane mode proves on-device, noisy-room miss, cancel mid-speech, missing language pack, double-tap mic.

## Out of scope

Widget, shortcuts, Home FAB, `AddTransactionScreen`, non-English locales, on-device LLM parsing.
