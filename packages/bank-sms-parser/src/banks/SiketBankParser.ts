// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Siket Bank (Ethiopia) ETB transactions. */
export class SiketBankParser extends BankParser {

  getBankName(): string {
    return 'Siket Bank';
  }

  getCurrency(): string {
    return 'ETB';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().trim();
    return normalized === 'SIKET BANK' ||
      normalized === 'SIKETBANK' ||
      normalized === 'SIKET' ||
      /^[A-Z]{2}-SIKET-[A-Z]$/.test(normalized);
  }

  protected extractAmount(message: string): number | null {
    // Verb-linked amount so Service Charge / VAT / balance are never captured
    const patterns = [
      /Credited\s+with\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /Debited\s+with\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /transferred\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return this.toScaledAmount(match[1]);
    }

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('you have transferred')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transferred etb')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const match = message.match(/to\s+(telebirr account\s+[+\d]+)/i);
    if (match) {
      const merchant = match[1].trim();
      if (merchant.length > 0) return merchant;
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const patterns = [
      /Account\s+([\d*]+)/i,
      /your account\s+([\d*]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const last4 = this.extractLast4Digits(match[1]);
        if (last4 !== null) return last4;
      }
    }

    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Current\s+Balance\s+is\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) return this.toScaledAmount(match[1]);
    return super.extractBalance(message);
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/Reference\s+number\s+([A-Z0-9]+)/i);
    if (match && match[1].length > 0) return match[1];
    return super.extractReference(message);
  }

  private toScaledAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
  }
}

export default new SiketBankParser();
