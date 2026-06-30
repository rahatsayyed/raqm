import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Zenith Bank (Nigeria) SMS messages.
 *
 * Supported format (line-based):
 * ```
 * Acct:421****577
 * DT:09/06/2026 03:23:17 PM
 * <description>
 * DR Amt:650.00          (debit -> EXPENSE)  or  CR Amt:40,000.00 (credit -> INCOME)
 * Bal:289.69
 * Dial *966# for quick airtime/Data purchase   (promo — ignored)
 * ```
 * Amounts have no NGN prefix.
 *
 * Sender: ZENITHBANK
 */
export class ZenithBankParser extends BankParser {

  getBankName(): string {
    return 'Zenith Bank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('ZENITH');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /(?:DR|CR)\s*Amt:/i.test(message) && /Acct:/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/DR\s*Amt:/i.test(message)) return TransactionType.EXPENSE;
    if (/CR\s*Amt:/i.test(message)) return TransactionType.INCOME;
    return null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/(?:DR|CR)\s*Amt:\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Bal:\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Narration is the line directly above the amount line
    const match = message.match(/^(.+)\r?\n\s*(?:DR|CR)\s*Amt:/im);
    if (!match) return null;
    const desc = match[1].trim();
    if (!desc) return null;
    if (/^(DT:|Acct:)/i.test(desc)) return null;
    return desc;
  }

  protected extractAccountLast4(message: string): string | null {
    const maskedMatch = message.match(/Acct:\s*[0-9]*\*+([0-9]+)/i);
    if (maskedMatch) return this.extractLast4Digits(maskedMatch[1]);

    const plainMatch = message.match(/Acct:\s*([0-9]+)/i);
    if (!plainMatch) return null;
    return this.extractLast4Digits(plainMatch[1]);
  }
}

export default new ZenithBankParser();
