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
  type TxRecord,
  type NewTxInput,
  type TxPatch,
} from '../db/database';
import { getCurrentCoords } from '../services/location';
import { isDuplicateSms } from '../services/txIntelligence';

interface TxStore {
  txs: TxRecord[];
  ready: boolean;
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

  load: async () => {
    await seedDefaults();
    const txs = await loadTxRecords();
    set({ txs, ready: true });
  },

  refresh: async () => {
    const txs = await loadTxRecords();
    set({ txs });
  },

  add: async (input) => {
    const id = await insertTx(input);
    await get().refresh();
    return id;
  },

  addParsed: async (tx) => {
    await insertParsedTx(tx);
    await get().refresh();
  },

  addParsedWithLocation: async (tx) => {
    const state = get();
    const last = state.txs[0]
      ? { amount: state.txs[0].amount, sender: state.txs[0].bankName, timestamp: state.txs[0].timestamp }
      : null;

    if (isDuplicateSms(last, { amount: tx.amount, sender: tx.bankName, timestamp: tx.timestamp })) {
      return null;
    }

    const id = await insertParsedTx(tx);

    const coords = await getCurrentCoords();
    if (coords) {
      await updateTx(id, { lat: coords.lat, lng: coords.lng });
    }

    await get().refresh();
    return id;
  },

  update: async (id, patch) => {
    await updateTx(id, patch);
    await get().refresh();
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
