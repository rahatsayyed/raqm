# Voice Entry Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user start a voice cash-spend from a launcher shortcut, a mic-only home-screen widget and a Quick Settings tile, each opening Add Cash Spend already listening.

**Architecture:** A new `startVoice` boolean extra rides the existing `QuickAdd` MainActivity deep-link channel, is drained by `consumeLaunchDeepLink`, and becomes the `startVoice` route param that `QuickAddCashScreen` already consumes. Three Android entry points set that extra.

**Tech Stack:** Kotlin (Expo module, Glance widget, TileService, ShortcutManagerCompat), React Navigation, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-05-voice-entry-points-design.md` (builds on `2026-10-05-voice-logging-design.md`)

## Global Constraints

- Android only; no iOS work (that is part B) and no parser changes (part C).
- Existing shortcut `quick_add_cash`, tile and widgets keep their behaviour; `quickAdd = true` with `startVoice = false` must produce exactly today's intent.
- `startVoice` always travels together with `openQuickAdd = true`.
- Services, receivers and tiles must never throw (they run outside the JS error boundary).
- Comments are one line max (CLAUDE.md hard rule); no multi-line blocks or docstrings in anything you write.
- No widget config activity for the voice widget (spec); existing widgets are untouched.
- Typecheck from `apps/raqm`: `npx tsc --noEmit`; Kotlin check: `cd apps/raqm/android && ./gradlew :app:compileDebugKotlin` after `npx expo prebuild --platform android` (apps/raqm/android is gitignored).
- Commits are conventional (`feat(raqm): …`), no session trailer, no push.

## Review Focus

- Cold start via an entry point must land on Add Cash Spend and start listening once (not twice, not a flash of Home).
- Warm start while Add Cash Spend is already open must still start listening again (param re-set after the screen cleared it).
- A tile or widget tap on a phone without voice support must open a plain Add Cash Spend, not crash or hang.
- The existing `quickAdd` entry points must behave exactly as before (no `startVoice` extra leaking in).
- Two PendingIntents (add tile vs voice tile) must not collide on request code.

---

## File Structure

- Modify `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/QuickAdd.kt`: `startVoice` extra and argument.
- Modify `.../SmsReaderModule.kt`: drain `startVoice`; push the voice shortcut.
- Modify `apps/raqm/modules/sms-reader/src/SmsReader.types.ts`, `apps/raqm/src/navigation/deepLinks.ts`, `apps/raqm/src/navigation/MainNavigator.tsx`: JS routing.
- Create `.../res/drawable/ic_add_voice.xml` (shortcut icon) and `.../res/drawable/ic_tile_mic.xml` (tile icon).
- Create `.../VoiceTileService.kt`; modify `.../AndroidManifest.xml`.
- Create `.../widget/VoiceWidget.kt` and `.../res/xml/widget_voice_info.xml`; modify `.../res/values/strings.xml` and the manifest.

Paths below with a leading `…/` mean `apps/raqm/modules/sms-reader/android/src/main/`; Kotlin lives under `java/expo/modules/smsreader/`.

---

### Task 1: startVoice plumbing (native extra to route param)

**Files:**
- Modify: `…/java/expo/modules/smsreader/QuickAdd.kt`
- Modify: `…/java/expo/modules/smsreader/SmsReaderModule.kt` (`consumeLaunchDeepLink`, around line 157)
- Modify: `apps/raqm/modules/sms-reader/src/SmsReader.types.ts` (`LaunchDeepLink`, line ~13)
- Modify: `apps/raqm/src/navigation/deepLinks.ts` (~line 62)
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx` (QuickAddCash screen, ~line 133)

**Interfaces:**
- Produces (Kotlin): `QuickAdd.EXTRA_START_VOICE = "startVoice"`; `QuickAdd.mainActivityIntent(context, quickAdd, transactionId = null, startVoice = false): Intent?` and `QuickAdd.mainActivityPendingIntent(context, requestCode, quickAdd, transactionId = null, startVoice = false): PendingIntent?`. When `startVoice` is true both also set `EXTRA_OPEN_QUICK_ADD`.
- Produces (JS): `LaunchDeepLink = { openQuickAdd: boolean; openTransaction: number | null; startVoice?: boolean }`; `consumeLaunchDeepLink()` returns `startVoice` in its map.

