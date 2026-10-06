// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

const MONEY_IN_PATTERN = /£\s*([0-9,]+(?:\.\d{1,2})?)\s+just\s+landed\s+in\s+.+?\s+from\s+(.+?)\s*[.!]?\s*$/im;

// Chase UK (GBP) app notifications only; the US bank is ChaseBankParser.
export class ChaseUKParser extends BankParser {
  getBankName(): string {
    return 'Chase UK';
  }

  getCurrency(): string {
    return 'GBP';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().replace(/[\s_-]/g, '') === 'CHASEUK';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const m = smsBody.match(MONEY_IN_PATTERN);
    if (!m) return null;
    const amount = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(amount)) return null;
    const merchant = m[2].trim();
    return createParsedTransaction({
      amount,
      type: TransactionType.INCOME,
      merchant: merchant.length > 0 ? merchant : null,
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

export default new ChaseUKParser();
