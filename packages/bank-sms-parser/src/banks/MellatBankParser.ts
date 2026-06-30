import { BaseIranianBankParser } from '../core/BaseIranianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Mellat Bank parser for Iranian banking SMS messages.
 * Only handles deposit and withdrawal messages, ignoring OTPs and other notifications.
 */
export class MellatBankParser extends BaseIranianBankParser {

  private readonly pattern1 = /^حساب\d+\s+(برداشت|واریز)\s*([0-9,]+)\s+مانده\s*([0-9,]+)\s+\d{2}\/\d{2}\/\d{2}-\d{2}:\d{2}/m;
  private readonly pattern2 = /^واریز سود کوتاه مدت\s+حساب\d+\s+مبلغ\s*([0-9,]+)\s+\d{2}\/\d{2}\/\d{2}/m;
  private readonly accountPattern = /حساب\s*(\d+)/;

  getBankName(): string {
    return 'Mellat Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    const mellatSenders = new Set([
      'BANK MELLAT',
      'BANKMELLAT',
      'MELLAT',
      'MELLATBANK',
      'MELLAT BANK',
    ]);
    return mellatSenders.has(upperSender);
  }

  protected isTransactionMessage(message: string): boolean {
    const trimmed = message.trim();
    return this.pattern1.test(trimmed) || this.pattern2.test(trimmed);
  }

  protected extractAmount(message: string): number | null {
    const trimmed = message.trim();

    const match1 = trimmed.match(this.pattern1);
    if (match1) {
      const amountStr = match1[2].replace(/,/g, '');
      const value = parseFloat(amountStr);
      return isNaN(value) ? null : value;
    }

    const match2 = trimmed.match(this.pattern2);
    if (match2) {
      const amountStr = match2[1].replace(/,/g, '');
      const value = parseFloat(amountStr);
      return isNaN(value) ? null : value;
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const trimmed = message.trim();

    const match1 = trimmed.match(this.pattern1);
    if (match1) {
      switch (match1[1]) {
        case 'برداشت':
          return TransactionType.EXPENSE;
        case 'واریز':
          return TransactionType.INCOME;
        default:
          return null;
      }
    }

    if (this.pattern2.test(trimmed)) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(this.accountPattern);
    if (match) {
      const fullAccount = match[1];
      if (fullAccount.length >= 4) {
        return fullAccount.slice(-4);
      }
      return fullAccount;
    }
    return null;
  }

  protected extractBalance(message: string): number | null {
    const trimmed = message.trim();

    const match1 = trimmed.match(this.pattern1);
    if (match1) {
      const balanceStr = match1[3].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      return isNaN(value) ? null : value;
    }

    return null;
  }
}

export default new MellatBankParser();
