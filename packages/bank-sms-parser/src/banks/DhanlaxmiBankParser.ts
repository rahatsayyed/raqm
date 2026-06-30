import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Dhanlaxmi Bank SMS messages
 *
 * Supported formats:
 * - UPI debits: "INR 20.00 is debited from A/c XXXX1234 on 28-NOV-2025 - "UPI TXN: ..."
 * - UPI credits: "INR 10.00 is credited to A/c XXXX1234 on 24-APR-2025 - "UPI TXN: ..."
 * - Internal transfers: "Your a/c no. XXXXXXXX1234 is credited for Rs.10.00 on 24-04-25..."
 *
 * Sender patterns: TL-DHANBK-S, VM-DHANBK, etc.
 */
export class DhanlaxmiBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Dhanlaxmi Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('DHANBK') ||
      normalizedSender.includes('DHANLAXMI') ||
      /^[A-Z]{2}-DHANBK-?[A-Z]?$/.test(normalizedSender) ||
      /^[A-Z]{2}-DHANBK$/.test(normalizedSender)
    );
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "INR 20.00 is debited" or "INR 10.00 is credited"
    const inrPattern = /INR\s+([0-9,]+(?:\.\d{2})?)\s+is\s+(?:debited|credited)/i;
    const inrMatch = message.match(inrPattern);
    if (inrMatch) {
      const amount = parseFloat(inrMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 2: "credited for Rs.10.00" or "debited for Rs.10.00"
    const rsPattern = /(?:credited|debited)\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const rsMatch = message.match(rsPattern);
    if (rsMatch) {
      const amount = parseFloat(rsMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('debited from')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited to')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited for')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) {
      return parentResult;
    }

    // Pattern 1: "A/c XXXX1234" or "A/c XX1234"
    const acPattern = /A\/c\s+([X\d]+)/i;
    const acMatch = message.match(acPattern);
    if (acMatch) {
      return this.extractLast4Digits(acMatch[1]);
    }

    // Pattern 2: "a/c no. XXXXXXXX1234"
    const acNoPattern = /a\/c\s+no\.\s*([X\d]+)/i;
    const acNoMatch = message.match(acNoPattern);
    if (acNoMatch) {
      return this.extractLast4Digits(acNoMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Aval Bal is INR 26,578.49" or "Aval Bal is INR  26,578.49"
    const balancePattern = /Aval\s+Bal\s+is\s+INR\s+([0-9,]+(?:\.\d{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const amount = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }

    return super.extractBalance(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // For UPI transactions, try to extract from the transaction description
    // Pattern: "UPI TXN: /675325120952-MR /Payment from PhonePe/..."
    if (message.toLowerCase().includes('upi txn')) {
      // Try to extract payment app or merchant from description
      // Stop at /, ", or end of quoted section
      const paymentFromPattern = /Payment\s+from\s+([^/"]+)/i;
      const paymentFromMatch = message.match(paymentFromPattern);
      if (paymentFromMatch) {
        const merchant = this.cleanMerchantName(paymentFromMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }

      // Try to extract "payment on <merchant>" pattern
      // Stop at whitespace, /, ", or using
      const paymentOnPattern = /payment\s+on\s+(\w+)/i;
      const paymentOnMatch = message.match(paymentOnPattern);
      if (paymentOnMatch) {
        const merchant = this.cleanMerchantName(paymentOnMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }

      return 'UPI Payment';
    }

    // For internal transfers
    if (
      message.toLowerCase().includes('debited from a/c') &&
      message.toLowerCase().includes('credited')
    ) {
      return 'Internal Transfer';
    }

    return super.extractMerchant(message, sender);
  }

  extractReference(message: string): string | null {
    // Pattern 1: UPI Ref no in transaction description
    const upiRefPattern = /UPI\s+Ref\s+no\s+(\d+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Pattern 2: Reference number from UPI TXN pattern - e.g., "/675325120952-MR"
    const txnRefPattern = /UPI\s+TXN:\s*\/(\d+)/i;
    const txnRefMatch = message.match(txnRefPattern);
    if (txnRefMatch) {
      return txnRefMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Dhanlaxmi Bank specific transaction keywords
    const dhanlaxmiKeywords = [
      'is debited from',
      'is credited to',
      'credited for',
      'debited from a/c',
    ];

    if (dhanlaxmiKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new DhanlaxmiBankParser();
