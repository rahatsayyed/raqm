import { create } from 'zustand';
import { getAmountRules, type AmountRule } from '../db/database';

interface AmountRulesStore {
  maskRules: AmountRule[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

let hydratePromise: Promise<void> | null = null;

export const useAmountRulesStore = create<AmountRulesStore>((set) => ({
  maskRules: [],
  hydrated: false,
  hydrate: async () => {
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const maskRules = await getAmountRules('mask');
        set({ maskRules, hydrated: true });
      } catch (err) {
        console.error('[amountRulesStore] hydrate failed', err);
        hydratePromise = null;
      }
    })();
    return hydratePromise;
  },
}));

/** Called by the Rules screen after saving/deleting a mask rule, so open screens pick it up without a restart. */
export function invalidateAmountRulesCache(): void {
  hydratePromise = null;
  useAmountRulesStore.setState({ hydrated: false });
  void useAmountRulesStore.getState().hydrate();
}

void useAmountRulesStore.getState().hydrate();
