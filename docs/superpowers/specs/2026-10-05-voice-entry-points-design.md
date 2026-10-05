# Voice entry points: shortcut, widget, tile (issue #9, part A)

## Goal

Let the user start a voice cash-spend from outside the app: a launcher shortcut, a mic-only home-screen widget, and a Quick Settings tile. Each opens `QuickAddCashScreen` already listening. Builds on `2026-10-05-voice-logging-design.md` (the `startVoice` route param already exists and is consumed by the screen).

## Scope

- In: Android shortcut, widget, tile, and the `startVoice` plumbing from native intent to route param.
- Out: iOS voice and iOS shortcut (part B), parser rule fixes (part C), changes to existing widgets, a widget config screen.

## Plumbing

- `QuickAdd.kt`: add `EXTRA_START_VOICE = "startVoice"`. `mainActivityIntent` and `mainActivityPendingIntent` take a `startVoice: Boolean = false` argument; when true they also set `openQuickAdd`.
- `SmsReaderModule.kt` `consumeLaunchDeepLink`: read and remove `startVoice`, return it in the map. The existing null-return when no extra is set stays.
- `SmsReader.types.ts`: `LaunchDeepLink` gains `startVoice?: boolean`.
- `src/navigation/deepLinks.ts` (~line 62): `navRef.navigate('QuickAddCash', link.startVoice ? { startVoice: true } : undefined)`.
- `MainNavigator.tsx` (~line 133): QuickAddCash gets `initialParams={launchDeepLink?.startVoice ? { startVoice: true } : undefined}`, copying the TransactionDetail pattern.
- `QuickAddCashScreen` is unchanged: it already starts listening on `route.params.startVoice` when voice is supported, and clears the param.

## Entry points (Android only)

- Shortcut: a second dynamic shortcut `quick_add_voice`, label "Voice cash spend", pushed beside `quick_add_cash` in the existing try block of `SmsReaderModule.kt` OnCreate. Its intent carries `startVoice` and a distinct action so it is not deduplicated against the existing one.
- Widget: new mic-only Glance widget `VoiceWidget` in `widget/` with its own provider, `res/xml/widget_voice_info.xml` and a manifest receiver. One tap target launching `QuickAdd.mainActivityIntent(context, quickAdd = true, startVoice = true)`. Reuses `WidgetTheme`/`WidgetAppearance`; no config activity.
- Tile: new `VoiceTileService` modelled on `AddTransactionTileService` (PendingIntent on API 34+, inline launch intent below), launching with `startVoice`. Registered in the module manifest.
- Icon: one new `ic_mic.xml` vector drawable shared by the three.

## Constraints

- Comments one line max.
- Services and receivers must never throw (the tile and widget run outside the JS error boundary).
- Voice is unavailable below Android 13 or without an on-device recognizer; the screen then opens normally as a plain quick-add (the existing `voiceSupported` check). The entry points are still shown.
- Existing quick-add shortcut, tile and widgets keep their behaviour.

## Testing

- `cd apps/raqm && npx tsc --noEmit`.
- `npx expo prebuild --platform android` then `cd android && ./gradlew :app:compileDebugKotlin`.
- `native-module-reviewer` on the Kotlin diff.
- Device checklist: cold and warm launch from each entry point lands on Add Cash Spend and starts listening; first-ever permission grant from the widget; shortcut appears in the launcher long-press menu; widget appears in the picker and respects theme; tile can be added and works; unsupported phone opens a plain form.
