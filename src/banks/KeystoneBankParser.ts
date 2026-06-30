import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Keystone Bank (Nigeria) SMS messages.
 *
 * Supported format (line-based):
 * ```
 * Debit!                                  (or Credit!)
 * Acct:602****370
 * Amt:NGN-57,000.00                       (debit carries a leading minus)
 * Desc:<description>
 * Date:26-05-2026 0:0
 * Bal:NGN1,929.24
 * Download Keymobile bit.ly/31MJj1s       (promo — ignored)
 * ```
 *
 * Sender: KEYSTONE
 */
export class KeystoneBankParser extends BankParser {

  getBankName(): string {
    return 'Keystone Bank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('KEYSTONE');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /^\s*(debit|credit)!/im.test(message) &&
      /Amt:\s*NGN/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/^\s*debit!/im.test(message)) return TransactionType.EXPENSE;
    if (/^\s*credit!/im.test(message)) return TransactionType.INCOME;
    // Fallback to the sign on the amount line.
    if (/Amt:\s*NGN\s*-/i.test(message)) return TransactionType.EXPENSE;
    return null;
  }

  protected extractAmount(message: string): number | null {
    // Strip the leading minus when present; we only need the magnitude.
    const match = message.match(/Amt:\s*NGN\s*-?\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Bal:\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Use [ \t]* (not \s*) so an empty "Desc:" line can't let the capture cross the
    // newline and grab the following Date:/Bal: line as the merchant.
    const match = message.match(/Desc:[ \t]*(.+)/i);
    if (!match) return null;
    const desc = match[1].trim();
    return desc.length > 0 ? desc : null;
  }

  protected extractAccountLast4(message: string): string | null {
    const maskedMatch = message.match(/Acct:\s*[0-9]*\*+([0-9]+)/i);
    if (maskedMatch !== null) {
      return this.extractLast4Digits(maskedMatch[1]);
    }
    const plainMatch = message.match(/Acct:\s*([0-9]+)/i);
    if (!plainMatch) return null;
    return this.extractLast4Digits(plainMatch[1]);
  }
}

export default new KeystoneBankParser();
