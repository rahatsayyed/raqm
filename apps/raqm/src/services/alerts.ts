import { getAccounts, getSetting, setAccountLowBalanceAlerted, type TxRecord } from '../db/database';
import { postBudgetAlert } from '../notifications/notifications';
import { formatAmount } from '../utils/format';
import { logEvent } from './logger';
import { checkBudgetAlerts } from './budgets';
import { lowBalanceDecision } from './alertLogic';

export const LOW_BALANCE_ALERTS_SETTING = 'low_balance_alerts';

export async function checkLowBalanceAlerts(): Promise<void> {
  if ((await getSetting(LOW_BALANCE_ALERTS_SETTING)) === '0') return;
  const accounts = await getAccounts();
  for (const account of accounts) {
    if (account.hiddenAt != null || account.isCard) continue;
    const action = lowBalanceDecision(account.balance, account.lowBalanceThreshold, account.lowBalanceAlerted);
    if (action === 'rearm') {
      await setAccountLowBalanceAlerted(account.id, false);
    } else if (action === 'fire') {
      const label = account.nickname || account.bankName;
      const suffix = account.last4 ? ` (xx${account.last4})` : '';
      await postBudgetAlert(
        'Low balance',
        `${label}${suffix} is at ${formatAmount(account.balance ?? 0)}, below your ${formatAmount(account.lowBalanceThreshold ?? 0)} alert.`,
      );
      await setAccountLowBalanceAlerted(account.id, true);
    }
  }
}

/** Runs after the store refresh; fire-and-forget and never throws. */
export function runAlertChecks(txs?: TxRecord[]): void {
  checkBudgetAlerts(txs).catch(() => {});
  checkLowBalanceAlerts().catch((e) => {
    logEvent('low_balance_alert.failed', e instanceof Error ? e.message : String(e));
  });
}
