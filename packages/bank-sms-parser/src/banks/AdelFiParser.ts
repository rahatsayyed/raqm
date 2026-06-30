import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for AdelFi Credit Union transactions.
 * Handles messages from sender 42141 and similar.
 */
export class AdelFiParser extends BankParser {

  getBankName(): string {
    return 'AdelFi';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    return sender.includes('42141');
  }

  protected isTransactionMessage(message: string): boolean {
    return message.toLowerCase().includes('transaction alert from adelfi') &&
      message.toLowerCase().includes('had a transaction of');
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/\(\$(\d+(?:\.\d{2})?)\)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const match = message.match(/Description:\s*(.+?)(?:\.\s*Date:|$)/i);
    if (match) {
      const description = match[1].trim();
      if (description.length > 0) {
        const cleaned = description.replace(/^\d+\s+/, '').trim();
        return this.cleanMerchantName(cleaned);
      }
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;
    const match = message.match(/\*\*(\d{4})/);
    return match ? match[1] ?? null : null;
  }

  protected extractTransactionType(_message: string): TransactionType {
    return TransactionType.CREDIT;
  }
}

export default new AdelFiParser();
