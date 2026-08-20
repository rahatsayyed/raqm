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

  useEffect(() => {
    NavigationBar.setStyle('dark');
  }, []);

  const runUnlock = useCallback(async () => {
    if (authInFlightRef.current) return;
    authInFlightRef.current = true;
    setAuthInFlight(true);
    try {
      const ok = await authenticateWithDevice('Unlock Raqm');
      if (ok) setLocked(false);
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
  }, [runUnlock]);

  useEffect(() => {
    evaluateLock();
  }, [evaluateLock]);

  // Re-lock on every background -> active transition. Android also emits
  // 'inactive' on some transitions, so we only treat a real 'background' as
  // having left the app.
  const prevAppState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = prevAppState.current;
      prevAppState.current = next;
      if (prev === 'background' && next === 'active') {
        evaluateLock();
      }
    });
    return () => sub.remove();
  }, [evaluateLock]);

  return (
    // Top inset only: the bottom tab bar applies the bottom inset itself —
    // padding here too doubled the gap above the system nav bar.
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.surface }} onLayout={onLayout}>
      <StatusBar style="light" />
      {locked === undefined ? null : locked ? (
        <LockScreen onUnlock={runUnlock} busy={authInFlight} />
      ) : (
        <AppNavigator />
      )}
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
