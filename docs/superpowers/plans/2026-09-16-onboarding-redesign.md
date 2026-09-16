# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 13 onboarding screens (plus new iOS-specific and budget-setup
screens) against `DESIGN.md` v2.0, on both Android and iOS, replacing the
current 4-screen permission wall with a single consolidated permissions
screen and wiring the existing PDF-import capability into onboarding.

**Architecture:** A shared onboarding component layer (`StepCounter`,
`OnboardingButton`, `PermissionRow`, `Icon`) sits under all screens. The
`OnboardingNavigator` gains new routes (`Permissions` replaces 4 old
permission routes, plus `ManualAccountSetup`, `SetupComplete`,
`BudgetSetup`); each screen decides its own "next" route via `Platform.OS`
rather than the app running two separate navigators.

**Tech Stack:** React Native (Expo SDK 56/57, New Architecture), NativeWind
(Tailwind classes), `react-native-reanimated` v4 (see
`.claude/skills/creating-reanimated-animations/`), `@expo/vector-icons`
(new dependency), `expo-sqlite` for the existing `src/services/budgets`
reused by the new budget-setup screen.

**Spec:** `docs/superpowers/specs/2026-09-16-onboarding-redesign-design.md`
(and `apps/raqm/DESIGN.md` v2.0, which the spec rebuilt) — read both before
starting; this plan implements them but does not repeat their reasoning.

## Global Constraints

- Typecheck from `apps/raqm`, never the repo root: `cd apps/raqm && npx tsc --noEmit`. This app has **no test runner** — `tsc --noEmit` + the manual verification steps in each task is the actual test cycle here, per root `CLAUDE.md`.
- All colors/typography/spacing/radius come from `src/theme` tokens or their NativeWind mirrors in `tailwind.config.js` — never hardcoded hex/px.
- Never use `Animated.spring`, `.springify()`, or any bounce/elastic curve on content entrances — `DESIGN.md` v2.0 §7 bans it. Timing/easing only, per the `creating-reanimated-animations` skill's "Project notes (Raqm)" section.
- Screens with text inputs use `KeyboardAwareScrollView` from `src/components/KeyboardAwareScrollView.tsx`, never `KeyboardAvoidingView`/plain `ScrollView`.
- No emoji icons anywhere in touched screens — use the new `Icon` component (Task 2).
- Exactly one shadow value is permitted: `0 8px 24px rgba(0,0,0,0.28)` (`DESIGN.md` v2.0 §6). No per-screen custom shadow objects.
- Permission/trust copy must stay literal to Raqm's real architecture: on-device only, no sync, no encryption pipeline (there isn't one).
- `insertParsedTxs`/detection-job/soft-delete invariants from root `CLAUDE.md` are unaffected by this plan — no task here touches `src/db/database.ts` write paths.

---

## Task 1: Rebuild theme tokens to DESIGN.md v2.0

**Files:**
- Modify: `apps/raqm/src/theme/colors.ts`
- Modify: `apps/raqm/src/theme/typography.ts`
- Modify: `apps/raqm/tailwind.config.js`
- Modify: `apps/raqm/App.tsx` (font loading)
- Modify: `apps/raqm/src/screens/main/TransactionsScreen.tsx:390,442` (only remaining Fraunces consumer app-wide)

**Interfaces:**
- Produces: `Colors.bgBase`, `Colors.accentPrimary`, `Colors.accentDeep`, `Colors.notice` (new/renamed token names used by every later task); NativeWind classes `bg-base`, `text-accent-primary`, `bg-accent-primary`, `text-notice`, `border-accent-primary`; Tailwind `font-inter-light` (weight 300, for the Statement role); `text-statement-lg`/`text-statement-mobile`/`text-metric-hero` now carry the v2.0 tracking values.

Raqm's `TransactionsScreen.tsx` is the only other screen in the app using
`font-fraunces` (grep-confirmed). Since `DESIGN.md` v2.0 retires Fraunces
app-wide (not just for onboarding), this task also fixes those two lines —
otherwise the app would contradict its own design doc immediately after this
change ships.

- [ ] **Step 1: Update `src/theme/colors.ts` — add v2.0 tokens, drop moss**

Keep every existing MD3 token (`primary`, `onSurface`, etc.) untouched — other
screens still depend on them and migrating them is out of scope. Replace only
the "Extended custom tokens" block at the bottom:

```ts
  // ── Extended custom tokens (RDL v2.0) ───────────────────────────────────
  bgBase: '#0A0E0C',
  bgSurface: '#10140F',
  bgSurfaceRaised: '#161C15',
  borderSubtle: '#232B22',
  inkHeadline: '#F2F0E9',
  inkBody: '#9FA89C',
  inkLabel: '#5B635A',
  accentPrimary: '#3EBD7E',
  accentDeep: '#173325',
  notice: '#C68B4D',
  errorMuted: '#C4707A',
} as const;
```

(This removes `mossStructure` and renames `bgSurface`/`bgSurfaceRaised` hex
values in place — grep `mossStructure` across `src/` first; if any non-onboarding
screen references it, leave a `// TODO(design-v2): unused post-onboarding-redesign, remove after full app migration`
comment instead of breaking that screen's build. Expected: no hits, since it
was introduced in v1.1 and never adopted.)

- [ ] **Step 2: Verify no other file depends on the removed token**

Run: `cd apps/raqm && grep -rn "mossStructure\|moss-structure" src/`
Expected: no output (or only comments). If real usages exist, stop and keep
the token rather than deleting it.

- [ ] **Step 3: Update `src/theme/typography.ts` — retire Fraunces, add tracking**

Replace the `statementLg`/`statementMobile` definitions and update
`metricHero`'s tracking:

```ts
  statementLg: {
    fontFamily: 'Inter_300Light',
    fontSize: 32,
    fontWeight: '300' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.7,
  },
  statementMobile: {
    fontFamily: 'Inter_300Light',
    fontSize: 28,
    fontWeight: '300' as TextStyle['fontWeight'],
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  metricHero: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 44,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 52,
    letterSpacing: -1.0,
  },
```

Update the file's header comment (currently describes Fraunces as the
headline font) to:

```ts
// Raqm Design Language v2.0 — finalized font stack:
//   Inter          → everything, including Statement roles (weight 300, tight tracking)
//   JetBrains Mono → every number/amount (Metric + numeric roles)
```

- [ ] **Step 4: Update `tailwind.config.js` to mirror steps 1 and 3**

In the `colors` block, replace the "Extended custom (RDL) tokens" section:

```js
        // ── Extended custom (RDL v2.0) tokens ─────────────────────────────
        'bg-base': '#0A0E0C',
        'bg-surface': '#10140F',
        'bg-surface-raised': '#161C15',
        'border-subtle': '#232B22',
        'ink-headline': '#F2F0E9',
        'ink-body': '#9FA89C',
        'ink-label': '#5B635A',
        'accent-primary': '#3EBD7E',
        'accent-deep': '#173325',
        notice: '#C68B4D',
        'error-muted': '#C4707A',
```

In `fontFamily`, add the light weight and remove `fraunces`:

