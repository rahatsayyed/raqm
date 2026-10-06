// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Bank of Abyssinia (Ethiopia) ETB transactions. */
export class BankOfAbyssiniaParser extends BankParser {

  getBankName(): string {
    return 'Bank of Abyssinia';
  }

  getCurrency(): string {
    return 'ETB';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase().trim();
    return upperSender === 'BOA' ||
      upperSender.includes('ABYSSINIA') ||
      /^[A-Z]{2}-BOA-[A-Z]$/.test(upperSender);
  }

  protected extractAmount(message: string): number | null {
    const verbMatch = message.match(/(?:credited|debited)\s+with\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (verbMatch) return this.toAmount(verbMatch[1]);

    const firstEtbMatch = message.match(/ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (firstEtbMatch) return this.toAmount(firstEtbMatch[1]);

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const match = message.match(/credited\s+with\s+ETB\s*[0-9,]+(?:\.[0-9]{1,2})?\s+by\s+([^.]+?)\./i);
    if (match) {
      const merchant = match[1].replace(/\s+/g, ' ').trim();
      if (merchant.length > 0 && this.isValidMerchantName(merchant)) {
        return this.cleanMerchantName(merchant);
      }
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/account\s+([\d*]+)/i);
    if (match) {
      const last4 = this.extractLast4Digits(match[1]);
      if (last4 !== null) return last4;
    }
    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Available\s+Balance:\s*ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) return this.toAmount(match[1]);
    return super.extractBalance(message);
  }

  private toAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
}

export default new BankOfAbyssiniaParser();
