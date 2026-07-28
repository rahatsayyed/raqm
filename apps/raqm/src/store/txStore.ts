import { create } from 'zustand';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import {
  loadTxRecords,
  insertTx,
  insertParsedTx,
  updateTx,
  softDeleteTx,
  restoreTx,
  seedDefaults,
  getAccounts,
  type TxRecord,
  type NewTxInput,
  type TxPatch,
} from '../db/database';
import { getCurrentCoords } from '../services/location';
import { isDuplicateSms } from '../services/txIntelligence';
import { checkBudgetAlerts } from '../services/budgets';

async function loadAccountLabels(): Promise<Map<string, string>> {
  const accounts = await getAccounts();
  const map = new Map<string, string>();
  for (const a of accounts) {
    if (a.nickname) map.set(`${a.bankName}|${a.last4 ?? ''}`, a.nickname);
  }
  return map;
}

interface TxStore {
  txs: TxRecord[];
  ready: boolean;
  /** bankName+last4 -> account alias, kept in sync with txs so every screen shows the same label. */
  accountLabels: Map<string, string>;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  add: (input: NewTxInput) => Promise<number>;
  addParsed: (tx: ParsedTransaction) => Promise<void>;
  addParsedWithLocation: (tx: ParsedTransaction) => Promise<number | null>;
  update: (id: number, patch: TxPatch) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
}

export const useTxStore = create<TxStore>((set, get) => ({
  txs: [],
  ready: false,
  accountLabels: new Map(),

  load: async () => {
    await seedDefaults();
    const [txs, accountLabels] = await Promise.all([loadTxRecords(), loadAccountLabels()]);
    set({ txs, accountLabels, ready: true });
  },

  refresh: async () => {
    const [txs, accountLabels] = await Promise.all([loadTxRecords(), loadAccountLabels()]);
    set({ txs, accountLabels });
  },

  add: async (input) => {
    const id = await insertTx(input);
    await get().refresh();
    checkBudgetAlerts().catch(() => {});
    return id;
  },

  addParsed: async (tx) => {
    await insertParsedTx(tx);
    await get().refresh();
    checkBudgetAlerts().catch(() => {});
  },

  addParsedWithLocation: async (tx) => {
    const state = get();
    const last = state.txs[0]
      ? { amount: state.txs[0].amount, sender: state.txs[0].bankName, timestamp: state.txs[0].timestamp, reference: state.txs[0].reference }
      : null;

    if (isDuplicateSms(last, { amount: tx.amount, sender: tx.bankName, timestamp: tx.timestamp, reference: tx.reference })) {
      return null;
    }

    const id = await insertParsedTx(tx);
    if (id === null) return null; // reference-based duplicate, or a hidden account — see insertParsedTx

    await get().refresh();
    checkBudgetAlerts().catch(() => {});

    // Location capture is best-effort and can hang for several seconds when GPS/location
    // services are unavailable (getCurrentPositionAsync's fallback timeout) — never let it
    // block returning the tx id, since the caller uses that to show the toast/notification
    // immediately. Patch the coordinate in and refresh again once it resolves, in the
    // background.
    getCurrentCoords()
      .then((coords) => (coords ? updateTx(id, { lat: coords.lat, lng: coords.lng }).then(() => get().refresh()) : undefined))
      .catch(() => {});

    return id;
  },

  update: async (id, patch) => {
    await updateTx(id, patch);
    await get().refresh();
    checkBudgetAlerts().catch(() => {});
  },

  remove: async (id) => {
    await softDeleteTx(id);
    set((s) => ({ txs: s.txs.filter((t) => t.id !== id) }));
  },

  restore: async (id) => {
    await restoreTx(id);
    await get().refresh();
  },
}));
