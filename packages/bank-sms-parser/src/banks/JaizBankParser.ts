import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Jaiz Bank (Nigeria) SMS messages.
 *
 * Supported format (line-based):
 * ```
 * Acct:**737
 * Amt:N50.00DR                            (DR -> EXPENSE, CR -> INCOME)
 * Desc:<description>
 * 04-JAN-26 17:46
 * Help:07007730000                        (promo/support — ignored)
 * Bal:N252.28
 * Buy Airtime, Dial *773*Amount#          (promo — ignored)
 * ```
 * Amounts carry an "N" prefix and a trailing DR/CR suffix.
 *
 * Sender: Jaiz
 */
export class JaizBankParser extends BankParser {

  getBankName(): string {
    return 'Jaiz Bank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('JAIZ');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /Amt:\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*(?:DR|CR)/i.test(message) &&
      /Acct:/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/Amt:\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*DR/i.test(message)) {
      return TransactionType.EXPENSE;
    }
    if (/Amt:\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*CR/i.test(message)) {
      return TransactionType.INCOME;
    }
    return null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/Amt:\s*N\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:DR|CR)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Bal:\s*N\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Use [ \t]* (not \s*) so an empty "Desc:" line can't let the capture cross the
    // newline and grab the following date/Bal: line as the merchant.
    const match = message.match(/Desc:[ \t]*(.+)/i);
    if (!match) return null;
    const desc = match[1].trim();
    return desc.length > 0 ? desc : null;
  }

  protected extractAccountLast4(message: string): string | null {
    const maskedMatch = message.match(/Acct:\s*\*+([0-9]+)/i);
    if (maskedMatch !== null) {
      return this.extractLast4Digits(maskedMatch[1]);
    }
    const plainMatch = message.match(/Acct:\s*([0-9]+)/i);
    if (!plainMatch) return null;
    return this.extractLast4Digits(plainMatch[1]);
  }
}

export default new JaizBankParser();
