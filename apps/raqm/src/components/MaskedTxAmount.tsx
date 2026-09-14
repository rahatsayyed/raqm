import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { formatAmount } from '../utils/format';
import { useAmountRulesStore } from '../store/amountRulesStore';
import { getMaskRuleForAmount } from '../db/database';
import { useHiddenBalanceStore } from '../store/hiddenBalanceStore';
import { RevealAuthSheet } from './RevealAuthSheet';
import { MASK_TEXT } from './MaskedValue';

const AUTO_HIDE_MS = 30_000;

interface MaskedTxAmountProps {
  amount: number;
  currency?: string | null;
  /** 'list_widgets' for list rows/home widgets/notifications; 'detail' for the detail screen. */
  scope: 'list_widgets' | 'detail';
  className?: string;
  numberOfLines?: number;
}

/**
 * Per-transaction sibling of MaskedValue: masks a single amount when it matches a
 * user-defined Amount Mask rule (Rules screen), instead of one of the four fixed
 * app-wide hidden-balance kinds. Reuses the same auth-gated reveal session as
 * MaskedValue (sessionUnlocked/RevealAuthSheet) so unlocking once covers both.
 */
export const MaskedTxAmount = React.memo(function MaskedTxAmount({
  amount,
  currency,
  scope,
  className,
  numberOfLines,
}: MaskedTxAmountProps) {
  const maskRules = useAmountRulesStore((s) => s.maskRules);
  const hydrated = useAmountRulesStore((s) => s.hydrated);
  const hydrate = useAmountRulesStore((s) => s.hydrate);
  const sessionUnlocked = useHiddenBalanceStore((s) => s.sessionUnlocked);
  const unlockSession = useHiddenBalanceStore((s) => s.unlockSession);

  const [revealed, setRevealed] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const rule = getMaskRuleForAmount(amount, maskRules);
  const shouldMask = !!rule && (rule.scope === 'everywhere' || scope === 'list_widgets');

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revealForAWhile = useCallback(() => {
    setRevealed(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRevealed(false);
    }, AUTO_HIDE_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (sessionUnlocked && sheetVisible) {
      setSheetVisible(false);
      revealForAWhile();
    }
  }, [sessionUnlocked, sheetVisible, revealForAWhile]);

  const onPress = useCallback(() => {
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

  if (!shouldMask) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {formatAmount(amount, currency)}
      </Text>
    );
  }

  return (
    <>
      <Text className={className} numberOfLines={numberOfLines} onPress={onPress} suppressHighlighting>
        {revealed ? formatAmount(amount, currency) : MASK_TEXT}
      </Text>
      {sheetVisible && (
        <RevealAuthSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onSuccess={onAuthSuccess} />
      )}
    </>
  );
});