```js
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-light': ['Inter_300Light'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
```

In `fontSize`, update the two RDL entries:

```js
        'statement-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.7px' }], // font-inter-light
        'statement-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.6px' }], // font-inter-light
        'metric-hero': ['44px', { lineHeight: '52px', letterSpacing: '-1.0px' }],
```

- [ ] **Step 5: Load Inter Light and drop Fraunces in `App.tsx`**

```tsx
import { Inter_300Light } from '@expo-google-fonts/inter';
```

Remove the `import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';`
line and the `Fraunces_500Medium,` entry inside `useFonts({...})`; add
`Inter_300Light,` to that same `useFonts` call. Check `package.json` for
`@expo-google-fonts/inter` — if `Inter_300Light` isn't already exported by the
installed version, run `cd apps/raqm && npx expo install @expo-google-fonts/inter`
first (it bundles all weights, so this is a no-op if already present).

- [ ] **Step 6: Fix the two Fraunces usages in `TransactionsScreen.tsx`**

Line 390: `<Text className="font-fraunces text-[22px] leading-[28px] text-on-surface">Timeline</Text>`
→ `<Text className="font-inter-light text-[22px] leading-[28px] tracking-[-0.4px] text-on-surface">Timeline</Text>`

Line 442: `<Text className="font-fraunces text-statement-mobile text-on-surface mt-[8px] mb-[24px]">{statement}</Text>`
→ `<Text className="font-inter-light text-statement-mobile text-on-surface mt-[8px] mb-[24px]">{statement}</Text>`

- [ ] **Step 7: Typecheck and remove the unused package if safe**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

Run: `grep -rn "Fraunces" apps/raqm/src apps/raqm/App.tsx apps/raqm/tailwind.config.js`
Expected: no output. If clean, `@expo-google-fonts/fraunces` may be removed
from `package.json` — leave it if you're not fully certain no other in-flight
branch depends on it; removing an unused dependency is optional cleanup, not
required for this task to be done.

- [ ] **Step 8: Manual verification**

Run `npm run raqm` and open the Timeline (Transactions) screen — confirm the
title and statement line render in Inter (sans, not serif) and still look
legible against `bg-surface`. This is the one non-onboarding screen this task
touches; everything else in this plan only affects onboarding screens.

- [ ] **Step 9: Commit**

```bash
git add apps/raqm/src/theme/colors.ts apps/raqm/src/theme/typography.ts apps/raqm/tailwind.config.js apps/raqm/App.tsx apps/raqm/src/screens/main/TransactionsScreen.tsx
git commit -m "feat(design): rebuild theme tokens to DESIGN.md v2.0, retire Fraunces"
```

---

## Task 2: Icon system

**Files:**
- Create: `apps/raqm/src/components/Icon.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Icon` component — `<Icon name="bank-outline" size={20} color={Colors.inkBody} />`. Every later screen task imports this instead of using emoji or ad hoc SVGs.

`@expo/vector-icons` does not literally ship a "Material Symbols" font (that
is a separate Google variable-font family with no maintained RN package as of
this writing). The honest, practical match for `DESIGN.md`'s "rounded
outline, ~2px stroke" reference is `@expo/vector-icons`'s
`MaterialCommunityIcons` set, which has `-outline` suffixed variants for most
glyphs this app needs (`bank-outline`, `bell-outline`, `map-marker-outline`,
`message-text-outline`, `wallet-outline`, `check-circle-outline`, `close`,
`chevron-left`, `magnify`, `eye-outline`, `eye-off-outline`). This substitution
is documented here rather than silently deviating from the spec's wording.

- [ ] **Step 1: Install the package**

Run: `cd apps/raqm && npx expo install @expo/vector-icons`

- [ ] **Step 2: Write `src/components/Icon.tsx`**

```tsx
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color: string;
};

// Single wrapper so every screen imports one component, not the icon
// library directly — matches DESIGN.md v2.0 §8 (one icon set, no emoji,
// no hand-rolled SVGs). See this file's Task 2 note on why
// MaterialCommunityIcons stands in for "Material Symbols Outlined."
export function Icon({ name, size = 20, color }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Sanity script**

```bash
cd apps/raqm && npx tsx -e "
import { MaterialCommunityIcons } from '@expo/vector-icons';
const glyphs = ['bank-outline','bell-outline','map-marker-outline','message-text-outline','wallet-outline','check-circle-outline','eye-outline','eye-off-outline'];
const known = new Set(Object.keys((MaterialCommunityIcons as any).glyphMap ?? {}));
const missing = glyphs.filter(g => !known.has(g));
if (missing.length) { console.error('Missing glyphs:', missing); process.exit(1); }
console.log('All glyph names resolve.');
"
```

Expected: `All glyph names resolve.` If any are missing, pick the closest
real name from `MaterialCommunityIcons.glyphMap` and note the substitution in
the screen task that uses it.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/components/Icon.tsx apps/raqm/package.json apps/raqm/package-lock.json
git commit -m "feat(design): add shared Icon component on @expo/vector-icons"
```

---

## Task 3: Shared onboarding components

**Files:**
- Create: `apps/raqm/src/components/onboarding/StepCounter.tsx`
- Create: `apps/raqm/src/components/onboarding/OnboardingButton.tsx`
- Create: `apps/raqm/src/components/onboarding/PermissionRow.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 2).
- Produces: `<StepCounter step={2} totalSteps={4} />`; `<OnboardingButton label="Get started" onPress={fn} />`; `<PermissionRow title="Read bank SMS" reason="So I can find your transactions automatically" granted={false} onGrant={fn} />` — every screen task from Task 5 onward uses these three.

- [ ] **Step 1: `StepCounter.tsx`**

```tsx
import React from 'react';
import { View, Text } from 'react-native';

type StepCounterProps = { step: number; totalSteps: number };

