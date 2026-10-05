# Voice Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-device voice mic button to `QuickAddCashScreen` that fills amount, merchant and category from speech.

**Architecture:** A Kotlin `VoiceRecognizer` in the `sms-reader` Expo module wraps Android's on-device `SpeechRecognizer` and is exposed through three JS functions plus a partial-result event. A pure TS parser (`voiceParse.ts`) turns the transcript into `{ amount, merchant, categoryText }`. The screen prefills its form from that result and the user saves through the unchanged `handleSave`.

**Tech Stack:** Expo SDK 57 module (Kotlin), React Native 0.86, NativeWind, TypeScript, `npx tsx` for pure-logic checks.

**Spec:** `docs/superpowers/specs/2026-10-05-voice-logging-design.md`

## Global Constraints

- Speech is on-device only: `createOnDeviceSpeechRecognizer` (Android 13+, API 33) with `EXTRA_PREFER_OFFLINE`; below API 33 voice is unavailable, never a cloud fallback.
- No auto-save: the parsed result only prefills the form; saving stays `handleSave` (duplicate check and `saving` in-flight guard).
- Mic button on `QuickAddCashScreen` only; no widget, shortcut, Home FAB or `AddTransactionScreen` work.
- Comments are one line max (CLAUDE.md hard rule); no multi-line blocks or docstrings.
- Styling is NativeWind `className` with `cn()` from `src/utils/cn.ts`; theme tokens only, no hardcoded hex.
- Kotlin recognizer callbacks must never throw.
- Typecheck from `apps/raqm`: `npx tsc --noEmit`.
- Never commit without the user's go-ahead; commit messages are conventional (`feat(raqm): …`) with no session trailer.

## Review Focus

- Amount spoken as digits with commas ("paid 1,200 to zomato") must parse as 1200, not 1.
- Two numbers in one phrase ("one coffee for fifty") should pick the likelier amount (50), not the first number word.
- Transcript with no amount must keep the form untouched and save the text into Notes, not drop it.
- Double-tapping the mic must not start two recognizers.
- Leaving the screen while listening must cancel the recognizer and leave no dangling promise.

---

## File Structure

- Create `apps/raqm/src/services/voiceParse.ts`: pure transcript parser, no imports.
- Create `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/VoiceRecognizer.kt`: recognizer wrapper.
- Modify `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/SmsReaderModule.kt`: events and functions.
- Modify `apps/raqm/modules/sms-reader/src/SmsReaderModule.ts`: JS API.
- Modify `apps/raqm/modules/sms-reader/src/SmsReader.types.ts`: `VoiceErrorCode`.
- Modify `apps/raqm/src/utils/permissions.ts`: `requestRecordAudioPermission`.
- Modify `apps/raqm/app.json`: `RECORD_AUDIO`.
- Modify `apps/raqm/src/navigation/types.ts`: `startVoice` param.
- Modify `apps/raqm/src/screens/main/QuickAddCashScreen.tsx`: mic UI and prefill.

---

### Task 1: Transcript parser

**Files:**
- Create: `apps/raqm/src/services/voiceParse.ts`
- Throwaway check (do not commit): `apps/raqm/voiceParse.check.ts`

**Interfaces:**
- Produces: `parseVoiceTx(text: string): VoiceTx` and `interface VoiceTx { amount: number | null; merchant: string; categoryText: string }`. `merchant` is title-cased; `categoryText` is the lowercase transcript with the amount words removed.

- [ ] **Step 1: Write the failing check**

Create `apps/raqm/voiceParse.check.ts`:

```ts
import { parseVoiceTx } from './src/services/voiceParse';

const cases: [string, number | null, string][] = [
  ['200 rupees at Swiggy', 200, 'Swiggy'],
  ['spent two fifty on chai', 250, 'Chai'],
  ['1.5k groceries', 1500, 'Groceries'],
  ['swiggy 300', 300, 'Swiggy'],
  ['one and a half thousand for rent', 1500, 'Rent'],
  ['twenty five rupees auto', 25, 'Auto'],
  ['two hundred and fifty at uber', 250, 'Uber'],
  ['paid 1,200 to zomato', 1200, 'Zomato'],
  ['rs 99 for movie tickets', 99, 'Movie Tickets'],
  ['bought one coffee for fifty', 50, 'Coffee'],
  ['coffee', null, 'Coffee'],
  ['', null, ''],
];

let failed = 0;
for (const [text, amount, merchant] of cases) {
  const r = parseVoiceTx(text);
  const ok = r.amount === amount && r.merchant === merchant;
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(text), '->', JSON.stringify(r));
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `apps/raqm`): `npx tsx voiceParse.check.ts`
Expected: FAIL with a module-not-found error for `./src/services/voiceParse`.

- [ ] **Step 3: Write the implementation**

Create `apps/raqm/src/services/voiceParse.ts`:

```ts
export interface VoiceTx {
  amount: number | null;
  merchant: string;
  categoryText: string;
}

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = {
  k: 1000, thousand: 1000, lakh: 100000, lac: 100000, crore: 10000000,
};
const PREPOSITIONS = new Set(['at', 'on', 'for', 'to', 'from']);
const FILLER = new Set([
  'spent', 'paid', 'pay', 'bought', 'buy', 'at', 'on', 'for', 'to', 'from', 'in', 'of', 'the',
  'a', 'an', 'rupees', 'rupee', 'rs', 'inr', 'only', 'and', 'using', 'with',
]);

