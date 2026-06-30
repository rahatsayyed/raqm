import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for ALECU (America's Largest Electric Credit Union) SMS messages.
 *
 * Supported formats:
 * - "ALEC Alert - A debit transaction from MERCHANT for $100.00 on account *1=01 was posted on Mar 30, 2026."
 * - "ALEC Alert - A credit transaction from MERCHANT for $50.00 on account *1=01 was posted on Mar 30, 2026."
 *
 * Sender: 39872
 */
export class AlecuBankParser extends BankParser {

  getBankName(): string {
    return 'ALECU';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized === '39872' ||
      normalized.includes('ALECU') ||
      normalized.includes('ALEC');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return lower.includes('alec alert') && lower.includes('transaction from');
  }

  protected extractAmount(message: string): number | null {
    const amountPattern = /\$([0-9,]+(?:\.\d{2})?)/;
    const match = message.match(amountPattern);
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
    const lower = message.toLowerCase();
    if (lower.includes('a debit transaction')) return TransactionType.EXPENSE;
    if (lower.includes('a credit transaction')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Pattern: "transaction from MERCHANT for $"
    const merchantPattern = /transaction\s+from\s+(.+?)\s+for\s+\$/i;
    const match = message.match(merchantPattern);
    if (match) {
      const raw = match[1].trim();
      // Clean up semicolon-separated metadata (e.g., "WE EGIES     ;12345 ;AUTOPAY")
      const cleaned = raw.split(';')[0].trim();
      const merchant = this.cleanMerchantName(cleaned);
      if (this.isValidMerchantName(merchant)) return merchant;
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // Pattern: "account *1=01" — extract all digits around the '=' sign
    const accountPattern = /account\s+\*(\d+=\d+)/i;
    const match = message.match(accountPattern);
    if (match) {
      const raw = match[1].replace(/=/g, '');
      if (raw.length > 0) return raw;
    }
    return super.extractAccountLast4(message);
  }
}

export default new AlecuBankParser();