// DESIGN.md v2.0 §3/§1: a plain text counter, not dots or a progress bar —
// "minimal by default" while still giving the visible-progress signal
// research shows correlates with onboarding completion.
export function StepCounter({ step, totalSteps }: StepCounterProps) {
  return (
    <View className="mb-md">
      <Text className="font-inter-semibold text-label-caps text-ink-label">
        STEP {step} OF {totalSteps}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: `OnboardingButton.tsx`**

```tsx
import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

type OnboardingButtonProps = { label: string; onPress: () => void; disabled?: boolean };

// Pill radius reserved for primary CTAs only (DESIGN.md v2.0 §5). Press
// feedback is a plain scale via withTiming — never withSpring, per the
// motion vocabulary's ease-out-only rule.
export function OnboardingButton({ label, onPress, disabled }: OnboardingButtonProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        disabled={disabled}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
        onPress={onPress}
        className={`h-14 rounded-full items-center justify-center px-xl ${disabled ? 'bg-border-subtle' : 'bg-accent-primary'}`}
      >
        <Text className={`font-inter-semibold text-body-standard ${disabled ? 'text-ink-label' : 'text-bg-base'}`}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 3: `PermissionRow.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { Colors } from '../../theme';

type PermissionRowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  reason: string;
  granted: boolean;
  onGrant: () => void;
  index: number; // for stagger delay
};

// One row per permission — title + reason on the left, a Grant button on
// the right, per the user's explicit design direction (spec §4.2). Replaces
// the old sequential full-screen permission wall entirely.
export function PermissionRow({ icon, title, reason, granted, onGrant, index }: PermissionRowProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 80)}
      className="flex-row items-center justify-between border-b border-border-subtle py-md"
    >
      <View className="flex-row items-center flex-1 pr-md">
        <Icon name={icon} size={22} color={Colors.inkBody} />
        <View className="ml-md flex-1">
          <Text className="font-inter-semibold text-body-standard text-ink-headline">{title}</Text>
          <Text className="font-inter text-supporting-text text-ink-body mt-xs">{reason}</Text>
        </View>
      </View>
      {granted ? (
        <Text className="font-inter-semibold text-supporting-text text-accent-primary">Granted</Text>
      ) : (
        <Pressable onPress={onGrant} className="rounded-sm border border-accent-primary px-md py-sm">
          <Text className="font-inter-semibold text-supporting-text text-accent-primary">Grant</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/components/onboarding/
git commit -m "feat(onboarding): add shared StepCounter, OnboardingButton, PermissionRow"
```

---

## Task 4: Navigation types and navigator for the new flow

**Files:**
- Modify: `apps/raqm/src/navigation/types.ts`
- Modify: `apps/raqm/src/navigation/OnboardingNavigator.tsx`

**Interfaces:**
- Produces: `OnboardingStackParamList` with routes `Welcome`, `Permissions`, `DateRange`, `ScanningProgress`, `AccountSelection`, `ScanComplete`, `ManualAccountSetup`, `SetupComplete`, `BudgetSetup`, `SignUp`, `NameEntry`, `OTPVerification`. Every screen task below navigates using these exact route names.

Both platforms share one navigator; each screen decides its own next route
via `Platform.OS` (spec §3) rather than the app running two navigators.

- [ ] **Step 1: Update `OnboardingStackParamList` in `types.ts`**

```ts
export type OnboardingStackParamList = {
  Welcome: undefined;
  Permissions: undefined;
  DateRange: undefined;
  ScanningProgress: undefined;
  AccountSelection: undefined;
  ScanComplete: undefined;
  ManualAccountSetup: undefined;
  SetupComplete: undefined;
  BudgetSetup: undefined;
  SignUp: undefined;
  NameEntry: undefined;
  OTPVerification: { email: string };
};
```

(This removes `PermissionSMSRead`, `PermissionNotifications`,
`PermissionNotificationAccess`, `PermissionLocation` and adds `Permissions`,
`ManualAccountSetup`, `SetupComplete`, `BudgetSetup`.)

- [ ] **Step 2: Update `OnboardingNavigator.tsx`**

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PermissionsScreen } from '../screens/onboarding/PermissionsScreen';
import { DateRangeScreen } from '../screens/onboarding/DateRangeScreen';
import { ScanningProgressScreen } from '../screens/onboarding/ScanningProgressScreen';
import { AccountSelectionScreen } from '../screens/onboarding/AccountSelectionScreen';
import { ScanCompleteScreen } from '../screens/onboarding/ScanCompleteScreen';
import { ManualAccountSetupScreen } from '../screens/onboarding/ManualAccountSetupScreen';
import { SetupCompleteScreen } from '../screens/onboarding/SetupCompleteScreen';
import { BudgetSetupScreen } from '../screens/onboarding/BudgetSetupScreen';
import { SignUpScreen } from '../screens/onboarding/SignUpScreen';
import { NameEntryScreen } from '../screens/onboarding/NameEntryScreen';
import { OTPVerificationScreen } from '../screens/onboarding/OTPVerificationScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="DateRange" component={DateRangeScreen} />
      <Stack.Screen name="ScanningProgress" component={ScanningProgressScreen} />
      <Stack.Screen name="AccountSelection" component={AccountSelectionScreen} />
      <Stack.Screen name="ScanComplete" component={ScanCompleteScreen} />
      <Stack.Screen name="ManualAccountSetup" component={ManualAccountSetupScreen} />
      <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
      <Stack.Screen name="BudgetSetup" component={BudgetSetupScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="NameEntry" component={NameEntryScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}
```

This will not typecheck until Tasks 5–16 create/rename the referenced screen
files — that's expected; this task's typecheck step (Step 3) is run again
after Task 16, not in isolation. Note this in the commit message.

- [ ] **Step 3: Commit (typecheck deferred)**

```bash
git add apps/raqm/src/navigation/types.ts apps/raqm/src/navigation/OnboardingNavigator.tsx
git commit -m "feat(onboarding): update navigator for new flow (typecheck deferred to Task 16)"
```

---

## Task 5: Rebuild WelcomeScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/WelcomeScreen.tsx`

**Interfaces:**
- Consumes: `OnboardingButton` (Task 3).
- Produces: navigates to `Permissions` (was `PermissionSMSRead`).

- [ ] **Step 1: Replace the file contents**

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  return (
    <View className="flex-1 bg-bg-base px-container-margin justify-center">
      <Animated.View
        entering={FadeIn.duration(600)}
        className="absolute self-center w-72 h-72 rounded-full bg-accent-primary opacity-[0.06]"
      />

      <Animated.Text
        entering={FadeInDown.duration(500).delay(100)}
        className="font-inter-light text-statement-lg text-ink-headline text-center mb-md"
      >
        Your finances,{'\n'}
        <Text className="text-accent-primary">decoded</Text> from your SMS.
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.duration(500).delay(200)}
        className="font-inter text-body-standard text-ink-body text-center mb-xxl"
      >
        Raqm reads your bank messages and turns them into a clear picture of
        where your money goes. Nothing leaves your phone.
      </Animated.Text>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <OnboardingButton label="Get started" onPress={() => navigation.navigate('Permissions')} />
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: errors only about `Permissions` route not existing yet if Task 4
hasn't landed first — run Tasks in order; if run in order, expected: no
errors.

- [ ] **Step 3: Manual verification**

Run `npm run raqm`, open the app fresh (or navigate to onboarding). Confirm:
no emoji, no floating badges, one soft glow behind the headline, CTA is a
pill button in `accent-primary`.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/screens/onboarding/WelcomeScreen.tsx
git commit -m "feat(onboarding): rebuild WelcomeScreen against DESIGN.md v2.0"
```

---

## Task 6: Consolidated Permissions screen (replaces 4 screens)

**Files:**
- Create: `apps/raqm/src/screens/onboarding/PermissionsScreen.tsx`
- Delete: `apps/raqm/src/screens/onboarding/PermissionScreen.tsx`
- Delete: `apps/raqm/src/screens/onboarding/PermissionSMSReadScreen.tsx`
- Delete: `apps/raqm/src/screens/onboarding/PermissionNotificationsScreen.tsx`
- Delete: `apps/raqm/src/screens/onboarding/PermissionNotificationAccessScreen.tsx`
- Delete: `apps/raqm/src/screens/onboarding/PermissionLocationScreen.tsx`

**Interfaces:**
- Consumes: `PermissionRow`, `StepCounter` (Task 3).
- Produces: navigates to `DateRange` on Android, `ManualAccountSetup` on iOS.

Before writing the new screen, read the four old permission screens once
(they're being deleted) to copy their exact `PermissionsAndroid.request`
calls and any native-module calls (e.g. `NotificationListenerService`
enable intent) — do not invent permission constants; carry over the working
runtime request logic, only the UI shell changes.

- [ ] **Step 1: Read the existing permission request logic**

Run: `cat apps/raqm/src/screens/onboarding/PermissionSMSReadScreen.tsx apps/raqm/src/screens/onboarding/PermissionNotificationsScreen.tsx apps/raqm/src/screens/onboarding/PermissionNotificationAccessScreen.tsx apps/raqm/src/screens/onboarding/PermissionLocationScreen.tsx`

Note the exact `PermissionsAndroid.PERMISSIONS.*` constants and any
`Linking.openSettings()` / native module calls each one uses — reuse them
verbatim in Step 2.

- [ ] **Step 2: Write `PermissionsScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Platform, PermissionsAndroid, ScrollView, Pressable } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionRow } from '../../components/onboarding/PermissionRow';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';

