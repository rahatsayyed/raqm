// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class MachchhapuchreBankParser extends BankParser {
  getBankName(): string {
    return 'Machchhapuchchhre Bank';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase() === 'MBL_ALERT';
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
    const match = message.match(/#+(\d{4})/);
    return match ? match[1] : null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const match = message.match(/Remarks:\s*(.+?)(?:\s+Available\s+Bal\s*:|$)/i);
    if (match) {
      const raw = match[1].trim();
      const merchant = this.cleanMerchantName(raw.includes(',') ? raw.split(',')[0] : raw);
      if (this.isValidMerchantName(merchant)) return merchant;
    }
    return super.extractMerchant(message, sender);
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/Remarks:\s*(.+?)(?:\s+Available\s+Bal\s*:|$)/i);
    return match ? match[1].trim() : null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Available\s+Bal[:\s]+([0-9,]+(?:\.\d{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return super.extractBalance(message);
  }
}

export default new MachchhapuchreBankParser();
