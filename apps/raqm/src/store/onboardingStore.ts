import { create } from 'zustand';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

export type DateRange = 'all' | '1year' | '6months' | '3months' | 'custom';

interface OnboardingStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  customFrom: number | null;
  customTo: number | null;
  setCustomRange: (from: number, to: number) => void;
  transactions: ParsedTransaction[];
  setTransactions: (txs: ParsedTransaction[]) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  dateRange: '3months',
  setDateRange: (dateRange) => set({ dateRange }),
  customFrom: null,
  customTo: null,
  setCustomRange: (customFrom, customTo) => set({ customFrom, customTo }),
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
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