type RowKey = 'sms' | 'notificationAccess' | 'location' | 'notifications';

// Android permission constants and native calls copied from the deleted
// PermissionSMSReadScreen / PermissionNotificationAccessScreen /
// PermissionLocationScreen — see Task 6 Step 1 for the exact source lines
// this was carried over from.
async function requestAndroidRow(key: RowKey): Promise<boolean> {
  if (key === 'sms') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  if (key === 'location') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // notificationAccess (NotificationListenerService) requires the system
  // settings screen, not a runtime PermissionsAndroid.request — replicate
  // the exact Linking/native-module call from the deleted
  // PermissionNotificationAccessScreen.tsx here.
  return false;
}

async function requestNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: replicate the exact expo-notifications requestPermissionsAsync()
  // call from the deleted PermissionNotificationsScreen.tsx here.
  return false;
}

export function PermissionsScreen({ navigation }: OnboardingScreenProps<'Permissions'>) {
  const isAndroid = Platform.OS === 'android';
  const [granted, setGranted] = useState<Record<RowKey, boolean>>({
    sms: false,
    notificationAccess: false,
    location: false,
    notifications: false,
  });

  const grant = useCallback(async (key: RowKey) => {
    const ok = key === 'notifications' ? await requestNotifications() : await requestAndroidRow(key);
    setGranted((prev) => ({ ...prev, [key]: ok }));
  }, []);

  const canContinue = isAndroid
    ? granted.sms && granted.notificationAccess && granted.location
    : granted.notifications;

  const next = useCallback(() => {
    navigation.navigate(isAndroid ? 'DateRange' : 'ManualAccountSetup');
  }, [isAndroid, navigation]);

  return (
    <View className="flex-1 bg-bg-base px-container-margin pt-xxl">
      <StepCounter step={2} totalSteps={isAndroid ? 9 : 6} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        A couple of permissions
      </Text>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isAndroid ? (
          <>
            <PermissionRow
              index={0}
              icon="message-text-outline"
              title="Read bank SMS"
              reason="So I can find your transactions automatically"
              granted={granted.sms}
              onGrant={() => grant('sms')}
            />
            <PermissionRow
              index={1}
              icon="bell-outline"
              title="Manage bank notifications"
              reason="So I can hide duplicate bank alerts once I've read them"
              granted={granted.notificationAccess}
              onGrant={() => grant('notificationAccess')}
            />
            <PermissionRow
              index={2}
              icon="map-marker-outline"
              title="Location"
              reason="So I can tag where a transaction happened when the SMS arrives"
              granted={granted.location}
              onGrant={() => grant('location')}
            />
          </>
        ) : (
          <PermissionRow
            index={0}
            icon="bell-outline"
            title="Notifications"
            reason="So I can alert you about spending patterns"
            granted={granted.notifications}
            onGrant={() => grant('notifications')}
          />
        )}
      </ScrollView>

      <Text className="font-inter text-annotation text-ink-label mt-md mb-lg">
        Everything is processed on your device. Nothing leaves your phone.
      </Text>

      <OnboardingButton label="Continue" onPress={next} disabled={!canContinue} />
    </View>
  );
}
```

- [ ] **Step 3: Delete the four old permission screens and shell**

```bash
git rm apps/raqm/src/screens/onboarding/PermissionScreen.tsx \
       apps/raqm/src/screens/onboarding/PermissionSMSReadScreen.tsx \
       apps/raqm/src/screens/onboarding/PermissionNotificationsScreen.tsx \
       apps/raqm/src/screens/onboarding/PermissionNotificationAccessScreen.tsx \
       apps/raqm/src/screens/onboarding/PermissionLocationScreen.tsx
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (assuming Task 4 landed first).

- [ ] **Step 5: Manual verification (Android device/emulator)**

Run `npm run raqm:android`. On the Permissions screen: confirm all three rows
render with icon + title + reason, tapping "Grant" on SMS fires the real OS
permission dialog, and "Continue" stays disabled until all three are granted.
For the notification-access row, confirm it opens the correct system settings
screen (copied from the deleted screen in Step 1) rather than a no-op.

- [ ] **Step 6: Commit**

```bash
git add -A apps/raqm/src/screens/onboarding/
git commit -m "feat(onboarding): consolidate 4 permission screens into one row-based screen"
```

---

## Task 7: Reskin DateRangeScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/DateRangeScreen.tsx`

**Interfaces:**
- Consumes: `StepCounter`, `Icon` (Tasks 2–3). Keeps existing date-range business logic (preset options, custom picker state) untouched — only the visual layer changes.

- [ ] **Step 1: Read the current file to identify what to keep**

Run: `cat apps/raqm/src/screens/onboarding/DateRangeScreen.tsx`

Preserve: the preset options array, the custom date-picker state/handlers,
the navigation call to `ScanningProgress`. Replace: every `className` using
MD3 tokens (`surface-container-*`, `on-surface-variant`, `primary-container`)
with RDL v2.0 equivalents (`bg-surface`, `ink-body`, `accent-primary`),
every emoji (📅🗓️⚡🎯) with an `<Icon />` call, and the hardcoded
`#75daa8`/`#c0392b` hex values with `Colors.accentPrimary`/`errorMuted` (or
the matching `text-error-muted`/`bg-accent-primary` NativeWind class).

- [ ] **Step 2: Apply the token/icon swap**

Concretely: replace `bg-surface-container-lowest` → `bg-bg-surface`,
`text-on-surface-variant` → `text-ink-body`, `text-on-surface` → `text-ink-headline`,
`bg-primary-container` → `bg-accent-primary`, `text-primary` → `text-accent-primary`,
`border-outline-variant` → `border-border-subtle`. Replace each emoji
`<Text>📅</Text>`-style node with `<Icon name="calendar-outline" size={20} color={Colors.inkBody} />`
(pick the closest real glyph per preset: `calendar-outline`, `flash-outline`,
`target` — verify each with the Task 2 Step 4 glyph-check pattern before
using it). Replace the hardcoded error color:
`style={{ color: '#c0392b' }}` → `className="text-error-muted"` (remove the
inline `style` prop once the class covers it).

