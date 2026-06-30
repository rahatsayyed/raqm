import { BaseIranianBankParser } from '../core/BaseIranianBankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Bankino (digital arm of Middle East Bank / بانک خاورمیانه), Iran.
 *
 * Handles line-based Persian SMS such as:
 *   بانک خاورمیانه
 *   خرید با کارت 7284
 *   -3,300,000
 *   XXX/XXXXXXXX
 *   مانده 14,412,600
 *   03/22
 *   12:49
 *
 * Notes:
 * - Amounts use Western digits with comma grouping; only date/time use Persian
 *   digits, which we do not parse (timestamp comes from SMS metadata).
 * - The leading sign on the amount is the reliable type signal:
 *   "-" => EXPENSE, "+" => INCOME.
 * - Currency is Iranian Rial (IRR).
 */
export class BankinoBankParser extends BaseIranianBankParser {

  getBankName(): string {
    return 'Bankino';
  }

  // "بانک خاورمیانه" = Middle East Bank (Bankino).
  private readonly bankNameMarker = 'بانک خاورمیانه';

  // "کارت" = card; followed by the masked last 4 digits.
  private readonly cardPattern = /کارت\s+(\d{3,})/;

  // Signed amount on its own line: leading +/- then a comma-grouped number.
  private readonly signedAmountPattern = /([+-])\s*([0-9][0-9,]*)/;

  // "مانده" = balance, followed by a comma-grouped number.
  private readonly balancePattern = /مانده\s+([0-9][0-9,]*)/;

  canHandle(sender: string): boolean {
    const digits = sender.split('').filter(c => /\d/.test(c)).join('');
    return digits.includes('20004861');
  }

  isTransactionMessage(message: string): boolean {
    // Must look like a Bankino SMS and carry a signed amount.
    return message.includes(this.bankNameMarker) &&
      this.signedAmountPattern.test(message);
  }

  extractAmount(message: string): number | null {
    const match = message.match(this.signedAmountPattern);
    if (match) {
      const amountStr = match[2].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const match = message.match(this.signedAmountPattern);
    if (match) {
      return match[1] === '-' ? TransactionType.EXPENSE : TransactionType.INCOME;
    }
    return null;
  }

  extractBalance(message: string): number | null {
    const match = message.match(this.balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  extractAccountLast4(message: string): string | null {
    const match = message.match(this.cardPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return null;
  }

  extractMerchant(_message: string, _sender: string): string | null {
    // Bankino SMS carries no merchant/payee field.
    return null;
  }
}

export default new BankinoBankParser();
