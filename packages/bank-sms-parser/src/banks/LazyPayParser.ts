import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for LazyPay wallet transactions.
 * Handles messages from BP-LZYPAY-S, JM-LZYPAY-S, JD-LZYPAY-S and similar senders.
 * LazyPay is a Buy Now Pay Later (BNPL) wallet service similar to Amazon Pay/Juspay.
 * All transactions are treated as CREDIT type since they're wallet-based credit transactions.
 */
export class LazyPayParser extends BankParser {

  getBankName(): string {
    return 'LazyPay';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('LZYPAY') ||
      normalizedSender.includes('LAZYPAY');
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "for txn TXN512924131 on [MERCHANT] was successful"
    const onMerchantPattern = /on\s+([^.]+?)\s+was\s+successful/i;
    const onMerchantMatch = message.match(onMerchantPattern);
    if (onMerchantMatch) {
      const rawMerchant = onMerchantMatch[1].trim();
      // Clean up common merchant names
      let cleanedMerchant: string;
      if (rawMerchant.toLowerCase().includes('zepto marketplace')) {
        cleanedMerchant = 'Zepto';
      } else if (rawMerchant.toLowerCase().includes('innovative retail concepts')) {
        cleanedMerchant = 'BigBasket';
      } else if (rawMerchant.toLowerCase().includes('swiggy')) {
        cleanedMerchant = 'Swiggy';
      } else if (rawMerchant.toLowerCase().includes('zomato')) {
        cleanedMerchant = 'Zomato';
      } else {
        // Remove common suffixes like "Private Limited", "Pvt Ltd", etc.
        cleanedMerchant = rawMerchant
          .replace(/\s*(Private|Pvt\.?|Ltd\.?|Limited|Inc\.?|LLC|LLP).*$/i, '')
          .replace(/\s*\d+$/, '') // Remove trailing numbers
          .trim();
      }
      if (cleanedMerchant.length > 0) {
        return cleanedMerchant;
      }
    }

    // Pattern 2: Repayment messages
    if (message.toLowerCase().includes('against your lazypay statement')) {
      return 'LazyPay Repayment';
    }

    // Default to LazyPay if no specific merchant found
    return super.extractMerchant(message, sender) ?? 'LazyPay';
  }

  extractAmount(message: string): number | null {
    // Pattern: "Rs. 235.76" or "Rs 235.76"
    const amountPatterns = [
      /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }

    return super.extractAmount(message);
  }

  extractReference(message: string): string | null {
    // Extract transaction ID like "TXN512924131"
    const txnPattern = /txn\s+([A-Z0-9]+)/i;
    const txnMatch = message.match(txnPattern);
    if (txnMatch) {
      return txnMatch[1].trim();
    }

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType {
    // LazyPay is a credit service - all transactions are credit-based
    // Similar to how JuspayParser handles Amazon Pay
    return TransactionType.CREDIT;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip failed payment messages
    if (
      lowerMessage.includes('could not be processed') ||
      lowerMessage.includes('due to a failure') ||
      lowerMessage.includes('payment failed') ||
      lowerMessage.includes('transaction failed') ||
      lowerMessage.includes('unsuccessful')
    ) {
      return false;
    }

    // Skip promotional messages
    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('get cashback') ||
      lowerMessage.includes('explore more')
    ) {
      // But allow if it's a payment confirmation
      if (
        !lowerMessage.includes('payment of') &&
        !lowerMessage.includes('was successful')
      ) {
        return false;
      }
    }

    // Transaction indicators for LazyPay
    const transactionKeywords = [
      'payment of',
      'was successful',
      'against your lazypay statement',
      'thanks for your payment',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export default new LazyPayParser();
