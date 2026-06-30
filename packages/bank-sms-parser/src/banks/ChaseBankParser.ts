import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Chase Bank (USA) SMS messages
 *
 * Supported formats:
 * - Transaction: "Card Name: You made a $9.17 transaction with TACO BELL on Mar 17, 2026 at 1:56 PM ET."
 * - Refund: "Card Name: A $X.XX refund was posted..."
 *
 * Sender: 24273 (Chase short code)
 */
export class ChaseBankParser extends BankParser {

  getBankName(): string {
    return 'Chase';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized === '24273' ||
      normalized.includes('CHASE');
  }

  extractAmount(message: string): number | null {
    // Pattern: "$9.17" or "$1,234.56"
    const amountPattern = /\$([0-9,]+(?:\.\d{2})?)/;
    const match = message.match(amountPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();

    if (lower.includes('refund')) return TransactionType.INCOME;
    if (lower.includes('credit was posted')) return TransactionType.INCOME;
    if (lower.includes('transaction')) return TransactionType.EXPENSE;
    if (lower.includes('purchase')) return TransactionType.EXPENSE;
    if (lower.includes('charged')) return TransactionType.EXPENSE;

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: "transaction with MERCHANT on"
    const withPattern = /transaction\s+with\s+(.+?)\s+on\s+/i;
    const withMatch = message.match(withPattern);
    if (withMatch) {
      const merchant = this.cleanMerchantName(withMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern: "purchase at MERCHANT on"
    const atPattern = /purchase\s+at\s+(.+?)\s+on\s+/i;
    const atMatch = message.match(atPattern);
    if (atMatch) {
      const merchant = this.cleanMerchantName(atMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const fromSuper = super.extractAccountLast4(message);
    if (fromSuper !== null && fromSuper !== undefined) return fromSuper;

    // Pattern: "card ending in 1234" or "ending 1234"
    const endingPattern = /ending\s+(?:in\s+)?(\d{4})/i;
    const match = message.match(endingPattern);
    if (match) {
      return match[1];
    }
    return null;
  }

  detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();
    // Chase card alerts always mention card names like "Visa", "Mastercard", or "card"
    if (
      lower.includes('visa') ||
      lower.includes('mastercard') ||
      lower.includes('card ending') ||
      lower.includes('credit card')
    ) {
      return true;
    }
    return super.detectIsCard(message);
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (
      lower.includes('otp') ||
      lower.includes('verification code') ||
      lower.includes('security code')
    ) {
      return false;
    }

    const keywords = ['transaction', 'purchase', 'refund', 'charged', 'credit was posted'];
    return keywords.some((kw) => lower.includes(kw));
  }
}

export default new ChaseBankParser();