interface Candidate {
  value: number;
  start: number;
  end: number;
  digits: boolean;
}

const isNumberWord = (w: string | undefined) =>
  w !== undefined && (ONES[w] !== undefined || TENS[w] !== undefined);

function parseDigits(tokens: string[], i: number): Candidate | null {
  const t = tokens[i] ?? '';
  if (!/^\d/.test(t)) return null;
  let value = parseFloat(t);
  let end = i + 1;
  const scale = SCALES[tokens[end] ?? ''];
  if (scale !== undefined) {
    value *= scale;
    end++;
  } else if (tokens[end] === 'hundred') {
    value *= 100;
    end++;
  }
  return { value, start: i, end, digits: true };
}

function parseWords(tokens: string[], i: number): Candidate | null {
  let total = 0;
  let current = 0;
  let j = i;
  let seen = false;
  let prevSingleOnes = false;
  while (j < tokens.length) {
    const w = tokens[j] ?? '';
    const ones = ONES[w];
    const tens = TENS[w];
    const scale = SCALES[w];
    if (w === 'and' && seen && tokens[j + 1] === 'a' && tokens[j + 2] === 'half') {
      current += 0.5;
      j += 3;
      prevSingleOnes = false;
      continue;
    }
    if (w === 'and' && seen && isNumberWord(tokens[j + 1])) {
      j++;
      continue;
    }
    if (ones !== undefined || tens !== undefined) {
      const v = (ones ?? tens) as number;
      // "two fifty" is colloquial for 250
      if (prevSingleOnes && v >= 10 && current >= 1 && current <= 9) current = current * 100 + v;
      else current += v;
      prevSingleOnes = ones !== undefined && ones >= 1 && ones <= 9 && current === ones;
    } else if (w === 'hundred') {
      current = (current || 1) * 100;
      prevSingleOnes = false;
    } else if (scale !== undefined && w !== 'k') {
      total += (current || 1) * scale;
      current = 0;
      prevSingleOnes = false;
    } else {
      break;
    }
    seen = true;
    j++;
  }
  if (!seen) return null;
  return { value: total + current, start: i, end: j, digits: false };
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function parseVoiceTx(text: string): VoiceTx {
  const tokens =
    text
      .toLowerCase()
      .replace(/₹/g, ' rs ')
      .replace(/(\d),(?=\d{3})/g, '$1')
      .match(/\d+(?:\.\d+)?|[a-z]+/g) ?? [];

  const candidates: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const c = parseDigits(tokens, i) ?? parseWords(tokens, i);
    if (c) {
      candidates.push(c);
      i = c.end - 1;
    }
  }
  const picked = candidates.find((c) => c.digits) ?? candidates[candidates.length - 1] ?? null;

  const rest = tokens.filter((_, idx) => !picked || idx < picked.start || idx >= picked.end);
  let lastPrep = -1;
  rest.forEach((w, idx) => {
    if (PREPOSITIONS.has(w)) lastPrep = idx;
  });
  const afterPrep = lastPrep >= 0 ? rest.slice(lastPrep + 1) : rest;
  const clean = (ws: string[]) => ws.filter((w) => !FILLER.has(w) && !isNumberWord(w));
  const merchantWords = clean(afterPrep).length ? clean(afterPrep) : clean(rest);

  return {
    amount: picked ? picked.value : null,
    merchant: titleCase(merchantWords.join(' ')),
    categoryText: rest.filter((w) => !FILLER.has(w)).join(' '),
  };
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run (from `apps/raqm`): `npx tsx voiceParse.check.ts`
Expected: every line `PASS`, exit code 0. If a case fails, fix `voiceParse.ts` (not the table) unless the expectation is wrong for a reason you can state.

- [ ] **Step 5: Typecheck, delete the throwaway, commit**

```bash
cd apps/raqm && npx tsc --noEmit && rm voiceParse.check.ts
git add src/services/voiceParse.ts
git commit -m "feat(raqm): add voice transcript parser"
```

---

### Task 2: Native recognizer and JS API

**Files:**
- Create: `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/VoiceRecognizer.kt`
- Modify: `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/SmsReaderModule.kt` (`Events` at line 29, `OnDestroy` at line 70, add functions after `consumeLaunchDeepLink`)
- Modify: `apps/raqm/modules/sms-reader/src/SmsReaderModule.ts`
- Modify: `apps/raqm/modules/sms-reader/src/SmsReader.types.ts`
- Modify: `apps/raqm/src/utils/permissions.ts`
- Modify: `apps/raqm/app.json` (`android.permissions`, line ~19)

**Interfaces:**
- Produces (JS, from `modules/sms-reader/src/SmsReaderModule`):
  - `isVoiceAvailable(): boolean` (false on iOS, Android < 13, or when no on-device pack)
  - `startVoiceCapture(): Promise<string>` resolves with the final transcript; rejects with `code` in `VoiceErrorCode`
  - `cancelVoiceCapture(): Promise<void>`
  - `addVoicePartialListener(listener: (e: { text: string }) => void): EventSubscription`
  - `type VoiceErrorCode = 'NO_PERMISSION' | 'OFFLINE_PACK_MISSING' | 'NO_MATCH' | 'CANCELLED' | 'BUSY' | 'UNSUPPORTED' | 'ERROR'`
- Produces: `requestRecordAudioPermission(): Promise<boolean>` in `src/utils/permissions.ts`.

- [ ] **Step 1: Add the permission**

In `apps/raqm/app.json`, add `"android.permission.RECORD_AUDIO",` to the `android.permissions` array. Append to `apps/raqm/src/utils/permissions.ts`:

```ts

export async function requestRecordAudioPermission(): Promise<boolean> {
  const alreadyGranted = await PermissionsAndroid.check('android.permission.RECORD_AUDIO');
  if (alreadyGranted) return true;
  const result = await PermissionsAndroid.request('android.permission.RECORD_AUDIO');
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
```

- [ ] **Step 2: Write `VoiceRecognizer.kt`**

```kotlin
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
```

- [ ] **Step 3: Wire it into `SmsReaderModule.kt`**

Add the import `import expo.modules.kotlin.Promise` next to the other `expo.modules.kotlin` imports. Add a field below `screenOffReceiver`:

```kotlin
  private var voice: VoiceRecognizer? = null

  private fun voiceRecognizer(): VoiceRecognizer? {
    val context = appContext.reactContext ?: return null
    return voice ?: VoiceRecognizer(context) { text ->
      sendEvent("voicePartial", mapOf("text" to text))
    }.also { voice = it }
  }
```

Change line 29 to `Events("screenLocked", "voicePartial")`. In `OnDestroy`, before `screenOffReceiver = null`, add `voice?.cancel()` and `voice = null`. After the `Function("consumeLaunchDeepLink")` block, add:

```kotlin
    Function("isVoiceAvailable") {
      voiceRecognizer()?.isAvailable() ?: false
    }

    AsyncFunction("startVoiceCapture") { promise: Promise ->
      val v = voiceRecognizer()
      if (v == null) {
        promise.reject("ERROR", "No React context", null)
        return@AsyncFunction
      }
      v.start { text, code ->
        if (text != null) promise.resolve(text) else promise.reject(code ?: "ERROR", code ?: "ERROR", null)
      }
    }

    AsyncFunction("cancelVoiceCapture") {
      voice?.cancel()
    }
```

- [ ] **Step 4: Add the JS API**

In `SmsReader.types.ts` append:

```ts
export type VoiceErrorCode =
  | 'NO_PERMISSION'
  | 'OFFLINE_PACK_MISSING'
  | 'NO_MATCH'
  | 'CANCELLED'
  | 'BUSY'
  | 'UNSUPPORTED'
  | 'ERROR';
```

In `SmsReaderModule.ts` append (the optional call keeps iOS, which has no such native function, from throwing):

```ts

/** True only on Android 13+ with an on-device recognizer; false elsewhere, never cloud. */
export function isVoiceAvailable(): boolean {
  return native.isVoiceAvailable?.() ?? false;
}

/** Resolves with the final transcript; rejects with a VoiceErrorCode as `error.code`. */
export function startVoiceCapture(): Promise<string> {
  return native.startVoiceCapture();
}

export function cancelVoiceCapture(): Promise<void> {
  return native.cancelVoiceCapture?.() ?? Promise.resolve();
}

export function addVoicePartialListener(listener: (e: { text: string }) => void): EventSubscription {
  return native.addListener('voicePartial', listener);
}
```

- [ ] **Step 5: Verify**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.
Then regenerate native and compile Kotlin: `cd apps/raqm && npx expo prebuild --platform android && cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL. If the SDK 57 `Promise.reject` signature differs, check https://docs.expo.dev/versions/v57.0.0/ and adjust.

- [ ] **Step 6: Review and commit**

Dispatch the `native-module-reviewer` agent on `VoiceRecognizer.kt` and the `SmsReaderModule.kt` diff; fix anything it flags.

```bash
git add apps/raqm/modules/sms-reader apps/raqm/src/utils/permissions.ts apps/raqm/app.json
git commit -m "feat(raqm): on-device voice capture in sms-reader module"
```

---

### Task 3: Mic button on QuickAddCashScreen

**Files:**
- Modify: `apps/raqm/src/navigation/types.ts:54`
- Modify: `apps/raqm/src/screens/main/QuickAddCashScreen.tsx`

**Interfaces:**
- Consumes: `parseVoiceTx` (Task 1); `isVoiceAvailable`, `startVoiceCapture`, `cancelVoiceCapture`, `addVoicePartialListener`, `VoiceErrorCode` and `requestRecordAudioPermission` (Task 2); `getWordMatchCategoryForMerchant(merchant: string)` and `getCategoryRuleForMerchant(merchant: string)` from `src/db/database.ts`, both returning `{ categoryId: number; subcategoryId: number | null } | null`.
- Produces: route param `startVoice?: boolean` on `QuickAddCash`, so the future widget/shortcut can open the screen already listening.

- [ ] **Step 1: Extend the route param**

In `src/navigation/types.ts` change the `QuickAddCash` line to:

```ts
  QuickAddCash: { pickedCategoryId?: number; pickedSubcategoryId?: number; startVoice?: boolean } | undefined;
```

- [ ] **Step 2: Add imports and state**

At the top of `QuickAddCashScreen.tsx` change the react-native import to include `Alert` and `Linking`, and add:

```tsx
import { cn } from '../../utils/cn';
import { getCategories, getCategoryRuleForMerchant, getWordMatchCategoryForMerchant } from '../../db/database';
import { parseVoiceTx } from '../../services/voiceParse';
import { requestRecordAudioPermission } from '../../utils/permissions';
import {
  addVoicePartialListener,
  cancelVoiceCapture,
  isVoiceAvailable,
  startVoiceCapture,
} from '../../../modules/sms-reader/src/SmsReaderModule';
import type { VoiceErrorCode } from '../../../modules/sms-reader/src/SmsReader.types';
```

Replace the existing `import { getCategories } from '../../db/database';` line with the combined import above. Inside the component, after the `saving` state, add:

```tsx
  const voiceBusy = useRef(false);
  const [voiceSupported] = useState(() => isVoiceAvailable());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
```

- [ ] **Step 3: Add the voice handlers**

After the picked-category `useEffect` and before `close`, add:

```tsx
  const applyCategory = async (id: number, sub: number | null) => {
    setCategoryId(id);
    setSubcategoryId(sub ?? undefined);
    const categories = await getCategories();
    const cat = categories.find((c) => c.id === id);
    setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
  };

  const applyTranscript = async (transcript: string) => {
    const parsed = parseVoiceTx(transcript);
    if (parsed.amount == null) {
      setNotes((n) => n || transcript);
      ToastAndroid.show("Didn't catch an amount", ToastAndroid.SHORT);
      return;
    }
    setAmount(String(parsed.amount));
    if (parsed.merchant) setMerchant(parsed.merchant);
    const hit =
      (parsed.merchant ? await getCategoryRuleForMerchant(parsed.merchant) : null) ??
      (await getWordMatchCategoryForMerchant(parsed.categoryText));
    if (hit) await applyCategory(hit.categoryId, hit.subcategoryId);
  };

  const handleVoiceError = (e: unknown) => {
    const code = ((e as { code?: string })?.code ?? 'ERROR') as VoiceErrorCode;
    if (code === 'CANCELLED') return;
    if (code === 'NO_MATCH') ToastAndroid.show("Didn't catch that, try again", ToastAndroid.SHORT);
    else if (code === 'OFFLINE_PACK_MISSING')
      Alert.alert('Offline speech pack needed', 'Download your language for offline speech in Android settings, then try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.sendIntent('android.settings.VOICE_INPUT_SETTINGS') },
      ]);
    else ToastAndroid.show('Voice input failed', ToastAndroid.SHORT);
  };

  const startVoice = async () => {
    if (voiceBusy.current) return;
    voiceBusy.current = true;
    setListening(true);
    setPartial('');
    const sub = addVoicePartialListener((e) => setPartial(e.text));
    try {
      if (!(await requestRecordAudioPermission())) {
        ToastAndroid.show('Microphone permission needed', ToastAndroid.SHORT);
        return;
      }
      await applyTranscript(await startVoiceCapture());
    } catch (e) {
      handleVoiceError(e);
    } finally {
      sub.remove();
      voiceBusy.current = false;
      setListening(false);
      setPartial('');
    }
  };

  useEffect(() => {
    if (!route.params?.startVoice || !voiceSupported) return;
    const t = setTimeout(() => {
      startVoice();
      navigation.setParams({ startVoice: undefined });
    }, 400);
    return () => clearTimeout(t);
  }, [route.params?.startVoice]);

  useEffect(() => () => {
    cancelVoiceCapture().catch(() => {});
  }, []);
