import { create } from 'zustand';
import { getSetting, setSetting } from '../db/database';
import { logEvent } from '../services/logger';

/** The four maskable figure classes, one per `hide_*` setting. */
export type MaskedKind = 'income' | 'expense' | 'net' | 'bank_balance';

/**
 * The only place the `hide_*` key names live. Note `bank_balance` maps to the
 * plural `hide_bank_balances` — that asymmetry is the spec's, kept as-is.
 */
export const HIDE_SETTING_KEYS: Record<MaskedKind, string> = {
  income: 'hide_income',
  expense: 'hide_expense',
  net: 'hide_net',
  bank_balance: 'hide_bank_balances',
};

const ALL_KINDS: MaskedKind[] = ['income', 'expense', 'net', 'bank_balance'];

interface HiddenBalanceStore {
  /** False until the four settings have been read from SQLite once. */
  hydrated: boolean;
  hidden: Record<MaskedKind, boolean>;
  /**
   * In-memory only, deliberately never persisted — a cold start must always
   * re-authenticate. True once a reveal-auth attempt has succeeded this session.
   */
  sessionUnlocked: boolean;
  hydrate: () => Promise<void>;
  setHidden: (kind: MaskedKind, value: boolean) => Promise<void>;
  unlockSession: () => void;
  /**
   * Re-masks every value by clearing the session unlock, without waiting for
   * a full cold start. Called from App.tsx's native "screenLocked" listener —
   * the same signal App Lock uses to decide whether to re-prompt — so Hide
   * Balances re-locks exactly when the device screen actually locks, not
   * just when the whole app process is later killed.
   */
  lockSession: () => void;
}

/**
 * Deduped hydration: several MaskedValue instances mount in the same frame and
 * would otherwise each fire four SELECTs. Mirrors the reason `getDb()` caches
 * its promise rather than its handle (see CLAUDE.md).
 */
let hydratePromise: Promise<void> | null = null;

export const useHiddenBalanceStore = create<HiddenBalanceStore>((set) => ({
  hydrated: false,
  // Default OFF for every kind: unset keys mean the feature is a no-op for
  // every existing user until they opt in from Settings.
  hidden: { income: false, expense: false, net: false, bank_balance: false },
  sessionUnlocked: false,

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const raws = await Promise.all(
          ALL_KINDS.map((kind) => getSetting(HIDE_SETTING_KEYS[kind])),
        );
        const hidden: Record<MaskedKind, boolean> = {
          income: false,
          expense: false,
          net: false,
          bank_balance: false,
        };
        ALL_KINDS.forEach((kind, i) => {
          hidden[kind] = raws[i] === '1';
        });
        set({ hidden, hydrated: true });
      } catch (err) {
        // Don't get stuck forever masking every figure app-wide: clear the
        // cached (rejected) promise so a future hydrate() call can retry,
        // instead of every MaskedValue being wedged at `hydrated: false` for
        // the rest of the process's life.
        console.error('[hiddenBalanceStore] hydrate failed', err);
        logEvent('error.caught', `hiddenBalanceStore hydrate: ${err instanceof Error ? err.message : String(err)}`);
        hydratePromise = null;
      }
    })();
    return hydratePromise;
  },

  setHidden: async (kind, value) => {
    // Optimistic in-memory update first so the Settings switch and every
    // on-screen MaskedValue flip in the same frame; the write follows.
    set((state) => ({ hidden: { ...state.hidden, [kind]: value } }));
    await setSetting(HIDE_SETTING_KEYS[kind], value ? '1' : '0');
  },

  unlockSession: () => set({ sessionUnlocked: true }),
  lockSession: () => set({ sessionUnlocked: false }),
}));

// Kick hydration off at module load. This module is imported by MaskedValue,
// which is imported by the screens, so the read starts during bundle
// evaluation — strictly earlier than txStore's transaction load, which is what
// produces the numbers MaskedValue renders. In practice hydration is always
// finished before any real amount exists to display.
void useHiddenBalanceStore.getState().hydrate();
