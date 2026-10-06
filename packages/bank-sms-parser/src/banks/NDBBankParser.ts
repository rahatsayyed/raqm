// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for National Development Bank (NDB, Sri Lanka) SMS messages. */
export class NDBBankParser extends BankParser {

  getBankName(): string {
    return 'National Development Bank';
  }

  getCurrency(): string {
    return 'LKR';
  }

  canHandle(sender: string): boolean {
    // Exact matches only: contains("NDB") would collide with IndusInd's "INDBNK"
    const normalized = sender.toUpperCase().replace(/[\s-]/g, '');
    return normalized === 'NDBALERT' || normalized === 'NDB';
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/LKR\s+([0-9,]+\.\d{2})\s+(?:credited|debited)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('credited to')) return TransactionType.INCOME;
    if (lower.includes('debited from')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const posMatch = message.match(/\bat\s+(.+?)\.\s*Avl\s+Bal/i);
    if (posMatch) {
      const merchant = posMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    const descMatch = message.match(/\bas\s+(.+?)\.\s*Avl\s+Bal/i);
    if (descMatch) {
      const merchant = descMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Avl\s+Bal\s+(?:LKR\s+)?([0-9,]+\.\d{2})/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractReference(_message: string): string | null {
    // The generic base pattern misreads "POS TXN on ..." as "on"
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/AC\s+X+(\d{4})(?!\d)/i);
    return match ? match[1] : null;
  }
}

export default new NDBBankParser();