```

Also simplify the existing picked-category effect by replacing its body after the early return with `applyCategory(pickedCategoryId, pickedSubcategoryId ?? null);` followed by the existing `navigation.setParams(...)` line.

- [ ] **Step 4: Add the mic button and caption**

Replace the Amount label line (`<Text ...>Amount</Text>` inside the scroll view) with:

```tsx
        <View className="flex-row items-center justify-between mt-lg mb-sm">
          <Text className="font-mono text-label-sm text-on-surface-variant">Amount</Text>
          {voiceSupported ? (
            <TouchableOpacity
              onPress={startVoice}
              disabled={listening}
              accessibilityLabel="Speak a transaction"
              className={cn(
                'flex-row items-center rounded-full border border-outline-variant px-md py-[6px]',
                listening && 'opacity-60',
              )}
            >
              <Text className="font-inter-medium text-body-md text-primary">{listening ? 'Listening…' : '🎤 Speak'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {listening && partial ? (
          <Text className="font-inter text-body-md text-on-surface-variant mb-sm">{partial}</Text>
        ) : null}
```

- [ ] **Step 5: Verify**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors. If `getCategories` is now imported twice, remove the duplicate.

- [ ] **Step 6: Review and commit**

Dispatch the `invariant-reviewer` agent on the diff (in-flight guards, category rules path); fix anything it flags.

```bash
git add apps/raqm/src/navigation/types.ts apps/raqm/src/screens/main/QuickAddCashScreen.tsx
git commit -m "feat(raqm): voice mic button on quick add cash screen"
```

---

### Task 4: Device verification

**Files:** none.

- [ ] **Step 1: Build and install**

Run: `npm run raqm:android` from the repo root, with an Android 13+ device and the offline English pack downloaded.

- [ ] **Step 2: Walk the checklist**

Use the `device-verification-checklist` skill, plus these voice checks on Add Cash Spend:
1. First tap asks for the microphone; deny shows "Microphone permission needed"; grant starts listening.
2. Say "two fifty on chai": amount 250, merchant Chai, category prefilled if a rule matches, nothing saved until Save is tapped.
3. Airplane mode on: capture still works (proves on-device).
4. Stay silent: toast "Didn't catch that, try again".
5. Say only "coffee": toast "Didn't catch an amount" and the transcript lands in Note.
6. Double-tap the mic: one session only.
7. Tap Close while listening: no crash and no stuck state on reopening.
8. Remove the offline pack (or use a locale without one): the settings dialog appears.

- [ ] **Step 3: Report**

Report the result of each check, with failures stated plainly. No commit in this task.

---

## Self-Review

- **Spec coverage:** native recognizer and error codes (Task 2), `RECORD_AUDIO` (Task 2), parser (Task 1), mic UI and caption (Task 3), `startVoice` param (Task 3), no-amount toast with Notes fallback (Task 3), missing-pack settings prompt (Task 3), cancel on leave (Task 3), device checks (Task 4). Spec's "<13 unavailable" is made explicit via `UNSUPPORTED` and a hidden button.
- **Type consistency:** `VoiceTx`, `parseVoiceTx`, `VoiceErrorCode`, and the four JS functions use identical names across tasks.
- **Open risk:** `Promise.reject(code, message, cause)` and `isOnDeviceRecognitionAvailable` are verified only at Task 2 Step 5 compile time.
