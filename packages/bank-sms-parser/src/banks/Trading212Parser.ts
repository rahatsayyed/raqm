// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

const INTEREST_PATTERN = /earned\s+£\s*([0-9,]+(?:\.\d{1,2})?)\s+interest/i;

// Trading 212 app notifications only; GBP interest only, non-£ notices are skipped.
export class Trading212Parser extends BankParser {
  getBankName(): string {
    return 'Trading 212';
  }

  getCurrency(): string {
    return 'GBP';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().replace(/[\s_-]/g, '') === 'TRADING212';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const m = smsBody.match(INTEREST_PATTERN);
    if (!m) return null;
    const amount = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(amount)) return null;
    return createParsedTransaction({
      amount,
      type: TransactionType.INCOME,
      merchant: 'Trading 212 Interest',
      reference: null,
      accountLast4: null,
      balance: null,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      currency: this.getCurrency(),
    });
  }
}

export default new Trading212Parser();
