// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class LumbiniBikashBankParser extends BankParser {
  getBankName(): string {
    return 'Lumbini Bikash Bank';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase() === 'LBBL_SMART';
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
    if (lower.includes('withdrawn from')) return TransactionType.EXPENSE;
    if (lower.includes('deposited in')) return TransactionType.INCOME;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const fromBase = super.extractAccountLast4(message);
    if (fromBase !== null) return fromBase;
    const match = message.match(/A\/C\s+\d*#{1,}(\d{4})/i);
    return match ? match[1] : null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const match = message.match(/Remarks:\s*([^;\n]+)/i);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }
    return super.extractMerchant(message, sender);
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/Remarks:\s*([^;]+)/i);
    return match ? match[1].trim() : null;
  }
}

export default new LumbiniBikashBankParser();
