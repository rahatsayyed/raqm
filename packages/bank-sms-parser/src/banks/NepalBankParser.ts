// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class NepalBankParser extends BankParser {
  getBankName(): string {
    return 'Nepal Bank Limited';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase() === 'NBL_ALERT';
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/NPR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('debited')) return TransactionType.EXPENSE;
    if (lower.includes('credited')) return TransactionType.INCOME;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const fromBase = super.extractAccountLast4(message);
    if (fromBase !== null) return fromBase;
    const match = message.match(/#+(\d{3,})/);
    if (match) return this.extractLast4Digits(match[1]);
    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    if (message.toLowerCase().includes('visa')) return 'VISA Transaction';
    return super.extractMerchant(message, sender);
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/\d{2}:\d{2}:\d{2},\s*([^,\s]+)/);
    return match ? match[1].trim() : null;
  }
}

export default new NepalBankParser();
