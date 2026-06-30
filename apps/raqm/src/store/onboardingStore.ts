import { create } from 'zustand';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

export type DateRange = 'all' | '1year' | '6months' | '3months';

interface OnboardingStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  transactions: ParsedTransaction[];
  setTransactions: (txs: ParsedTransaction[]) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  dateRange: '3months',
  setDateRange: (dateRange) => set({ dateRange }),
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
}));

export function dateRangeToTimestamps(range: DateRange): { from: number; to: number } {
  const to = Date.now();
  const DAY = 86_400_000;
  const from: Record<DateRange, number> = {
    all: 0,
    '1year': to - 365 * DAY,
    '6months': to - 180 * DAY,
    '3months': to - 90 * DAY,
  };
  return { from: from[range], to };
}
