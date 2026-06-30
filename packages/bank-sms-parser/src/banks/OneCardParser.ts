import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for OneCard credit card SMS messages
 *
 * Supported formats:
 * - Spending: "You've made a booking of Rs. X on MERCHANT on card ending XXXX"
 * - Fuel: "You've fueled up for Rs. X at MERCHANT on card ending XXXX"
 * - General: "You've made a transaction of Rs. X on MERCHANT on card ending XXXX"
 *
 * Common senders: CP-OneCrd-S, ONECRD, OneCard
 */
export class OneCardParser extends BankParser {

  getBankName(): string {
    return 'OneCard';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('ONECRD') ||
      normalizedSender.includes('ONECARD') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-ONECRD-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-ONECARD-S$/.test(normalizedSender) ||
      // Other DLT patterns (OTP, Promotional, Govt)
      /^[A-Z]{2}-ONECRD-[TPG]$/.test(normalizedSender) ||
      /^[A-Z]{2}-ONECARD-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns without suffix
      /^[A-Z]{2}-ONECRD$/.test(normalizedSender) ||
      /^[A-Z]{2}-ONECARD$/.test(normalizedSender) ||
      // Direct sender IDs
      normalizedSender === 'ONECRD' ||
      normalizedSender === 'ONECARD';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const parsed = super.parse(smsBody, sender, timestamp);
    if (parsed === null) return null;

    // OneCard transactions are always credit card transactions
    // All spending on OneCard should be marked as CREDIT type
    return {
      ...parsed,
      type: TransactionType.CREDIT,
    };
  }

  extractAmount(message: string): number | null {
    // Generic pattern: "for Rs. X at" - covers most OneCard formats
    // Examples: "fueled up for Rs. X at", "hand-picked groceries for Rs. X at", etc.
    const forAmountPattern = /for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)\s+at/i;
    const forMatch = message.match(forAmountPattern);
    if (forMatch) {
      const amount = forMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern: "of Rs. X on" - for booking/transaction patterns
    const ofAmountPattern = /of\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)\s+on/i;
    const ofMatch = message.match(ofAmountPattern);
    if (ofMatch) {
      const amount = ofMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern: "spent Rs. X"
    const spentPattern = /spent\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const spentMatch = message.match(spentPattern);
    if (spentMatch) {
      const amount = spentMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: "at MERCHANT on card" - for fuel transactions
    const atMerchantOnCardPattern = /at\s+([^•\n]+?)\s+on\s+card/i;
    const atOnCardMatch = message.match(atMerchantOnCardPattern);
    if (atOnCardMatch) {
      const merchant = this.cleanMerchantName(atOnCardMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern: "on MERCHANT on card" - extract merchant between "on" and "on card"
    const merchantPattern = /on\s+([^•\n]+?)\s+on\s+card/i;
    const onCardMatch = message.match(merchantPattern);
    if (onCardMatch) {
      const merchant = this.cleanMerchantName(onCardMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Alternative pattern: "at MERCHANT on"
    const atMerchantPattern = /at\s+([^•\n]+?)\s+on/i;
    const atMatch = message.match(atMerchantPattern);
    if (atMatch) {
      const merchant = this.cleanMerchantName(atMatch[1].trim());
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

    // Pattern: "card ending XXXX" or "on card XXXX"
    const cardPatterns = [
      /card\s+ending\s+([X\d]+)/i,
      /on\s+card\s+([X\d]+)/i,
    ];

    for (const pattern of cardPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip promotional messages
    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('get reward') ||
      lowerMessage.includes('statement') ||
      lowerMessage.includes('due date') ||
      lowerMessage.includes('bill generated')
    ) {
      return false;
    }

    // Transaction indicators - OneCard always starts with "You've"
    if (
      lowerMessage.startsWith("you've") &&
      lowerMessage.includes('on card ending')
    ) {
      return true;
    }

    // Additional patterns
    if (
      lowerMessage.includes('spent') ||
      lowerMessage.includes('made a')
    ) {
      return true;
    }

    // Fall back to base class for other checks
    return super.isTransactionMessage(message);
  }
}

export default new OneCardParser();
