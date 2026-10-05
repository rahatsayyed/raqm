import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { recordFailedSms } from '../db/database';

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d+)?/i;
const TX_WORD_RE = /\b(debited|credited|withdrawn|deposited|spent|received|transferred|paid|sent)\b/i;
const NON_TX_RE = /\b(otp|one[- ]time|offer|discount|win|cashback|is due|overdue|request(?:ed)?|statement)\b/i;

export function looksLikeTxSms(body: string): boolean {
  return AMOUNT_RE.test(body) && TX_WORD_RE.test(body) && !NON_TX_RE.test(body);
}

/** Records a known-bank SMS that looks like a transaction but didn't parse; true only if newly recorded. */
export async function captureParseFailure(sender: string, body: string, timestamp: number): Promise<boolean> {
  if (!BankParserFactory.isKnownBankSender(sender) || !looksLikeTxSms(body)) return false;
  return recordFailedSms(sender, body, timestamp);
}