- [ ] **Step 1: Extend QuickAdd.kt**

Add next to the other constants:

```kotlin
  const val EXTRA_START_VOICE = "startVoice"
```

Change `mainActivityIntent` to take `startVoice: Boolean = false` as its last parameter and replace the two extras lines with:

```kotlin
    if (quickAdd || startVoice) intent.putExtra(EXTRA_OPEN_QUICK_ADD, true)
    if (startVoice) intent.putExtra(EXTRA_START_VOICE, true)
    if (transactionId != null) intent.putExtra(EXTRA_OPEN_TRANSACTION, transactionId)
```

Change `mainActivityPendingIntent` to take `startVoice: Boolean = false` as its last parameter and call `mainActivityIntent(context, quickAdd, transactionId, startVoice)`. Do not touch the existing KDoc comments.

- [ ] **Step 2: Drain the extra in `consumeLaunchDeepLink`**

Replace the body from `val quickAdd = …` through the `mapOf(...)` with:

```kotlin
      val quickAdd = intent.getBooleanExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD, false)
      val startVoice = intent.getBooleanExtra(QuickAdd.EXTRA_START_VOICE, false)
      val txId = intent.getIntExtra(QuickAdd.EXTRA_OPEN_TRANSACTION, -1)
      if (!quickAdd && txId == -1) return@Function null
      intent.removeExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD)
      intent.removeExtra(QuickAdd.EXTRA_START_VOICE)
      intent.removeExtra(QuickAdd.EXTRA_OPEN_TRANSACTION)
      mapOf(
        "openQuickAdd" to quickAdd,
        "openTransaction" to if (txId == -1) null else txId,
        "startVoice" to startVoice,
      )
```

- [ ] **Step 3: JS routing**

In `SmsReader.types.ts` add `startVoice?: boolean;` to `LaunchDeepLink`.

In `deepLinks.ts` replace `navRef.navigate('QuickAddCash');` with:

```ts
          navRef.navigate('QuickAddCash', link!.startVoice ? { startVoice: true } : undefined);
```

In `MainNavigator.tsx` give the QuickAddCash screen initial params, copying the TransactionDetail pattern:

```tsx
      <Stack.Screen
        name="QuickAddCash"
        component={QuickAddCashScreen}
        options={{ animation: 'slide_from_bottom' }}
        initialParams={launchDeepLink?.startVoice ? { startVoice: true } : undefined}
      />
```

- [ ] **Step 4: Verify**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.
Run: `cd apps/raqm && npx expo prebuild --platform android && cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.
Also confirm by reading the diff that `quickAdd = true` with the default `startVoice = false` produces exactly the old extras.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/modules/sms-reader apps/raqm/src/navigation
git commit -m "feat(raqm): startVoice launch extra from native deep link to route param"
```

---

### Task 2: Voice shortcut and tile

**Files:**
- Create: `…/res/drawable/ic_add_voice.xml`
- Create: `…/res/drawable/ic_tile_mic.xml`
- Create: `…/java/expo/modules/smsreader/VoiceTileService.kt`
- Modify: `…/java/expo/modules/smsreader/SmsReaderModule.kt` (shortcut push in `OnCreate`, after the existing `quick_add_cash` block, inside the same `try`)
- Modify: `…/AndroidManifest.xml` (add a `<service>` after the existing `AddTransactionTileService` entry)

**Interfaces:**
- Consumes: `QuickAdd.mainActivityIntent(..., startVoice = true)` and `QuickAdd.mainActivityPendingIntent(..., startVoice = true)` from Task 1.
- Produces: drawables `R.drawable.ic_add_voice`, `R.drawable.ic_tile_mic` (Task 3 does not use them).

- [ ] **Step 1: Add the icons**

`…/res/drawable/ic_add_voice.xml` (shortcut, mirrors `ic_add_cash.xml` colors):

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp"
    android:height="48dp"
    android:viewportWidth="48"
    android:viewportHeight="48">
    <path
        android:fillColor="#75daa8"
        android:pathData="M24,24m-20,0a20,20 0,1 1,40 0a20,20 0,1 1,-40 0" />
    <group android:translateX="12" android:translateY="12">
        <path
            android:fillColor="#0e1512"
            android:pathData="M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3z M17.3,11c0,3 -2.54,5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.23 6,6.72V21h2v-3.28c3.28,-0.48 6,-3.3 6,-6.72h-1.7z" />
    </group>
