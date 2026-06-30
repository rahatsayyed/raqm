import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for blu Bank (بلو), Iran.
 *
 * Handles line-based Persian SMS such as:
 *   بلو
 *   برداشت پول
 *   <NAME> عزیز، 2,500,000 ریال از حساب شما پرید.
 *   موجودی: 488,152 ریال
 *   ۷:۲۸
 *   ۱۴۰۵.۰۳.۲۲
 *
 * Notes:
 * - Amounts use Western digits with comma grouping; only date/time use Persian
 *   digits, which we do not parse (timestamp comes from SMS metadata).
 * - Type signals: "برداشت پول" / "پرید" => EXPENSE (money left the account);
 *   "واریز پول" / "نشست" => INCOME (money landed in the account).
 * - blu samples carry no card/account number, so accountLast4 is always null.
 * - Currency is Iranian Rial (IRR).
 *
 * NOTE: blu sender IDs vary widely with no reliable shared prefix (e.g.
 * "0999 998 7641", "+989999987641", "98300087641"). The only stable core
 * across observed samples is the "87641" suffix, plus the "9999987641" core.
 * canHandle matches those; additional sender IDs may need to be added as more
 * samples surface (known limitation).
 */
export class BluBankParser extends BankParser {

  getBankName(): string {
    return 'blu Bank';
  }

  getCurrency(): string {
    return 'IRR';
  }

  // "بلو" = blu (bank-name line; strongest in-body signal).
  private readonly bankNameMarker = 'بلو';

  // "ریال" = Rial. Main sentence amount: a comma-grouped number before "ریال".
  private readonly amountPattern = /([0-9][0-9,]*)\s*ریال/;

  // "موجودی:" = balance, followed by a comma-grouped number before "ریال".
  private readonly balancePattern = /موجودی:\s*([0-9][0-9,]*)\s*ریال/;

  canHandle(sender: string): boolean {
    const digits = sender.split('').filter(c => /\d/.test(c)).join('');
    return digits.endsWith('87641') || digits.includes('9999987641');
  }

  protected isTransactionMessage(message: string): boolean {
    if (!message.includes(this.bankNameMarker)) return false;
    // Must carry one of the action signals.
    return message.includes('برداشت پول') || message.includes('پرید') ||
      message.includes('واریز پول') || message.includes('نشست');
  }

  protected extractAmount(message: string): number | null {
    // First "<number> ریال" is the transaction amount (balance line comes later).
    const match = message.match(this.amountPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (message.includes('برداشت پول') || message.includes('پرید')) {
      return TransactionType.EXPENSE;
    }
    if (message.includes('واریز پول') || message.includes('نشست')) {
      return TransactionType.INCOME;
    }
    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(this.balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected extractAccountLast4(_message: string): string | null {
    // blu samples carry no card/account number.
    return null;
  }

  protected extractMerchant(_message: string, _sender: string): string | null {
    // blu SMS carries no merchant/payee field.
    return null;
  }
}

export default new BluBankParser();
