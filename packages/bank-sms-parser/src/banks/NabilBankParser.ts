import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class NabilBankParser extends BankParser {

  getBankName(): string {
    return 'Nabil Bank';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();
    return s.includes('NABIL') || s === 'NABIL_ALERT' || s === 'NABILBANK';
  }

  protected extractAmount(message: string): number | null {
    const nprPattern = /NPR\s+([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(nprPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lower.includes('deposited') || lower.includes('credited')) return TransactionType.INCOME;
    return null;
  }

  protected extractReference(message: string): string | null {
    const remarks = /Remarks[:\s]*([A-Z0-9\-~]+)/i;
    const remarksMatch = message.match(remarks);
    if (remarksMatch) return remarksMatch[1];

    const refPattern = /(MTXN[0-9A-Z\-]+)/i;
    const refMatch = message.match(refPattern);
    if (refMatch) return refMatch[1];

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const maskedPattern = /#+(\d{4,})/;
    const match = message.match(maskedPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return super.extractAccountLast4(message);
  }
}

export default new NabilBankParser();
