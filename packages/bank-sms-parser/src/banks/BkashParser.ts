// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class BkashParser extends BankParser {
  getBankName(): string {
    return 'bKash';
  }

  getCurrency(): string {
    return 'BDT';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('BKASH');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('you have received') ||
      lower.includes('cash in') ||
      lower.includes('payment of') ||
      lower.includes('send money')
    );
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/Tk\s+([0-9,]+\.\d{2})/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('you have received')) return TransactionType.INCOME;
    if (lower.includes('cash in')) return TransactionType.INCOME;
    if (lower.includes('payment of')) return TransactionType.EXPENSE;
    if (lower.includes('send money')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Balance\s+Tk\s+([0-9,]+\.\d{2})/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/TrxID\s+([A-Za-z0-9]+)/i);
    return match ? match[1] : null;
  }

  protected extractMerchant(_message: string, _sender: string): string | null {
    return null;
  }

  protected extractAccountLast4(_message: string): string | null {
    return null;
  }
}

export default new BkashParser();
