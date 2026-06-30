import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Altana Federal Credit Union (USA)
 *
 * Supported format:
 * - Debit card pending charge:
 *   "Pending charge for $43.92 on 04/24 20:39 CDT at MERCHANT, CITY, STATE for Debit Consumer card ending in 1234."
 *
 * Common senders: "Altana FCU", or the toll-free number (877) 590-5546.
 */
export class AltanaFCUParser extends BankParser {

  getBankName(): string {
    return 'Altana Federal Credit Union';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const upper = sender.toUpperCase();
    if (upper.includes('ALTANA')) return true;

    // Match the toll-free number across common formats: "(877) 590-5546", "877-590-5546",
    // "8775905546", "+18775905546" (and digit-only variants).
    const digits = sender.replace(/\D/g, '');
    return digits === '8775905546' || digits === '18775905546';
  }

  extractAmount(message: string): number | null {
    // "charge for $43.92 on" — captures both pending and posted charge variants.
    const pattern = /charge\s+for\s+\$([0-9,]+(?:\.\d{2})?)\s+on/i;
    const match = message.match(pattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? null : parsed;
    }
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('charge for')) return TransactionType.EXPENSE;
    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // " at MERCHANT, CITY, STATE for Debit Consumer card "
    const pattern = /\bat\s+(.+?)\s+for\s+(?:Debit|Credit)\s+Consumer/i;
    const match = message.match(pattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim().replace(/,+$/, ''));
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const fromSuper = super.extractAccountLast4(message);
    if (fromSuper !== null && fromSuper !== undefined) return fromSuper;
    // "card ending in 1234"
    const pattern = /ending\s+in\s+(\d{4})/i;
    const match = message.match(pattern);
    return match?.[1] ?? null;
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (
      lower.includes('charge for') &&
      lower.includes('ending in') &&
      lower.includes('card')
    ) {
      return true;
    }
    return super.isTransactionMessage(message);
  }

  detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('debit consumer card')) return true;
    if (lower.includes('credit consumer card')) return true;
    return super.detectIsCard(message);
  }
}

export default new AltanaFCUParser();
