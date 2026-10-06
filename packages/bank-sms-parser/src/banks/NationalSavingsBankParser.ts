// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for National Savings Bank (NSB, Sri Lanka) SMS messages. */
export class NationalSavingsBankParser extends BankParser {

  getBankName(): string {
    return 'National Savings Bank';
  }

  getCurrency(): string {
    return 'LKR';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();
    return s === 'NSB' || s.endsWith('-NSB') || s.includes('-NSB-');
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/LKR\s+([0-9,]+\.\d{2})\s+(?:Credited|Debited)/i);
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
    const posMatch = message.match(/@\s+(.+?)\.\s/i);
    if (posMatch) {
      const merchant = posMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    const descMatch = message.match(/AvlBal\s+LKR\s+[0-9,]+\.\d{2}\.\s*(.+?)\.\s*Thank you/i);
    if (descMatch) {
      let merchant = descMatch[1].trim();
      if (merchant.startsWith('Transaction ')) {
        merchant = merchant.slice('Transaction '.length);
      }
      merchant = merchant.trim();
      if (merchant.length > 0) return merchant;
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/AvlBal\s+LKR\s+([0-9,]+\.\d{2})/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/A\/c\s+X+(\d{4})(?!\d)/i);
    return match ? match[1] : null;
  }
}

export default new NationalSavingsBankParser();
