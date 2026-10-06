// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for ZamZam Bank (Ethiopia) ETB transactions. */
export class ZamZamBankParser extends BankParser {

  getBankName(): string {
    return 'ZamZam Bank';
  }

  getCurrency(): string {
    return 'ETB';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().trim();
    return normalized === 'ZAMZAM BANK' ||
      normalized === 'ZAMZAMBANK' ||
      /^[A-Z]{2}-ZAMZAM-[A-Z]$/.test(normalized);
  }

  // Picks the first ETB amount (never the balance); whole amounts like "ETB 32000" are valid
  protected extractAmount(message: string): number | null {
    const match = message.match(/ETB\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) return this.toScaledAmount(match[1]);
    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited by')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;

    if (lowerMessage.includes('has been debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const match = message.match(/has\s+been\s+credited\s+by\s+(.+?)\s+with\s+ETB\b/i);
    if (match) {
      const merchant = match[1].replace(/\s+/g, ' ').trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }
    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/\*+(\d+)/);
    if (match) return this.extractLast4Digits(match[1]);
    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/current\s+balance\s+is\s+ETB\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) return this.toScaledAmount(match[1]);
    return super.extractBalance(message);
  }

  private toScaledAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
  }
}

export default new ZamZamBankParser();
