import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Opay (Nigeria) SMS messages.
 *
 * Supported format (sentence-style, NO account number and NO balance — Opay omits both):
 * ```
 * Dear OPay user, N2,300.00 has been debited for Card Payment via POS on 14-May-2026 19:28.
 * Dear OPay user, N150.00 has been credited ... (best-effort credit handling)
 * ```
 * Amounts carry an "N" prefix. Merchant/description is the "<purpose> via <channel>"
 * text captured between "debited/credited for " and " on ".
 *
 * Sender: Opay
 */
export class OpayBankParser extends BankParser {

  getBankName(): string {
    return 'Opay';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('OPAY');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /Dear\s+OPay\s+user/i.test(message) &&
      /has\s+been\s+(?:debited|credited)/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/has\s+been\s+debited/i.test(message)) return TransactionType.EXPENSE;
    if (/has\s+been\s+credited/i.test(message)) return TransactionType.INCOME;
    return null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/N\s*([0-9,]+(?:\.\d{1,2})?)\s+has\s+been/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Anchor the trailing " on " to the actual date (DD-Mon-YYYY) so a purpose that
    // itself contains " on " (e.g. "Payment on Account") isn't truncated — the lazy
    // capture backtracks past any earlier " on " that isn't followed by a date.
    const match = message.match(
      /has\s+been\s+(?:debited|credited)\s+for\s+(.+?)\s+on\s+\d{1,2}-[A-Za-z]{3}-\d{2,4}/i
    );
    if (!match) return null;
    const desc = match[1].trim();
    return desc.length > 0 ? desc : null;
  }
}

export default new OpayBankParser();