</vector>
```

`…/res/drawable/ic_tile_mic.xml` (tile, white like `ic_tile_add.xml`):

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFFFF">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3z M17.3,11c0,3 -2.54,5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.23 6,6.72V21h2v-3.28c3.28,-0.48 6,-3.3 6,-6.72h-1.7z" />
</vector>
```

- [ ] **Step 2: Push the voice shortcut**

In `SmsReaderModule.kt`, inside the existing `try` in `OnCreate`, after `ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)` and its closing `}` of the `if`, add:

```kotlin
        val voiceIntent = QuickAdd.mainActivityIntent(context, quickAdd = true, startVoice = true)
          ?.apply { action = Intent.ACTION_VIEW }
        if (voiceIntent != null) {
          val voiceShortcut = ShortcutInfoCompat.Builder(context, "quick_add_voice")
            .setShortLabel("Voice cash spend")
            .setLongLabel("Voice cash spend")
            .setIcon(IconCompat.createWithResource(context, R.drawable.ic_add_voice))
            .setIntent(voiceIntent)
            .build()
          ShortcutManagerCompat.pushDynamicShortcut(context, voiceShortcut)
        }
```

The existing `catch` already logs and swallows failures.

- [ ] **Step 3: Add `VoiceTileService.kt`**

```kotlin
package expo.modules.smsreader

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class VoiceTileService : TileService() {

  override fun onTileAdded() {
    setActiveState()
  }

  override fun onStartListening() {
    setActiveState()
  }

  override fun onClick() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val pendingIntent = QuickAdd.mainActivityPendingIntent(
          context = applicationContext,
          requestCode = REQUEST_CODE,
          quickAdd = true,
          startVoice = true,
        ) ?: return
        startActivityAndCollapse(pendingIntent)
      } else {
        val intent = QuickAdd.mainActivityIntent(applicationContext, quickAdd = true, startVoice = true) ?: return
        @Suppress("DEPRECATION")
        startActivityAndCollapse(intent)
      }
    } catch (e: Exception) {
      DiagnosticLog.write(applicationContext, "error.caught", "VoiceTileService: ${e.message}")
    }
  }

  private fun setActiveState() {
    try {
      qsTile?.apply {
        state = Tile.STATE_ACTIVE
        label = "Voice cash spend"
        updateTile()
      }
    } catch (e: Exception) {
      DiagnosticLog.write(applicationContext, "error.caught", "VoiceTileService.setActiveState: ${e.message}")
    }
  }

  private companion object {
    const val REQUEST_CODE = 8102
  }
}
```

- [ ] **Step 4: Register the tile**

In `AndroidManifest.xml`, directly after the `AddTransactionTileService` `<service>` element add:

```xml
    <service
      android:name=".VoiceTileService"
      android:label="Voice cash spend"
      android:icon="@drawable/ic_tile_mic"
      android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"
      android:exported="true">
      <intent-filter>
        <action android:name="android.service.quicksettings.action.QS_TILE" />
      </intent-filter>
    </service>
```

- [ ] **Step 5: Verify and commit**

Run: `cd apps/raqm && npx expo prebuild --platform android && cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.
Dispatch the `native-module-reviewer` agent on the diff; fix anything it flags.

```bash
git add apps/raqm/modules/sms-reader
git commit -m "feat(raqm): voice cash spend shortcut and quick settings tile"
```

---

### Task 3: Mic-only voice widget

**Files:**
- Create: `…/java/expo/modules/smsreader/widget/VoiceWidget.kt`
- Create: `…/res/xml/widget_voice_info.xml`
- Modify: `…/res/values/strings.xml`
- Modify: `…/AndroidManifest.xml` (add a `<receiver>` after the `AddTransactionWidgetReceiver` entry)

**Interfaces:**
- Consumes: `QuickAdd.mainActivityIntent(..., startVoice = true)` (Task 1); `WidgetAppearance.background(context, appWidgetId)`, `WidgetTheme.Primary`, `WidgetTheme.OnSurfaceVariant`, `WidgetPrefs.clear(context, id)` (existing, used by `AddTransactionWidget.kt`).

- [ ] **Step 1: Add `VoiceWidget.kt`**

```kotlin
package expo.modules.smsreader.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import expo.modules.smsreader.QuickAdd

class VoiceWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    provideContent { Content(context, appWidgetId) }
  }

  @Composable
  private fun Content(context: Context, appWidgetId: Int) {
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .background(WidgetAppearance.background(context, appWidgetId))
        .cornerRadius(20.dp)
        .padding(12.dp)
        .clickable(voiceAction(context)),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Text(
        text = "🎤",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.Primary),
          fontSize = 28.sp,
          fontWeight = FontWeight.Bold,
        ),
      )
      Text(
        text = "Voice",
        style = TextStyle(
          color = ColorProvider(WidgetTheme.OnSurfaceVariant),
          fontSize = 12.sp,
        ),
      )
    }
  }
}

class VoiceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = VoiceWidget()

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { WidgetPrefs.clear(context, it) }
  }
}

internal fun voiceAction(context: Context) =
  actionStartActivity(QuickAdd.mainActivityIntent(context, quickAdd = true, startVoice = true) ?: Intent())
```

- [ ] **Step 2: Provider XML, string, manifest**

`…/res/xml/widget_voice_info.xml` (no `android:configure`, per spec):

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="57dp"
    android:minHeight="57dp"
    android:targetCellWidth="1"
    android:targetCellHeight="1"
    android:resizeMode="horizontal"
    android:widgetCategory="home_screen|keyguard"
    android:updatePeriodMillis="1800000"
    android:description="@string/widget_voice_description"
    android:initialLayout="@layout/glance_default_loading_layout" />
```

In `strings.xml` add before the closing tag: `<string name="widget_voice_description">Log a cash spend by voice in one tap.</string>`

In `AndroidManifest.xml`, directly after the `AddTransactionWidgetReceiver` `<receiver>` element add:

```xml
    <receiver
      android:name=".widget.VoiceWidgetReceiver"
      android:exported="false">
      <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
      </intent-filter>
      <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_voice_info" />
    </receiver>
```

- [ ] **Step 3: Verify and commit**

Run: `cd apps/raqm && npx expo prebuild --platform android && cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.
Dispatch the `native-module-reviewer` agent on the diff; fix anything it flags.

```bash
git add apps/raqm/modules/sms-reader
git commit -m "feat(raqm): mic-only voice cash spend widget"
```

---

### Task 4: Device verification (human, no code)

**Files:** none.

- [ ] **Step 1: Build**

Run: `npm run raqm:android` from the repo root on an Android 13+ phone with the offline English pack.

- [ ] **Step 2: Walk the checklist**

1. Long-press the Raqm icon: "Voice cash spend" appears beside "Add Cash Spend". Tap it from a cold start: Add Cash Spend opens already listening, once.
2. Repeat from a warm start (app in background). Then repeat while Add Cash Spend is already open: it listens again.
3. Add the "Voice" widget from the picker (1x1 mic). Tap it cold and warm: same result. First-ever tap: grant the permission and confirm it keeps listening.
4. Edit tiles: add "Voice cash spend". Tap it: shade collapses and the app opens listening.
5. The original "Add Cash Spend" shortcut, "Add Transaction" tile and "Add" widget still open a plain, non-listening form.
6. On a phone without on-device voice (or Android 12): each entry point opens a plain form without crashing.

- [ ] **Step 3: Report**

Report each check's result, failures stated plainly. No commit in this task.

---

## Self-Review

- **Spec coverage:** extra and drain (Task 1), JS cold/warm routing (Task 1), shortcut (Task 2), tile with a distinct request code 8102 (Task 2), widget with its own provider, XML, manifest and no config activity (Task 3), icon (Task 2; the spec's single shared drawable became two because the shortcut needs a colored icon and the tile needs a white one), device checklist (Task 4).
- **Type consistency:** `startVoice` is the same name in `QuickAdd.EXTRA_START_VOICE`, the drained map key, `LaunchDeepLink.startVoice`, and the `QuickAddCash` route param.
- **Open risk:** Glance renders the emoji "🎤" as text; if it shows as a missing-glyph box on a device, swap it for an `Image` of a drawable.
