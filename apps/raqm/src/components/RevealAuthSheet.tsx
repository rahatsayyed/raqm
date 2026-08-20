import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { authenticateWithDevice } from '../services/auth/appLock';
import {
  getRevealAuthMethod,
  setAppPassword,
  verifyAppPassword,
  type RevealAuthMethod,
} from '../services/auth/hiddenBalance';

interface Props {
  visible: boolean;
  /** Dismiss without revealing. Also called by the sheet right after onSuccess. */
  onClose: () => void;
  /** A real successful authentication. The caller unlocks the session and reveals. */
  onSuccess: () => void;
}

const MIN_PASSWORD_LENGTH = 4;

/**
 * Reveal-auth sheet for hidden balances. Not routed through
 * TransactionDetailScreen's BottomSheet (that component isn't exported) —
 * replicates its keyboard-lift technique per CLAUDE.md, since the password and
 * setup branches both need text inputs.
 *
 * The auth method is resolved on every open, never cached, so turning App Lock
 * off mid-session correctly falls through to the password branch next time.
 */
export function RevealAuthSheet({ visible, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [method, setMethod] = useState<RevealAuthMethod | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Guards a second submit while one is in flight — double-tap double-submits
  // have shipped twice in this app (CLAUDE.md).
  const busyRef = useRef(false);
  // Identifies the current open-session. Bumped in the open-effect on every
  // genuine `visible: false -> true` transition. Each submit path captures
  // this value at call-start and only lets its `finally` touch busy state if
  // it's still the current session — closes the reopen race where a stale
  // call from a cancelled session resolves after a newer session has already
  // started a fresh in-flight call (see task-3-report.md, round 2).
  const sessionIdRef = useRef(0);
  const passwordRef = useRef<TextInput | null>(null);
  // True only while this open-session hasn't been explicitly cancelled — set
  // false the instant the user taps Cancel/the scrim, or when `visible` flips
  // to false for any other reason, so a slow authenticateWithDevice /
  // verifyAppPassword / setAppPassword promise that resolves *after* the
  // user backed out can never still call succeed() (reveal-after-cancel race).
  const activeRef = useRef(false);
  // Always-current onSuccess/onClose so succeed() has a stable identity that
  // never forces the open-effect below to re-run on an unrelated parent
  // re-render (which would otherwise wipe an in-progress password/confirm).
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  }, [onSuccess, onClose]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Stable forever (no deps) — reads onSuccess/onClose via refs, and refuses
  // to fire once the sheet has been explicitly cancelled or closed.
  const succeed = useCallback(() => {
    if (!activeRef.current) return;
    onSuccessRef.current();
    onCloseRef.current();
  }, []);

  const cancel = useCallback(() => {
    activeRef.current = false;
    onCloseRef.current();
  }, []);

  const runDeviceAuth = useCallback(async () => {
    if (busyRef.current) return;
    const mySession = sessionIdRef.current;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithDevice('Reveal hidden balances');
      if (ok) succeed();
      // No dead end: on failure the sheet stays open with a retry button.
      else setError('Authentication failed. Try again.');
    } finally {
      // A newer session has already started its own call — leave its busy
      // state alone; this stale call has nothing left to do.
      if (sessionIdRef.current === mySession) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [succeed]);

  // Resolve the method on each open and immediately fire the OS prompt in the
  // 'device' case, so that branch needs no extra tap. Depends on `visible`
  // only — `runDeviceAuth`'s identity is stable (it only depends on the now-
  // stable `succeed`), so this fires exactly on genuine open/close
  // transitions, never on an unrelated re-render of the host screen.
  useEffect(() => {
    if (!visible) {
      activeRef.current = false;
      return;
    }
    activeRef.current = true;
    // A prior submit's `finally` may not have run yet if the sheet was closed
    // and reopened quickly — don't let that stale in-flight flag silently
    // no-op this open's auto-fired device auth. Bumping the session id here
    // means that once-current call's `finally` (whenever it lands) will find
    // sessionIdRef.current !== its own captured id and skip touching busy
    // state instead of clobbering this session's genuinely-in-flight call.
    sessionIdRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    let cancelled = false;
    setPassword('');
    setConfirm('');
    setError(null);
    setMethod(null);
    Keyboard.dismiss();
    (async () => {
      const next = await getRevealAuthMethod();
      if (cancelled) return;
      setMethod(next);
      if (next === 'device') {
        await runDeviceAuth();
      } else {
        // autoFocus fires before KeyboardAwareScrollView has measured a
        // freshly-mounted input, so focus on a short delay instead (CLAUDE.md).
        setTimeout(() => passwordRef.current?.focus(), 80);
      }
    })();
    return () => {
      cancelled = true;
      activeRef.current = false;
    };
  }, [visible, runDeviceAuth]);

  async function onSubmitPassword() {
    if (busyRef.current) return;
    const mySession = sessionIdRef.current;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAppPassword(password);
      if (ok) succeed();
      else setError('Incorrect password.');
    } catch {
      // No dead end: an underlying getSetting/expo-crypto failure must surface
      // as a visible error instead of an unhandled rejection with a stuck sheet.
      setError('Something went wrong. Try again.');
    } finally {
      if (sessionIdRef.current === mySession) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function onSubmitSetup() {
    if (busyRef.current) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const mySession = sessionIdRef.current;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await setAppPassword(password);
      // The password the user just typed counts as verified — the spec is
      // explicit that there is no separate re-entry step.
      succeed();
    } catch {
      // No dead end: an underlying setSetting/expo-crypto failure must surface
      // as a visible error instead of an unhandled rejection with a stuck sheet.
      setError('Something went wrong. Try again.');
    } finally {
      if (sessionIdRef.current === mySession) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  const maxSheetHeight =
    keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - Spacing.lg
      : windowHeight * 0.8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel}>
      <Pressable className="flex-1 bg-[#0e151299] justify-end" onPress={cancel}>
        <Pressable
          className="bg-surface-container-low rounded-t-2xl border-t border-border-subtle"
          style={{ maxHeight: maxSheetHeight, marginBottom: keyboardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-12 h-1.5 rounded-full bg-surface-variant" />
          </View>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.sm,
            }}
          >
            <View className="px-container-margin pb-lg">
              <Text className="font-inter-bold text-headline-sm text-on-surface mb-xs">
                Reveal hidden balances
              </Text>

              {method === null && (
                <Text className="font-inter text-body-standard text-on-surface-variant">
                  Checking how to confirm it's you…
                </Text>
              )}

              {method === 'device' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Confirm with your fingerprint, PIN or pattern.
                  </Text>
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={runDeviceAuth}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Waiting…' : 'Try again'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {method === 'password' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Enter your Raqm password to reveal this value.
                  </Text>
                  <TextInput
                    ref={passwordRef}
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="done"
                    onSubmitEditing={onSubmitPassword}
                  />
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center mt-md"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={onSubmitPassword}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Checking…' : 'Reveal'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {method === 'setup-password' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Set up a password to reveal hidden balances. You'll use it every
                    time you open the app.
                  </Text>
                  <TextInput
                    ref={passwordRef}
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="New password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="next"
                  />
                  <TextInput
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px] mt-sm"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="done"
                    onSubmitEditing={onSubmitSetup}
                  />
                  <Text className="font-inter text-supporting-text text-on-surface-variant mt-xs">
                    There's no way to reset this password yet — pick one you'll remember.
                  </Text>
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center mt-md"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={onSubmitSetup}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Saving…' : 'Set password and reveal'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {error && (
                <Text className="font-inter text-supporting-text text-error mt-sm">{error}</Text>
              )}

              <TouchableOpacity className="py-md items-center mt-xs" onPress={cancel}>
                <Text className="font-inter text-body-md text-on-surface-variant">Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
