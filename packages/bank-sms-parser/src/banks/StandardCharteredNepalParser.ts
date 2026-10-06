// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class StandardCharteredNepalParser extends BankParser {
  getBankName(): string {
    return 'Standard Chartered Bank Nepal';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase() === 'SC_ALERT';
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
    if (lower.includes('debited from')) return TransactionType.EXPENSE;
    if (lower.includes('deposited into')) return TransactionType.INCOME;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const fromBase = super.extractAccountLast4(message);
    if (fromBase !== null) return fromBase;
    const match = message.match(/your account\s+(\d{4,})/i);
    if (match) return this.extractLast4Digits(match[1]);
    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const lower = message.toLowerCase();
    if (lower.includes('atm')) return 'ATM Withdrawal';
    if (lower.includes('visa')) return 'VISA Transaction';
    return super.extractMerchant(message, sender);
  }
}

export default new StandardCharteredNepalParser();
