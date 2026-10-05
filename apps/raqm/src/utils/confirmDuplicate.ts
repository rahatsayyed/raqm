import { Alert } from 'react-native';
import { findSameDayAmountMatch, type TxRecord } from '../db/database';
import type { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from './format';

function describe(tx: TxRecord): string {
  return `${formatAmount(tx.amount, tx.currency)}${tx.merchantDisplay ? ` · ${tx.merchantDisplay}` : ''}`;
}

/** Resolves false when the user says the entry already exists; true when safe or confirmed to add. */
export async function confirmNotDuplicate(
  amount: number,
  type: TransactionType,
  timestamp: number,
): Promise<boolean> {
  const dup = await findSameDayAmountMatch(amount, type, timestamp);
  if (!dup) return true;

  return new Promise((resolve) => {
    Alert.alert(
      'Possible duplicate',
      `You already have ${describe(dup)} on this day. Is this the same transaction?`,
      [
        { text: 'Already logged', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Add anyway', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}
