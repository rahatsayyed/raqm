import { ParsedTransaction, TransactionType } from '../core/types';
import { FABParser } from './FABParser';

/**
 * Parser for Liv Bank (UAE) - Digital bank
 * Inherits from FABParser (which encapsulates UAEBankParser logic) for multi-currency support.
 * Handles AED and other currency transactions.
 *
 * Example SMS formats:
 * - Credit: "AED 3,586.96 has been credited to account 095XXX71XXXO1. Current balance is AED 4,377.01."
 * - Debit: "Purchase of AED 33.00 with Debit Card ending 4878 at JABAL HAFEET HAIRDRESS, Sharjah. Avl Balance is AED 4,344.01."
 * - Multi-currency: "Purchase of USD 100.00 with Debit Card ending 4878 at AMAZON.COM. Avl Balance is AED 4,244.01."
 */
export class LivBankParser extends FABParser {

  getBankName(): string {
    return 'Liv Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase().replace(/\s+/g, '');
    return normalizedSender === 'LIV' ||
      normalizedSender.includes('LIV') ||
      /^[A-Z]{2}-LIV-[A-Z]$/.test(normalizedSender);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip non-transaction messages specific to Liv
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code') ||
      lowerMessage.includes('do not share') ||
      lowerMessage.includes('activation') ||
      lowerMessage.includes('has been blocked') ||
      lowerMessage.includes('has been activated') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('declined') ||
      lowerMessage.includes('insufficient balance')
    ) {
      return false;
    }

    // Liv-specific transaction indicators
    const livTransactionKeywords = [
      'has been credited',
      'purchase of',
      'debit card ending',
      'credit card ending',
    ];

    if (livTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Fallback to base class transaction detection
    return super.isTransactionMessage(message);
  }

  // extractAmount handled by FABParser (UAEBankParser equivalent)

  protected extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Pattern for purchases: "at MERCHANT_NAME"
    // This allows dots in merchant names (like AMAZON.COM) but stops at comma or "Avl Balance" or period with space
    if (lowerMessage.includes('purchase of')) {
      // Pattern: Match everything after "at " until we hit a comma, " Avl", or ". " (period with space)
      const merchantPattern = /at\s+([^,]+?)(?:,|\s+Avl|\.\s)/i;
      const merchantMatch = message.match(merchantPattern);
      if (merchantMatch) {
        const merchant = merchantMatch[1].trim();
        if (merchant.length > 0 && !merchant.includes('Avl Balance')) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Fallback: Match up to just "Avl" or end of merchant before punctuation
      const fallbackPattern = /at\s+([^.]+?)(?:\s+Avl|,)/i;
      const fallbackMatch = message.match(fallbackPattern);
      if (fallbackMatch) {
        const merchant = fallbackMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Credit transactions might not have merchant
    if (lowerMessage.includes('has been credited')) {
      return 'Account Credit';
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) return superResult;

    // Pattern 1: "Debit Card ending XXXX" or "Credit Card ending XXXX"
    const cardPattern = /(?:Debit|Credit)\s+Card ending\s+(\d{4})/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return cardMatch[1];
    }

    // Pattern 2: Account number (may be alphanumeric with masks)
    // "account 095XXX71XXXO1" - capture everything, filter to digits, take last 4
    const accountPattern = /account\s+([0-9A-Z]+)/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) {
      return this.extractLast4Digits(accountMatch[1]);
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Liv Bank balance patterns: Support multi-currency
    const balancePatterns: RegExp[] = [
      // "Current balance is CURRENCY X,XXX.XX"
      /Current balance is\s+([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,

      // "Avl Balance is CURRENCY X,XXX.XX"
      /Avl Balance is\s+([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,

      // Generic "Balance: CURRENCY X,XXX.XX"
      /Balance:?\s+([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[2].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) return parsed;
        return null;
      }
    }

    // Fallback to FABParser's multi-currency balance extraction
    return super.extractBalance(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Credits/Income
    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited to account')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback')) return TransactionType.INCOME;

    // Purchases/Expenses
    if (lowerMessage.includes('purchase of')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;

    // Fallback to base class logic
    return super.extractTransactionType(message);
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Liv-specific card indicators
    return lowerMessage.includes('debit card ending') ||
      lowerMessage.includes('credit card ending') ||
      lowerMessage.includes('purchase of') ||  // Liv Bank uses this for card purchases
      super.detectIsCard(message);
  }

  protected containsCardPurchase(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Liv Bank uses "Purchase of" with "Debit Card ending" or "Credit Card ending"
    return (
      lowerMessage.includes('purchase of') &&
      (lowerMessage.includes('debit card ending') || lowerMessage.includes('credit card ending'))
    ) || super.containsCardPurchase(message);
  }

  protected extractCurrency(message: string): string | null {
    // Extract currency from the transaction context for Liv Bank
    const currencyPatterns: RegExp[] = [
      // "Purchase of CURRENCY amount"
      /purchase of\s+([A-Z]{3})\s+[\d,]+(?:\.\d{2})?/i,

      // "CURRENCY amount has been credited"
      /([A-Z]{3})\s+[\d,]+(?:\.\d{2})?[\s\n]+has been credited/i,

      // Generic pattern - CURRENCY followed by amount
      /([A-Z]{3})\s+[\d,]+(?:\.\d{2})?/i,
    ];

    for (const pattern of currencyPatterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();

        // Validate it's a 3-letter code (standard ISO currency format) but not month names
        if (
          /^[A-Z]{3}$/.test(currencyCode) &&
          !/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i.test(currencyCode)
        ) {
          return currencyCode;
        }
      }
    }

    // Default to AED for Liv Bank (UAE Dirham)
    return 'AED';
  }
}

export default new LivBankParser();
