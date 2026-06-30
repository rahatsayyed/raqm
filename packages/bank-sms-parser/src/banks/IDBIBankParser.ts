import { BankParser } from '../core/BankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Parser for IDBI Bank SMS messages
 *
 * Supported formats:
 * - Debit: "Your account has been successfully debited with Rs 59.00"
 * - UPI: "IDBI Bank Acct XX1234 debited for Rs 1040.00"
 * - AutoPay/Mandate transactions
 * - Balance information
 *
 * Common senders: IDBIBK, IDBIBANK, variations with DLT patterns
 */
export class IDBIBankParser extends BankParser {

  getBankName(): string {
    return 'IDBI Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('IDBIBK') ||
      normalizedSender.includes('IDBIBANK') ||
      normalizedSender.includes('IDBI') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-IDBIBK-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-IDBI-S$/.test(normalizedSender) ||
      // Legacy patterns
      /^[A-Z]{2}-IDBIBK$/.test(normalizedSender) ||
      /^[A-Z]{2}-IDBI$/.test(normalizedSender) ||
      // Direct sender IDs
      normalizedSender === 'IDBIBK' ||
      normalizedSender === 'IDBIBANK';
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "debited with Rs 59.00"
    const debitWithPattern = /debited\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitWithMatch = message.match(debitWithPattern);
    if (debitWithMatch) {
      const amount = parseFloat(debitWithMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 2: "debited for Rs 1040.00"
    const debitForPattern = /debited\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitForMatch = message.match(debitForPattern);
    if (debitForMatch) {
      const amount = parseFloat(debitForMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 3: "credited with Rs XXX"
    const creditPattern = /credited\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
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
    // Pattern 1: "towards <merchant> for"
    const towardsPattern = /towards\s+([^.\n]+?)\s+for/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      const merchant = this.cleanMerchantName(towardsMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "; <merchant> credited."
    const creditedMerchantPattern = /;\s*([^.\n]+?)\s+credited\./i;
    const creditedMerchantMatch = message.match(creditedMerchantPattern);
    if (creditedMerchantMatch) {
      const merchant = this.cleanMerchantName(creditedMerchantMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: AutoPay/Mandate specific
    if (message.toLowerCase().includes('autopay') ||
      message.toLowerCase().includes('mandate')) {
      // Extract merchant name before "for" if it's AutoPay
      const merchantPattern = /towards\s+([^.\n]+?)\s+for\s+\w*MANDATE/i;
      const merchantMatch = message.match(merchantPattern);
      if (merchantMatch) {
        return this.cleanMerchantName(merchantMatch[1].trim());
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null) {
      return baseResult;
    }

    // Pattern 1: "Acct XX1234" or "IDBI Bank Acct XX1234"
    const acctPatterns = [
      /IDBI\s+Bank\s+Acct\s+([X*\d]+)/i,
      /Acct\s+([X*\d]+)/i,
    ];

    for (const pattern of acctPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: "RRN 519766155631"
    const rrnPattern = /RRN\s+([A-Za-z0-9]+)/i;
    const rrnMatch = message.match(rrnPattern);
    if (rrnMatch) {
      return rrnMatch[1];
    }

    // Pattern 2: "UPI:521687538121"
    const upiPattern = /UPI:([A-Za-z0-9]+)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      return upiMatch[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "Bal Rs 3694.38"
    const balancePattern = /Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const amount = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip UPI block instructions (not a transaction)
    if (lowerMessage.includes('to block upi') && lowerMessage.includes('send sms')) {
      // This is just instruction text, don't skip the entire message
    }

    // Fall back to base class for standard checks
    return super.isTransactionMessage(message);
  }
}

export default new IDBIBankParser();
