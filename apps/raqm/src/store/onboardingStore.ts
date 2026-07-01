import { create } from 'zustand';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import {
  loadTransactions,
  insertTransaction,
  insertTransactions,
  clearTransactions,
} from '../db/database';

export type DateRange = 'all' | '1year' | '6months' | '3months' | 'custom';

interface OnboardingStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  customFrom: number | null;
  customTo: number | null;
  setCustomRange: (from: number, to: number) => void;
  transactions: ParsedTransaction[];
  dbReady: boolean;
  initDb: () => Promise<void>;
  setTransactions: (txs: ParsedTransaction[]) => Promise<void>;
  addTransaction: (tx: ParsedTransaction) => Promise<void>;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  dateRange: '3months',
  setDateRange: (dateRange) => set({ dateRange }),
  customFrom: null,
  customTo: null,
  setCustomRange: (customFrom, customTo) => set({ customFrom, customTo }),
  transactions: [],
  dbReady: false,

  initDb: async () => {
    const txs = await loadTransactions();
    set({ transactions: txs, dbReady: true });
  },

  setTransactions: async (txs) => {
    await clearTransactions();
    await insertTransactions(txs);
    set({ transactions: txs });
  },

  addTransaction: async (tx) => {
    await insertTransaction(tx);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
  },
}));

export function dateRangeToTimestamps(
  range: DateRange,
  customFrom?: number | null,
  customTo?: number | null,
): { from: number; to: number } {
  const now = Date.now();
  const DAY = 86_400_000;
  if (range === 'custom') {
    return { from: customFrom ?? now - 90 * DAY, to: customTo ?? now };
  }
  const from: Record<Exclude<DateRange, 'custom'>, number> = {
    all: 0,
    '1year': now - 365 * DAY,
    '6months': now - 180 * DAY,
    '3months': now - 90 * DAY,
  };
  return { from: from[range], to: now };
}
