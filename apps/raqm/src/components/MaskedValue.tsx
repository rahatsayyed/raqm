import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { formatAmount } from '../utils/format';
import { useHiddenBalanceStore, type MaskedKind } from '../store/hiddenBalanceStore';
import { RevealAuthSheet } from './RevealAuthSheet';

export const MASK_TEXT = '****';

/** Milliseconds a revealed value stays visible after its last tap. Fixed by spec. */
const AUTO_HIDE_MS = 30_000;

interface MaskedValueProps {
  kind: MaskedKind;
  value: number;
  currency?: string | null;
  /** The exact numeric classes of the value being replaced, so nothing shifts. */
  className?: string;
  /** Rendered before the amount when revealed — e.g. Dashboard's negative-net "−". */
  prefix?: string;
  numberOfLines?: number;
}

/**
 * Renders `formatAmount(value, currency)` normally, or a tappable `****` when
 * the user has hidden this `kind`.
 *
 * Memoized with primitive-only props because this renders inside
 * TransactionsScreen's FlatList rows (CLAUDE.md's list-performance rule).
 */
export const MaskedValue = React.memo(function MaskedValue({
  kind,
  value,
  currency,
  className,
  prefix,
  numberOfLines,
}: MaskedValueProps) {
  const hiddenSetting = useHiddenBalanceStore((s) => s.hidden[kind]);
  const hydrated = useHiddenBalanceStore((s) => s.hydrated);
  const sessionUnlocked = useHiddenBalanceStore((s) => s.sessionUnlocked);
  const unlockSession = useHiddenBalanceStore((s) => s.unlockSession);

  const [revealed, setRevealed] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mask while hydration is still in flight: showing the real number and then
  // masking it would leak exactly what the feature hides. Hydration is kicked
  // off at bundle-eval time and always resolves before txStore has any
  // transactions to render, so this state is not observable in practice.
  const masked = (hiddenSetting || !hydrated) && !revealed;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Each instance owns its own timer, so revealing one value never affects
  // another on the same screen.
  const revealForAWhile = useCallback(() => {
    setRevealed(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRevealed(false);
    }, AUTO_HIDE_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // Turning the setting back off in Settings must not leave a stale timer
  // ticking against a value that is no longer masked at all.
  useEffect(() => {
    if (!hiddenSetting) {
      clearTimer();
      setRevealed(false);
    }
  }, [hiddenSetting, clearTimer]);

  const onPress = useCallback(() => {
    // Already unlocked this session (including after an auto-hide): reveal
    // instantly and restart this value's own timer. No second prompt, ever.
    if (sessionUnlocked) {
      revealForAWhile();
      return;
    }
    setSheetVisible(true);
  }, [sessionUnlocked, revealForAWhile]);

  const onAuthSuccess = useCallback(() => {
    unlockSession();
    revealForAWhile();
  }, [unlockSession, revealForAWhile]);

  if (!hiddenSetting && hydrated) {
    // Not hidden: byte-for-byte the same output as the bare formatAmount call
    // this component replaced, with no interactive behavior added.
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {prefix}
        {formatAmount(value, currency)}
      </Text>
    );
  }

  return (
    <>
      <Text className={className} numberOfLines={numberOfLines} onPress={onPress} suppressHighlighting>
        {masked ? MASK_TEXT : `${prefix ?? ''}${formatAmount(value, currency)}`}
      </Text>
      {sheetVisible && (
        <RevealAuthSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSuccess={onAuthSuccess}
        />
      )}
    </>
  );
});