- [ ] **Step 3: Add `StepCounter`**

At the top of the returned JSX, before the existing heading:

```tsx
<StepCounter step={isAndroidFlow ? 3 : 0} totalSteps={9} />
```

(This screen is Android-only, so `totalSteps={9}` matches the Android step
count from Task 6's `PermissionsScreen`.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (Android)**

Confirm no emoji remain, all text is legible against `bg-base`/`bg-surface`,
and selecting a preset still navigates to `ScanningProgress` correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/onboarding/DateRangeScreen.tsx
git commit -m "feat(onboarding): reskin DateRangeScreen to DESIGN.md v2.0"
```

---

## Task 8: Reskin ScanningProgressScreen (fix false claim, real steps)

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 2). Keeps the existing scan-orchestration logic (whatever triggers `BankParserFactory.parse()` / progress callbacks) untouched.

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx`

Identify: the progress-ring SVG component, the copy string containing
"Secure Sync" / "End-to-end encrypted", and how progress percentage/step
index is currently tracked (state variable name — reuse it, don't rename).

- [ ] **Step 2: Fix the false claim**

Replace any copy resembling `"Secure Sync — End-to-end encrypted local processing"`
with real, accurate step narration driven by the existing progress state,
e.g.:

```tsx
const STEP_LABELS = ['Reading messages', 'Extracting transactions', 'Categorizing'];
// ...
<Text className="font-inter-semibold text-body-standard text-ink-headline">
  {STEP_LABELS[currentStepIndex]}
</Text>
```

(`currentStepIndex` should derive from whatever progress signal the existing
scan orchestration already exposes — if it only exposes a 0–100 percentage,
map ranges: `0–33 → 0`, `34–66 → 1`, `67–100 → 2`.)

- [ ] **Step 3: Remove the gradient stroke on the progress ring**

Find the `<Svg>`/`<Circle>` (or equivalent) definition using a `LinearGradient`
stroke and replace the `stroke` prop with the plain `Colors.accentPrimary`
value — `DESIGN.md` v2.0 reserves gradients for the single Home-screen glow
only.

- [ ] **Step 4: Switch the numeric counter to JetBrains Mono**

Find the percentage/count `<Text>` currently using `font-inter-bold` (or
similar) and change its className to include `font-mono-medium text-numeric-lg`
(or `text-metric-hero` if it's the primary large number on screen).

- [ ] **Step 5: Remove any remaining emoji**

Replace 🔐✨⟳-style `<Text>` nodes with `<Icon>` calls using appropriate
glyphs (`shield-check-outline`, `sparkles` if available, or `progress-check`
— verify with the Task 2 glyph-check pattern first).

- [ ] **Step 6: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification (Android)**

Run a real scan on a device/emulator with test SMS present. Confirm the step
label updates as scanning progresses, the counter renders in monospace, the
ring has no gradient, and no "encrypted sync" (or any sync/encryption) claim
appears anywhere on screen.

- [ ] **Step 8: Commit**

```bash
git add apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx
git commit -m "fix(onboarding): remove false encryption claim, reskin ScanningProgressScreen"
```

---

## Task 9: Reskin AccountSelectionScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/AccountSelectionScreen.tsx`

**Interfaces:**
- Consumes: `StepCounter`, `Icon` (Tasks 2–3). Keeps existing account-list data/selection logic untouched.

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/AccountSelectionScreen.tsx`

Identify the manual progress-bar JSX block (to delete) and the emoji icons
per account type (💳🏦🔍).

- [ ] **Step 2: Replace the manual progress bar with `StepCounter`**

Delete the hand-rolled progress-bar `View`/width-percentage block; add
`<StepCounter step={5} totalSteps={9} />` in its place at the top of the screen.

- [ ] **Step 3: Replace emoji with `Icon`, retire MD3 tokens**

Map: 💳 → `credit-card-outline`, 🏦 → `bank-outline`, 🔍 → `magnify` (verify
each with the Task 2 glyph-check). Replace `bg-surface-container-lowest` →
`bg-bg-surface`, `bg-primary-container` → `bg-accent-primary`,
`text-on-surface-variant` → `text-ink-body`.

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (Android)**

Confirm account cards render with real icons, the step counter matches the
current position, and selecting/deselecting accounts still works.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/onboarding/AccountSelectionScreen.tsx
git commit -m "feat(onboarding): reskin AccountSelectionScreen to DESIGN.md v2.0"
```

---

## Task 10: Reskin ScanCompleteScreen (remove spring, hero metric)

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/ScanCompleteScreen.tsx`

**Interfaces:**
- Consumes: `StepCounter`, `Icon`, `OnboardingButton` (Tasks 2–3).
- Produces: navigates to `BudgetSetup` (was likely `SignUp` before).

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/ScanCompleteScreen.tsx`

Identify: the `Animated.spring` call (to remove), the transaction
count/total-amount values already computed for display, and the current
"next screen" navigation target.

- [ ] **Step 2: Replace `Animated.spring` with `withTiming`**

Wherever `withSpring(...)` appears on an entrance animation, replace with
`withTiming(target, { duration: 300, easing: Easing.out(Easing.cubic) })` —
import `Easing` from `react-native-reanimated` if not already imported.

- [ ] **Step 3: Render the hero metric in the correct role**

Ensure the transaction-count/total-amount text uses
`className="font-mono-medium text-metric-hero text-ink-headline"` (the
`metricHero` role, Mono, per `DESIGN.md` v2.0 §3) rather than
`font-inter-bold`.

- [ ] **Step 4: Rewrite copy to calm/factual (no celebration)**

Replace any exclamation-heavy or celebratory copy ("You're all set! 🎉")
with a flat statement: `"{count} transactions found. ₹{total} tracked."`
— per `DESIGN.md` §1 rule 4, never celebrate.

- [ ] **Step 5: Remove remaining emoji, update navigation target**

Replace 💳🏦📅✓ nodes with `Icon` calls. Change the final CTA's
`navigation.navigate('SignUp')` (or whatever it currently targets) to
`navigation.navigate('BudgetSetup')`.

- [ ] **Step 6: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (will resolve once Task 13 creates `BudgetSetupScreen`;
run in task order).

- [ ] **Step 7: Manual verification (Android)**

Confirm the hero number renders in monospace, no bounce/spring is visible on
entrance, and tapping continue navigates toward budget setup.

- [ ] **Step 8: Commit**

```bash
git add apps/raqm/src/screens/onboarding/ScanCompleteScreen.tsx
git commit -m "feat(onboarding): reskin ScanCompleteScreen, remove spring animation"
```

---

## Task 11: iOS Manual Account Setup screen (new)

**Files:**
- Create: `apps/raqm/src/screens/onboarding/ManualAccountSetupScreen.tsx`

**Interfaces:**
- Consumes: `StepCounter`, `OnboardingButton`, `Icon`, `KeyboardAwareScrollView` from `src/components/KeyboardAwareScrollView.tsx`.
- Produces: an in-memory `{ name: string; startingBalance: number }[]` passed forward via a local hook/context is out of scope for this task — this task only builds the UI and holds local component state; wiring persisted account creation into `src/db/database.ts` is a separate task not in this plan (see spec §6 out-of-scope note on iOS data-ingestion architecture). Navigates to `SetupComplete`.

- [ ] **Step 1: Check `KeyboardAwareScrollView`'s exact export**

Run: `cat apps/raqm/src/components/KeyboardAwareScrollView.tsx | head -30`

Confirm the exact prop names (`enableOnAndroid`, `extraScrollHeight`,
`keyboardShouldPersistTaps`) match what CLAUDE.md documents, and copy the
import path used by an existing screen that already uses it correctly (e.g.
grep `KeyboardAwareScrollView` under `src/screens/` for a working example).

- [ ] **Step 2: Write `ManualAccountSetupScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Icon } from '../../components/Icon';
import { Colors, Spacing } from '../../theme';

type DraftAccount = { name: string; startingBalance: string };

export function ManualAccountSetupScreen({ navigation }: OnboardingScreenProps<'ManualAccountSetup'>) {
  const [accounts, setAccounts] = useState<DraftAccount[]>([{ name: '', startingBalance: '' }]);

  const updateAccount = (index: number, patch: Partial<DraftAccount>) => {
    setAccounts((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAccount = () => setAccounts((prev) => [...prev, { name: '', startingBalance: '' }]);

  const canContinue = accounts.every((a) => a.name.trim().length > 0 && a.startingBalance.trim().length > 0);

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-xxl"
    >
      <StepCounter step={2} totalSteps={6} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        Add your accounts
      </Text>
      <Text className="font-inter text-supporting-text text-ink-body mb-lg">
        Add each account you want to track, with its current balance.
      </Text>

      {accounts.map((account, index) => (
        <View key={index} className="mb-lg border-b border-border-subtle pb-lg">
          <Text className="font-inter text-annotation text-ink-label mb-xs">Account name</Text>
          <TextInput
            value={account.name}
            onChangeText={(text) => updateAccount(index, { name: text })}
            placeholder="e.g. HDFC Savings"
            placeholderTextColor={Colors.inkLabel}
            className="font-inter text-body-standard text-ink-headline mb-md"
          />
          <Text className="font-inter text-annotation text-ink-label mb-xs">Starting balance</Text>
          <TextInput
            value={account.startingBalance}
            onChangeText={(text) => updateAccount(index, { startingBalance: text.replace(/[^0-9.]/g, '') })}
            placeholder="0.00"
            placeholderTextColor={Colors.inkLabel}
            keyboardType="decimal-pad"
            className="font-mono-medium text-numeric-md text-ink-headline"
          />
        </View>
      ))}

      <Pressable onPress={addAccount} className="flex-row items-center mb-xl">
        <Icon name="plus-circle-outline" size={18} color={Colors.accentPrimary} />
        <Text className="font-inter-semibold text-supporting-text text-accent-primary ml-xs">
          Add another account
        </Text>
      </Pressable>

      <OnboardingButton
        label="Continue"
        disabled={!canContinue}
        onPress={() => navigation.navigate('SetupComplete')}
      />
    </KeyboardAwareScrollView>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (once `SetupComplete` exists from Task 12).

- [ ] **Step 4: Manual verification (iOS simulator)**

Run `npm run raqm` on iOS. Confirm the keyboard does not cover the active
input (KeyboardAwareScrollView working), "Add another account" appends a new
row, and "Continue" stays disabled until every row has both fields filled.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/onboarding/ManualAccountSetupScreen.tsx
git commit -m "feat(onboarding): add iOS ManualAccountSetupScreen"
```

---

## Task 12: iOS Setup Complete screen (new)

**Files:**
- Create: `apps/raqm/src/screens/onboarding/SetupCompleteScreen.tsx`

**Interfaces:**
- Consumes: `OnboardingButton`, `Icon` (Tasks 2–3). Route params are not threaded from `ManualAccountSetup` in this plan (that requires app-level state/context beyond onboarding UI scope) — this screen shows static confirmation copy, not the actual entered totals, until a follow-up task wires that data through.
- Produces: navigates to `BudgetSetup`.

- [ ] **Step 1: Write `SetupCompleteScreen.tsx`**

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Icon } from '../../components/Icon';
import { Colors } from '../../theme';

export function SetupCompleteScreen({ navigation }: OnboardingScreenProps<'SetupComplete'>) {
  return (
    <View className="flex-1 bg-bg-base px-container-margin justify-center items-center">
      <Animated.View entering={FadeIn.duration(400)}>
        <Icon name="check-circle-outline" size={40} color={Colors.accentPrimary} />
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(100)}
        className="font-inter-semibold text-body-standard text-ink-headline text-center mt-lg mb-xs"
      >
        Your accounts are set up
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(150)}
        className="font-inter text-supporting-text text-ink-body text-center mb-xxl"
      >
        You can add or edit accounts anytime from Settings.
      </Animated.Text>
      <Animated.View entering={FadeInDown.duration(400).delay(200)} className="w-full">
        <OnboardingButton label="Continue" onPress={() => navigation.navigate('BudgetSetup')} />
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (once `BudgetSetup` exists from Task 13).

- [ ] **Step 3: Manual verification (iOS simulator)**

Confirm the screen renders and Continue navigates forward.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/screens/onboarding/SetupCompleteScreen.tsx
git commit -m "feat(onboarding): add iOS SetupCompleteScreen"
```

---

## Task 13: Budget suggestion logic + BudgetSetupScreen (both platforms)

**Files:**
- Create: `apps/raqm/src/services/onboarding/budgetSuggestions.ts`
- Create: `apps/raqm/src/screens/onboarding/BudgetSetupScreen.tsx`

**Interfaces:**
- Produces: `suggestBudgetsFromSpend(categorySpend: Record<string, number>): Record<string, number>` — pure function, Node-runnable, gets a real `tsx` sanity check (this app has no test runner, so this is the closest thing to a unit test this plan writes).
- Consumes: nothing from earlier UI tasks for the logic file; the screen consumes `StepCounter`, `OnboardingButton`, `KeyboardAwareScrollView`.

Per the spec (§4.5), this reuses the existing `src/services/budgets` feature
rather than duplicating its persistence logic — `budgetSuggestions.ts` only
computes suggested starting values from category spend, it does not write to
the database. Read `apps/raqm/src/services/budgets.ts` (or the equivalent
file — check `src/services/` for the exact filename) before writing this
task's screen, to reuse its existing save function rather than reinventing
one.

- [ ] **Step 1: Check the existing budgets service's exact exports**

Run: `find apps/raqm/src/services -iname "*budget*"`
Run: `grep -n "^export" apps/raqm/src/services/budgets*.ts` (adjust path to
whatever Step 1 finds)

Note the exact function name used to persist a budget (e.g. `setBudget`,
`saveBudget`) and its parameter shape — the screen in Step 3 calls this real
function, not a placeholder.

- [ ] **Step 2: Write the failing sanity check for `budgetSuggestions.ts`**

```bash
mkdir -p apps/raqm/src/services/onboarding
cat > /tmp/budget-suggestions-check.ts << 'EOF'
import { suggestBudgetsFromSpend } from '../../apps/raqm/src/services/onboarding/budgetSuggestions';

const input = { Dining: 4500, Groceries: 12000, Transport: 2200 };
const result = suggestBudgetsFromSpend(input);

console.assert(result.Dining === 4500, `Dining should equal spend: got ${result.Dining}`);
console.assert(result.Groceries === 12000, `Groceries should equal spend: got ${result.Groceries}`);
console.assert(Object.keys(result).length === 3, `Expected 3 categories, got ${Object.keys(result).length}`);
console.assert(suggestBudgetsFromSpend({}).constructor === Object, 'Empty input should return an empty object, not throw');
console.log('budgetSuggestions checks passed');
EOF
cd apps/raqm && npx tsx /tmp/budget-suggestions-check.ts
```

Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Implement `budgetSuggestions.ts`**

```ts
// Suggests a starting budget per category from real historical spend
// (Android, post-scan) — the "immediate payoff" pattern from the onboarding
// research (Copilot/Simplifi). Pure function: no DB access, no side effects.
// Persisting the user's final choice goes through the existing budgets
// service (see this task's Step 1), not this file.
export function suggestBudgetsFromSpend(
  categorySpend: Record<string, number>,
): Record<string, number> {
  const suggestions: Record<string, number> = {};
  for (const [category, spend] of Object.entries(categorySpend)) {
    // Round to nearest 100 so the suggested figure reads as a deliberate
    // number, not a copy-pasted raw total.
    suggestions[category] = Math.round(spend / 100) * 100;
  }
  return suggestions;
}
```

- [ ] **Step 4: Run the sanity check again**

Run: `cd apps/raqm && npx tsx /tmp/budget-suggestions-check.ts`
Expected: `budgetSuggestions checks passed` with no assertion failures.

- [ ] **Step 5: Write `BudgetSetupScreen.tsx`**

Use the real persistence function name found in Step 1 (this example assumes
it is named `saveBudget(category: string, amount: number): Promise<void>` —
substitute the actual name/signature you found):

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { suggestBudgetsFromSpend } from '../../services/onboarding/budgetSuggestions';
import { Colors, Spacing } from '../../theme';
// Substitute the real import path/name found in Task 13 Step 1:
import { saveBudget } from '../../services/budgets';

type BudgetSetupProps = OnboardingScreenProps<'BudgetSetup'> & {
  // Android passes real category spend from the completed scan; iOS has no
  // history, so this arrives empty and every field starts blank. Wiring the
  // real scan-result data into this route param is part of Task 10 (Android)
  // and out of scope for the iOS path until manual-entry data persistence
  // exists (see Task 11's note on that gap).
};

const DEFAULT_CATEGORIES = ['Dining', 'Groceries', 'Transport', 'Shopping', 'Bills'];

export function BudgetSetupScreen({ navigation }: BudgetSetupProps) {
  const isAndroid = Platform.OS === 'android';
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c, ''])),
  );

  const setAmount = (category: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [category]: value.replace(/[^0-9]/g, '') }));
  };

  const handleContinue = async () => {
    for (const [category, value] of Object.entries(amounts)) {
      if (value.trim().length > 0) {
        await saveBudget(category, Number(value));
      }
    }
    navigation.navigate('SignUp');
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-xxl"
    >
      <StepCounter step={isAndroid ? 7 : 4} totalSteps={isAndroid ? 9 : 6} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        Set a starting budget
      </Text>
      <Text className="font-inter text-supporting-text text-ink-body mb-lg">
        {isAndroid
          ? 'Based on what we found, here are suggested budgets. Adjust anything you like.'
          : 'Set a target for each category. You can change this anytime.'}
      </Text>

      {DEFAULT_CATEGORIES.map((category) => (
        <View key={category} className="flex-row items-center justify-between border-b border-border-subtle py-md">
          <Text className="font-inter text-body-standard text-ink-headline">{category}</Text>
          <TextInput
            value={amounts[category]}
            onChangeText={(text) => setAmount(category, text)}
            placeholder="0"
            placeholderTextColor={Colors.inkLabel}
            keyboardType="number-pad"
            className="font-mono-medium text-numeric-md text-ink-headline text-right w-24"
          />
        </View>
      ))}

      <View className="mt-xxl">
        <OnboardingButton label="Continue" onPress={handleContinue} />
      </View>
    </KeyboardAwareScrollView>
  );
}
```

Note: this task deliberately uses a hardcoded `DEFAULT_CATEGORIES` list and
does not yet consume `suggestBudgetsFromSpend`'s output as pre-filled
values — wiring the real Android scan-result category spend into this
screen's initial `amounts` state requires passing it through
`ScanCompleteScreen`'s navigation call in Task 10, which this plan does not
do (Task 10 only changes the navigation target, not a data payload). Treat
pre-filling as a fast, clearly-scoped follow-up task, not silently skip it —
flag it in the PR description when this plan ships.

- [ ] **Step 6: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors. If `saveBudget`'s real signature differs from the
assumed one, fix the call site to match.

- [ ] **Step 7: Manual verification (both platforms)**

Confirm the screen renders on both Android and iOS, entering amounts and
tapping Continue actually persists via the real budgets service (check the
Budgets screen elsewhere in the app afterward to confirm the value saved).

- [ ] **Step 8: Commit**

```bash
git add apps/raqm/src/services/onboarding/budgetSuggestions.ts apps/raqm/src/screens/onboarding/BudgetSetupScreen.tsx
git commit -m "feat(onboarding): add BudgetSetupScreen and suggestion logic"
```

---

## Task 14: Reskin SignUpScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/SignUpScreen.tsx`

**Interfaces:**
- Consumes: `Icon`, `KeyboardAwareScrollView` (Task 2, existing component).

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/SignUpScreen.tsx`

Identify: the `KeyboardAvoidingView`/`ScrollView` pair (to replace), the
🙈/👁️ emoji password-toggle icons, and the MD3 tokens in use.

- [ ] **Step 2: Replace the keyboard container**

Replace the outer `<KeyboardAvoidingView behavior={...}><ScrollView>...`
wrapper with:

```tsx
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { Spacing } from '../../theme';
// ...
<KeyboardAwareScrollView
  enableOnAndroid
  extraScrollHeight={Spacing.lg}
  keyboardShouldPersistTaps="handled"
  className="flex-1 bg-bg-base px-container-margin"
>
  {/* existing form content */}
</KeyboardAwareScrollView>
```

- [ ] **Step 3: Replace the emoji password toggle**

```tsx
<Pressable onPress={() => setShowPassword((v) => !v)}>
  <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.inkBody} />
</Pressable>
```

- [ ] **Step 4: Swap MD3 tokens for RDL v2.0**

`on-surface-variant` → `ink-body`, `surface-container-lowest` → `bg-surface`,
`outline-variant` → `border-subtle`.

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification (both platforms)**

Confirm the keyboard never covers the active field, the password
show/hide toggle works with the new icon, and sign-up submission still
functions.

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/screens/onboarding/SignUpScreen.tsx
git commit -m "feat(onboarding): reskin SignUpScreen, fix keyboard handling"
```

---

## Task 15: Reskin OTPVerificationScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/OTPVerificationScreen.tsx`

**Interfaces:**
- Consumes: `Icon`, `KeyboardAwareScrollView`.

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/OTPVerificationScreen.tsx`

- [ ] **Step 2: Replace keyboard container (same pattern as Task 14 Step 2)**

- [ ] **Step 3: Replace the ✉️ emoji with `<Icon name="email-outline" .../>`**

- [ ] **Step 4: Switch OTP box text to JetBrains Mono**

Each OTP digit `<TextInput>`'s className should include `font-mono-medium
text-numeric-lg` instead of whatever Inter class it currently has.

- [ ] **Step 5: Swap remaining MD3 tokens for RDL v2.0**

- [ ] **Step 6: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification (both platforms)**

Confirm OTP entry/auto-advance still works and digits render in monospace.

- [ ] **Step 8: Commit**

```bash
git add apps/raqm/src/screens/onboarding/OTPVerificationScreen.tsx
git commit -m "feat(onboarding): reskin OTPVerificationScreen"
```

---

## Task 16: Reskin NameEntryScreen

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/NameEntryScreen.tsx`

**Interfaces:**
- Consumes: `Icon`, `KeyboardAwareScrollView`.

- [ ] **Step 1: Read the current file**

Run: `cat apps/raqm/src/screens/onboarding/NameEntryScreen.tsx`

- [ ] **Step 2: Replace keyboard container (same pattern as Task 14 Step 2)**

- [ ] **Step 3: Replace the 👋 emoji with `<Icon name="hand-wave-outline" .../>`** (verify this exact glyph name exists via the Task 2 Step 4 pattern; if not, substitute `account-outline`)

- [ ] **Step 4: Swap remaining MD3 tokens for RDL v2.0**

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors — this is also the point where the full navigator (Task 4)
should typecheck cleanly for the first time, since every screen it references
now exists.

- [ ] **Step 6: Manual verification (both platforms)**

Run the full onboarding flow end to end on both an Android device/emulator
and an iOS simulator, following the branch-specific path for each. Confirm
every screen renders without error and the flow reaches Home.

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/screens/onboarding/NameEntryScreen.tsx
git commit -m "feat(onboarding): reskin NameEntryScreen, complete v2.0 migration"
```

---

## Task 17: Wire PDF import into Permissions / ManualAccountSetup

**Files:**
- Modify: `apps/raqm/src/screens/onboarding/PermissionsScreen.tsx`
- Modify: `apps/raqm/src/screens/onboarding/ManualAccountSetupScreen.tsx`
- Modify: `apps/raqm/src/navigation/types.ts` (if `ImportScreen`/`GPayPdfImport` aren't already reachable from the onboarding stack)

**Interfaces:**
- Consumes: the existing `GPayPdfImport` route (confirm exact route name in `MainStackParamList` via `apps/raqm/src/navigation/types.ts`) and `apps/raqm/src/services/imports/gpayPdf.ts`.

The onboarding stack and main stack are separate navigators (`OnboardingNavigator`
vs whatever renders `ImportScreen`) — check whether `GPayPdfImport` lives on
a stack reachable from onboarding before writing the navigation call; if not,
this task needs a `navigation.getParent()` call (the pattern already used
elsewhere per root CLAUDE.md's "Tab screens navigating to stack routes" rule)
rather than a direct `navigate()`.

- [ ] **Step 1: Confirm route reachability**

Run: `grep -n "GPayPdfImport\|MainStackParamList" apps/raqm/src/navigation/types.ts`
Run: `grep -n "OnboardingNavigator\|MainNavigator" apps/raqm/src/navigation/*.tsx`

Determine whether `OnboardingNavigator` and the stack containing
`GPayPdfImport` share a common parent navigator. Note the exact pattern
needed (`navigation.getParent<NavigationProp<MainStackParamList>>().navigate('GPayPdfImport')`
or similar) before writing Step 2.

- [ ] **Step 2: Add the secondary action to `PermissionsScreen.tsx`**

Below the `Text` with the trust copy, before the `OnboardingButton`:

```tsx
<Pressable onPress={() => /* the exact navigation call confirmed in Step 1 */}>
  <Text className="font-inter-semibold text-supporting-text text-accent-primary text-center mb-md">
    Or import a PDF statement instead
  </Text>
