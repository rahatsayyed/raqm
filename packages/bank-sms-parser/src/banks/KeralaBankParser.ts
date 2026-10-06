// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Kerala Bank (Kerala State Co-operative Bank) SMS; distinct from Kerala Gramin Bank.
 * Format: "Dear Customer Your A/c no XXXX0024 is credited with 15000.00 on 06-06-2026 by Loan Recovery From : 139451061. Balance is -579822.00 - Kerala Bank"
 */
export class KeralaBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Kerala Bank';
  }

  getCurrency(): string {
    return 'INR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('KELBNK');
  }

  extractAmount(message: string): number | null {
    const match = message.match(/(?:credited|debited)\s+with\s+([0-9,]+(?:\.[0-9]{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;
    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Stop at "From :", a period, or the bank signature so the suffix is not captured
    const match = message.match(/\bby\s+(.+?)(?:\s+From\s*:|\s*-\s*Kerala\s+Bank|\.|$)/i);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractBalance(message: string): number | null {
    // Loan accounts print negative balances
    const match = message.match(/Balance\s+is\s+(-?[0-9,]+(?:\.[0-9]{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }

    return super.extractBalance(message);
  }
}

export default new KeralaBankParser();
