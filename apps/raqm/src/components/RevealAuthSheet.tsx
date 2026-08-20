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
  const passwordRef = useRef<TextInput | null>(null);

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

  const succeed = useCallback(() => {
    onSuccess();
    onClose();
  }, [onSuccess, onClose]);

  const runDeviceAuth = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithDevice('Reveal hidden balances');
      if (ok) succeed();
      // No dead end: on failure the sheet stays open with a retry button.
      else setError('Authentication failed. Try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [succeed]);

  // Resolve the method on each open and immediately fire the OS prompt in the
  // 'device' case, so that branch needs no extra tap.
  useEffect(() => {
    if (!visible) return;
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
    };
  }, [visible, runDeviceAuth]);

  async function onSubmitPassword() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAppPassword(password);
      if (ok) succeed();
      else setError('Incorrect password.');
    } finally {
      busyRef.current = false;
      setBusy(false);
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
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await setAppPassword(password);
      // The password the user just typed counts as verified — the spec is
      // explicit that there is no separate re-entry step.
      succeed();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const maxSheetHeight =
    keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - Spacing.lg
      : windowHeight * 0.8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-[#0e151299] justify-end" onPress={onClose}>
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

              <TouchableOpacity className="py-md items-center mt-xs" onPress={onClose}>
                <Text className="font-inter text-body-md text-on-surface-variant">Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