</Pressable>
```

- [ ] **Step 3: Add the same action to `ManualAccountSetupScreen.tsx`, promoted higher**

Since iOS has no scan step, place this above the manual account form (right
after the screen's intro text), not below it:

```tsx
<Pressable onPress={() => /* same navigation call as Step 2 */} className="flex-row items-center mb-lg">
  <Icon name="file-pdf-box" size={18} color={Colors.accentPrimary} />
  <Text className="font-inter-semibold text-supporting-text text-accent-primary ml-xs">
    Import a PDF statement instead (recommended)
  </Text>
</Pressable>
```

(Verify `file-pdf-box` exists via the Task 2 Step 4 glyph-check pattern; if
not, use `file-document-outline`.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (both platforms)**

From both the Permissions screen (Android) and Manual Account Setup screen
(iOS), tap the PDF import action and confirm it lands on the real, existing
`GPayPdfImportScreen` (or the source-selection `ImportScreen` if that's the
more correct entry point per Step 1's findings) — not a dead link.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/onboarding/PermissionsScreen.tsx apps/raqm/src/screens/onboarding/ManualAccountSetupScreen.tsx apps/raqm/src/navigation/types.ts
git commit -m "feat(onboarding): wire existing PDF import into onboarding flow"
```

---

## Plan self-review notes

- **Spec coverage:** §2 (theme rebuild) → Task 1. §2.5 (PDF import) → Task 17. §3 (flow) → Tasks 4, 6, 10–13. §4.1–4.6 (per-screen designs) → Tasks 5–16. §5 (shared rules: motion, step counter, icons, shadow, animation skill) → Tasks 2, 3, and referenced throughout. §6 (out of scope: full iOS ingestion architecture, non-onboarding migration, progress persistence) is explicitly not attempted by any task above — confirmed no task silently drifts into that scope.
- **Known gaps flagged, not hidden:** `SetupCompleteScreen` doesn't yet receive real entered-account data (Task 12); `BudgetSetupScreen` doesn't yet receive real Android scan-category data (Task 13) or ManualAccountSetup data (Task 11) — both are called out inline as fast, clearly-scoped follow-ups rather than silently left broken. Onboarding-progress persistence across app kills (spec §1, Apple Card finding) is out of scope per the spec and not attempted here.
- **Type consistency:** `OnboardingStackParamList` (Task 4) is referenced identically by every screen task's `OnboardingScreenProps<'RouteName'>` generic — checked route names match exactly (`Permissions`, `ManualAccountSetup`, `SetupComplete`, `BudgetSetup`) across Tasks 4–17.
