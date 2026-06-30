import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class ManjushreeFinanceParser extends BankParser {

  getBankName(): string {
    return 'Manjushree Finance';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();
    return s === 'MFL' || s === 'MFL_ALERT' || s.includes('MANJUSHREE');
  }

  extractAmount(message: string): number | null {
    const nprPattern = /NPR\s+([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(nprPattern);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('debited') || lower.includes('debited by')) return TransactionType.EXPENSE;
    if (lower.includes('credited') || lower.includes('deposited')) return TransactionType.INCOME;
    return null;
  }

  extractReference(message: string): string | null {
    const remarks = /Remarks[:\s]*([^,]+)/i;
    const match = message.match(remarks);
    if (match) return match[1].trim();
    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    const transfer = /transfer\s+([^,~\n]+)/i;
    const match = message.match(transfer);
    if (match) {
      const name = match[1].trim();
      const cleaned = this.cleanMerchantName(name);
      if (this.isValidMerchantName(cleaned)) return cleaned;
    }

    return super.extractMerchant(message, sender);
  }
}

export default new ManjushreeFinanceParser();
