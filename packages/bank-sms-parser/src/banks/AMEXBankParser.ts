import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for American Express (AMEX) card SMS messages
 *
 * Supported formats:
 * - Spending: "Alert: You've spent INR 1,017.70 on your AMEX card ** 91000 at VOUCHER PLAT on 20 August 2025"
 *
 * Common senders: TX-AMEXIN-S, AMEXIN, AMEX
 */
export class AMEXBankParser extends BankParser {

  getBankName(): string {
    return 'American Express';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('AMEX') ||
      normalizedSender.includes('AMEXIN') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-AMEXIN-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-AMEX-S$/.test(normalizedSender) ||
      // Other DLT patterns (OTP, Promotional, Govt)
      /^[A-Z]{2}-AMEXIN-[TPG]$/.test(normalizedSender) ||
      /^[A-Z]{2}-AMEX-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns without suffix
      /^[A-Z]{2}-AMEXIN$/.test(normalizedSender) ||
      /^[A-Z]{2}-AMEX$/.test(normalizedSender) ||
      // Direct sender IDs
      normalizedSender === 'AMEXIN' ||
      normalizedSender === 'AMEX';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const parsed = super.parse(smsBody, sender, timestamp);
    if (parsed === null) return null;

    // AMEX transactions are always credit card transactions
    // All spending on AMEX cards should be marked as CREDIT type
    return {
      ...parsed,
      type: TransactionType.CREDIT,
    };
  }

  extractAmount(message: string): number | null {
    // Pattern: "You've spent INR 1,017.70" or "spent INR 1,017.70"
    const spentPattern = /spent\s+INR\s+([0-9,]+(?:\.\d{2})?)\s+on/i;
    const spentMatch = message.match(spentPattern);
    if (spentMatch) {
      const amount = parseFloat(spentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern for other possible formats: "INR 1,017.70 spent"
    const altSpentPattern = /INR\s+([0-9,]+(?:\.\d{2})?)\s+spent/i;
    const altSpentMatch = message.match(altSpentPattern);
    if (altSpentMatch) {
      const amount = parseFloat(altSpentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: "at VOUCHER PLAT on 20 August"
    const merchantPattern = /at\s+([^•\n]+?)\s+on\s+\d{1,2}\s+\w+/i;
    const merchantMatch = message.match(merchantPattern);
    if (merchantMatch) {
      const merchant = this.cleanMerchantName(merchantMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern: "AMEX card ** 91000" - extract the last part
    const cardPattern = /AMEX\s+card\s+\*+\s*(\d+)/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return this.extractLast4Digits(cardMatch[1]);
    }

    // Alternative pattern: "card ending XXXX"
    const endingPattern = /card\s+ending\s+(\d{4})/i;
    const endingMatch = message.match(endingPattern);
    if (endingMatch) {
      return endingMatch[1];
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip promotional messages
    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('reward') ||
      lowerMessage.includes('membership') ||
      lowerMessage.includes('statement') ||
      lowerMessage.includes('due date')
    ) {
      return false;
    }

    // Fall back to base class for other checks
    return super.isTransactionMessage(message);
  }
}

export default new AMEXBankParser();
