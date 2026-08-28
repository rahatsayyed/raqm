// @@iconify-code-gen
import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useInAppUpdate } from './src/hooks/useInAppUpdate';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/theme';
import { LockScreen } from './src/components/LockScreen';
import { authenticateWithDevice, canUseDeviceAuth, isAppLockEnabled } from './src/services/auth/appLock';
import { SmsReader } from './src/native/SmsReader';
import { useHiddenBalanceStore } from './src/store/hiddenBalanceStore';

SplashScreen.preventAutoHideAsync();

function AppContent({ onLayout }: { onLayout: () => void }) {
  const insets = useSafeAreaInsets();
  // `undefined` = the initial isAppLockEnabled() check hasn't resolved yet, so
  // we must not paint the navigator (that would flash real balances before the
  // lock appears). true = locked, false = unlocked / lock disabled.
  const [locked, setLocked] = useState<boolean | undefined>(undefined);
  const [authInFlight, setAuthInFlight] = useState(false);
  // Guards against a second OS prompt while one is already open — a double
  // AppState event or a button tap during the mount prompt would otherwise
  // stack two BiometricPrompts.
  const authInFlightRef = useRef(false);
  // Absorbs the OS's own background->active transition that the device-credential
  // fallback (pre-Android-11) can trigger via startActivityForResult while
  // runUnlock is still resolving — without this a successful unlock could
  // immediately retrigger evaluateLock() and re-prompt.
  const lastUnlockAtRef = useRef(0);

  useEffect(() => {
    NavigationBar.setStyle('dark');
  }, []);

  const runUnlock = useCallback(async () => {
    if (authInFlightRef.current) return;
    authInFlightRef.current = true;
    setAuthInFlight(true);
    try {
      const ok = await authenticateWithDevice('Unlock Raqm');
      if (ok) {
        lastUnlockAtRef.current = Date.now();
        setLocked(false);
      }
    } finally {
      authInFlightRef.current = false;
      setAuthInFlight(false);
    }
  }, []);

  // Decides whether the app should be locked right now, then prompts if so.
  // The setting is read fresh here (never cached in a module variable) so a
  // change made in Settings takes effect on the very next foreground cycle
  // without an app restart.
  const evaluateLock = useCallback(async () => {
    try {
      const enabled = await isAppLockEnabled();
      if (!enabled) {
        setLocked(false);
        return;
      }
      // Safety valve: if the user removed their device screen lock after enabling
      // App Lock, presenting LockScreen would strand them with no way to unlock.
      const usable = await canUseDeviceAuth();
      if (!usable) {
        setLocked(false);
        return;
      }
      setLocked(true);
      await runUnlock();
    } catch {
      // Fail open: if the check itself blows up (e.g. DB not ready), never
      // strand the user on a permanently blank screen behind an unresolved lock.
      setLocked(false);
    }
  }, [runUnlock]);

  useEffect(() => {
    evaluateLock();
  }, [evaluateLock]);

  // Tracks whether the device screen was actually turned off (locked) at any point while
  // the app was backgrounded, via the native "screenLocked" event (Android ACTION_SCREEN_OFF —
  // JS-level AppState alone can't distinguish a real lock from merely switching apps).
  const screenLockedSinceBackgroundRef = useRef(false);
  useEffect(() => {
    const sub = SmsReader.addScreenLockedListener(() => {
      screenLockedSinceBackgroundRef.current = true;
      // Hide Balances' reveal is independent of App Lock (it works even when App
      // Lock is off) and re-masks on the exact same trigger: a real device screen
      // lock, not merely backgrounding the app. Reset immediately rather than
      // waiting for the next foreground — the value is masked on screen either
      // way, this only affects whether the next tap needs reveal-auth again.
      useHiddenBalanceStore.getState().lockSession();
    });
    return () => sub.remove();
  }, []);

  // Only re-lock on a background -> active transition if the screen was actually locked
  // while backgrounded; otherwise just clear the backgrounded state without prompting.
  // A fully closed app (process killed / removed from recents) always re-prompts via the
  // mount-time evaluateLock() effect above, regardless of this flag. Android also emits
  // 'inactive' on some transitions, so we only treat a real 'background' as having left the app.
  const prevAppState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = prevAppState.current;
      prevAppState.current = next;
      if (prev === 'background' && next === 'active') {
        if (authInFlightRef.current) return;
        if (Date.now() - lastUnlockAtRef.current < 1000) return;
        const wasScreenLocked = screenLockedSinceBackgroundRef.current;
        screenLockedSinceBackgroundRef.current = false;
        if (wasScreenLocked) {
          evaluateLock();
        } else {
          setLocked(false);
        }
      }
    });
    return () => sub.remove();
  }, [evaluateLock]);

  return (
    // Top inset only: the bottom tab bar applies the bottom inset itself —
    // padding here too doubled the gap above the system nav bar.
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.surface }} onLayout={onLayout}>
      <StatusBar style="light" />
      {/* AppNavigator stays mounted for the app's whole lifetime once started —
          it must never remount on re-lock, since its mount effect re-runs the
          full startup pass (loadTxs, detection jobs, notifications, etc.) and
          resets navigation state. LockScreen is an opaque overlay on top of it,
          covering both the locked and not-yet-resolved (`undefined`) states so
          the navigator is never flashed before the initial check resolves. */}
      <AppNavigator />
      {locked !== false ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <LockScreen onUnlock={runUnlock} busy={authInFlight} />
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useInAppUpdate();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent onLayout={onLayoutRootView} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
