import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Kerala Gramin Bank (India) SMS messages
 *
 * Handles formats like:
 * - "Your a/c no. XXXX12345 is debited for Rs.160.00 on 28/7/25 05:06 PM and credited to a/c no. XXXXX00019 (UPI Ref no 170632692557)"
 * - "Dear Customer, Account XXXX123 is credited with INR 3000 on 20-10-2025 08:15:26 from 7025784485@upi. UPI Ref. no. 529807237409"
 *
 * Common senders: AD-KGBANK-S, BX-KGBANK-S
 * Currency: INR (Indian Rupee)
 */
export class KeralaGraminBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Kerala Gramin Bank';
  }

  getCurrency(): string {
    return 'INR';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('KGBANK') ||
      normalizedSender.includes('KERALA GRAMIN') ||
      normalizedSender.includes('KERALAGR');
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "debited for Rs.160.00" or "credited with INR 3000"
    const debitCreditPattern = /(?:debited for|credited with)\s+(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const match = message.match(debitCreditPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Debited = expense
    if (lowerMessage.includes('debited for') ||
      lowerMessage.includes('is debited')) {
      return TransactionType.EXPENSE;
    }

    // Credited = income
    if (lowerMessage.includes('credited with') ||
      lowerMessage.includes('is credited')) {
      return TransactionType.INCOME;
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: UPI debit - "credited to a/c no. XXXXX00019 (UPI Ref"
    // This is money sent via UPI
    if (message.toLowerCase().includes('debited') &&
      message.toLowerCase().includes('credited to')) {
      return 'UPI Transfer';
    }

    // Pattern 2: UPI credit - "from 7025784485@upi" or "from merchant@paytm"
    const upiFromPattern = /from\s+([^.\s]+@[a-z]+)/i;
    const match = message.match(upiFromPattern);
    if (match) {
      const upiId = match[1].trim();
      // If it's a phone number@provider, return generic UPI Payment
      const namePart = upiId.split('@')[0];
      if (/^\d+$/.test(namePart)) {
        return 'UPI Payment';
      }
      // Otherwise extract the name part before @
      if (namePart.length > 0) {
        return this.cleanMerchantName(namePart);
      }
      return 'UPI Payment';
    }

    return null;
  }

  extractAccountLast4(message: string): string | null {
    const fromSuper = super.extractAccountLast4(message);
    if (fromSuper !== null && fromSuper !== undefined) {
      return fromSuper;
    }

    // Pattern: "Your a/c no. XXXX12345" or "Account XXXX123"
    const accountPattern = /(?:a\/c no\.|Account)\s+([X\d]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: "UPI Ref no 170632692557" or "UPI Ref. no. 529807237409"
    const upiRefPattern = /UPI Ref\.?\s*no\.?\s*(\d+)/i;
    const match = message.match(upiRefPattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (lowerMessage.includes('otp') ||
      lowerMessage.includes('password')) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'debited for',
      'is debited',
      'credited with',
      'is credited',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export default new KeralaGraminBankParser();
