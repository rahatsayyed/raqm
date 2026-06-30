import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Access Bank (Nigeria) SMS messages.
 *
 * Supported format (line-based):
 * ```
 * Debit
 * Amt:NGN20,400.00
 * Acc:146******325
 * Desc:<description>
 * Date:09/06/2026
 * Avail Bal:NGN224,408.56
 * Total:NGN2          (may be truncated — ignored)
 * ```
 * First line is "Debit" (EXPENSE) or "Credit" (INCOME).
 *
 * Sender: AccessBank
 */
export class AccessBankParser extends BankParser {

  getBankName(): string {
    return 'Access Bank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('ACCESSBANK');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    // Must look like the Access Bank line-based alert.
    return /(?:^|\n)\s*(debit|credit)\b/im.test(message) &&
      /(?:^|\n)Amt:\s*NGN/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/(?:^|\n)\s*debit\b/im.test(message)) return TransactionType.EXPENSE;
    if (/(?:^|\n)\s*credit\b/im.test(message)) return TransactionType.INCOME;
    return null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/(?:^|\n)Amt:\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Avail\s*Bal:\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Use [ \t]* (not \s*) so an empty "Desc:" line can't let the capture cross the
    // newline and grab the following Date:/Avail Bal: line as the merchant.
    const match = message.match(/Desc:[ \t]*(.+)/i);
    if (!match) return null;
    const desc = match[1].trim();
    return desc.length > 0 ? desc : null;
  }

  protected extractAccountLast4(message: string): string | null {
    // Account is masked, e.g. "146******325" — use the trailing digit group.
    const maskedMatch = message.match(/Acc:\s*[0-9]*\*+([0-9]+)/i);
    if (maskedMatch !== null) {
      return this.extractLast4Digits(maskedMatch[1]);
    }
    // Fallback: unmasked account number.
    const plainMatch = message.match(/Acc:\s*([0-9]+)/i);
    if (!plainMatch) return null;
    return this.extractLast4Digits(plainMatch[1]);
  }
}

export default new AccessBankParser();
