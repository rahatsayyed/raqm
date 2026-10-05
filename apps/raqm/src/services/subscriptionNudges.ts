import {
  getMerchantPrivacyRules,
  getSetting,
  isMerchantExcludedFromBudget,
  loadTxRecords,
  setSetting,
} from '../db/database';
import { postBudgetAlert } from '../notifications/notifications';
import { formatAmount } from '../utils/format';
import { detectRecurringDues } from './dues';
import { logEvent } from './logger';

const DAY_MS = 24 * 60 * 60 * 1000;
const NUDGE_WINDOW_MS = 3 * DAY_MS;
const NUDGED_KEY = 'sub_nudged';
const MAX_NUDGED = 200;

export const SUB_NUDGES_SETTING = 'notif_sub_nudges';

export async function areSubscriptionNudgesEnabled(): Promise<boolean> {
  return (await getSetting(SUB_NUDGES_SETTING)) !== '0';
}

async function readNudged(): Promise<Record<string, number>> {
  try {
    const raw = await getSetting(NUDGED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Once per app open: nudges about subscriptions renewing within 3 days, once per renewal cycle. */
export async function checkSubscriptionNudges(): Promise<void> {
  try {
    if (!(await areSubscriptionNudgesEnabled())) return;

    const [txs, rules, nudged] = await Promise.all([loadTxRecords(), getMerchantPrivacyRules(), readNudged()]);
    const now = Date.now();
    const dues = detectRecurringDues(txs, NUDGE_WINDOW_MS).filter((d) => d.dueTs >= now - DAY_MS);
    let changed = false;

    for (const due of dues) {
      const rawKey = due.rawMerchant ?? due.name;
      if (isMerchantExcludedFromBudget(rawKey, rules)) continue;
      const dueDay = Math.floor(due.dueTs / DAY_MS);
      if (nudged[rawKey] === dueDay) continue;

      const when = new Date(due.dueTs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      await postBudgetAlert(
        `${due.name} renews around ${when}`,
        `${formatAmount(due.amount, due.currency ?? undefined)} subscription. Still using it? Cancel from More → Bills & Reminders.`,
      );
      nudged[rawKey] = dueDay;
      changed = true;
      logEvent('subscriptionNudges.sent', rawKey);
    }

    if (changed) {
      const entries = Object.entries(nudged).slice(-MAX_NUDGED);
      await setSetting(NUDGED_KEY, JSON.stringify(Object.fromEntries(entries)));
    }
  } catch (e) {
    logEvent('subscriptionNudges.failed', e instanceof Error ? e.message : String(e));
  }
}
