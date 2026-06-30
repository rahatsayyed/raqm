import { BankParser } from '../core/BankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Parser for Karnataka Bank SMS messages
 *
 * Supported formats:
 * - Debit: "Your Account x001234x has been DEBITED for Rs.6368/-"
 * - Credit: "Your a/c XX1234 is credited by Rs.6600.00"
 * - ACH, UPI, and other transaction types
 *
 * Common senders: Karnataka Bank, KTKBNK, variations with DLT patterns
 */
export class KarnatakaBankParser extends BankParser {

  getBankName(): string {
    return 'Karnataka Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('KARNATAKA BANK') ||
      normalizedSender.includes('KARNATAKABANK') ||
      normalizedSender.includes('KBLBNK') ||
      normalizedSender.includes('KTKBANK') ||
      normalizedSender.includes('KARBANK') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-KBLBNK-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-KARBANK-S$/.test(normalizedSender) ||
      // Legacy patterns
      /^[A-Z]{2}-KBLBNK$/.test(normalizedSender) ||
      // Direct sender IDs
      normalizedSender === 'KBLBNK' ||
      normalizedSender === 'KARBANK'
    );
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "DEBITED for Rs.6368/-"
    const debitPattern = /DEBITED\s+for\s+Rs\.?([0-9,]+(?:\.\d{2})?)\/?-?/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 2: "credited by Rs.6600.00"
    const creditPattern = /credited\s+by\s+Rs\.?([0-9,]+(?:\.\d{2})?)/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: ACH transactions - "ACHInwDr-MERCHANT/date"
    const achPattern = /ACH[A-Za-z]*-([^/]+)\//i;
    const achMatch = message.match(achPattern);
    if (achMatch) {
      const merchant = this.cleanMerchantName(achMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "from <merchant> on" for UPI
    const fromPattern = /from\s+([^\s]+)\s+on/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: Check for specific transaction types
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('lic of india')) {
      return 'LIC of India';
    }
    if (lowerMessage.includes('upi') && message.match(fromPattern) === null) {
      return 'UPI Transaction';
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null) {
      return baseResult;
    }

    // Pattern 1: "Account x001234x" or "Account XX1234X"
    // Capture everything after keyword, filter to digits, take last 4
    const accountPattern1 = /Account\s+([xX\d]+)/i;
    const accountMatch1 = message.match(accountPattern1);
    if (accountMatch1) {
      return this.extractLast4Digits(accountMatch1[1]);
    }

    // Pattern 2: "a/c XX1234"
    const accountPattern2 = /a\/c\s+([xX\d]+)/i;
    const accountMatch2 = message.match(accountPattern2);
    if (accountMatch2) {
      return this.extractLast4Digits(accountMatch2[1]);
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: "UPI Ref no 441877242175"
    const upiRefPattern = /UPI\s+Ref\s+no\s+([0-9]+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "Balance is Rs.705.92"
    const balancePattern = /Balance\s+is\s+Rs\.?([0-9,]+(?:\.\d{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(balance)) {
        return balance;
      }
    }

    // Fall back to base class
    return super.extractBalance(message);
  }
}

export default new KarnatakaBankParser();
