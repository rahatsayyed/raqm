// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Nations Trust Bank (Sri Lanka) credit-card purchase SMS messages. */
export class NationsTrustBankParser extends BankParser {

  getBankName(): string {
    return 'Nations Trust Bank';
  }

  getCurrency(): string {
    return 'LKR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('NATIONSSMS');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    // Card bill settlement ("...made to Card #...") is not a spend
    if (lower.includes('made to card')) {
      return false;
    }
    return lower.includes('approved on your card');
  }

  protected extractTransactionType(message: string): TransactionType | null {
    return /approved on your card/i.test(message) ? TransactionType.CREDIT : null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/for\s+LKR\s+([0-9,]+\.\d{2})/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const match = message.match(/\bat\s+(.+?)\s+Available\s+Bal/i);
    if (match) {
      const merchant = match[1].trim();
      if (merchant.length > 0) return merchant;
    }
    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Available\s+Bal\s+LKR\s+([0-9,]+\.\d{2})/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/Card\s+\d+\*+(\d{4})(?!\d)/i);
    return match ? match[1] : null;
  }
}

export default new NationsTrustBankParser();
