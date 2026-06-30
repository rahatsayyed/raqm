import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class BPCEParser extends BankParser {

  getBankName(): string {
    return 'BPCE';
  }

  getCurrency(): string {
    return 'EUR';
  }

  canHandle(sender: string): boolean {
    return sender === '38015';
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("ajout d'un bénéficiaire")) {
      return false;
    }

    return lowerMessage.includes('virement instantané') ||
      super.isTransactionMessage(message);
  }

  protected extractAmount(message: string): number | null {
    const patterns = [
      /de\s+([0-9,]+(?:\.\d{2})?)\s+EUR/i,
      /([0-9,]+(?:\.\d{2})?)\s*EUR/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '.');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('virement instantané') && lowerMessage.includes('reçu')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('virement instantané')) {
      return TransactionType.EXPENSE;
    }

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const patterns = [
      /vers\s+([^.\n]+?)(?:\s+du\s+|\s+le\s+|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    return super.extractAccountLast4(message);
  }
}

export default new BPCEParser();
