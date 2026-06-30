import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Juspay/Amazon Pay wallet transactions.
 * Handles messages from XX-JUSPAY-X, APAY, and similar senders.
 */
export class JuspayParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Amazon Pay';
  }

  getCurrency(): string {
    return 'INR';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('JUSPAY') ||
      normalizedSender.includes('APAY') ||
      normalizedSender === 'AMAZON PAY';
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "Your Apay Wallet balance is debited for INR Xxx"
    const debitPattern = /debited\s+for\s+INR\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const val = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 2: "Payment of Rs xxx using Apay Balance"
    const paymentPattern = /Payment\s+of\s+Rs\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const paymentMatch = message.match(paymentPattern);
    if (paymentMatch) {
      const val = parseFloat(paymentMatch[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 3: "Rs xxx" generic pattern
    const genericPattern = /Rs\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const genericMatch = message.match(genericPattern);
    if (genericMatch) {
      const val = parseFloat(genericMatch[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 4: "INR xxx" generic pattern
    const inrPattern = /INR\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const inrMatch = message.match(inrPattern);
    if (inrMatch) {
      const val = parseFloat(inrMatch[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Pattern 1: "successful at merchant" - improved to capture multi-word merchants
    // Captures everything between "successful at" and the period or "Updated Balance"
    const merchantPattern = /successful\s+at\s+(.+?)(?:\.\s*Updated|\s*\.\s*Updated|\.(?:\s|$))/i;
    const merchantMatch = message.match(merchantPattern);
    if (merchantMatch) {
      return merchantMatch[1].trim();
    }

    // Pattern 2: Common merchant indicators
    if (lowerMessage.includes('amazon')) return 'Amazon';
    if (lowerMessage.includes('flipkart')) return 'Flipkart';
    if (lowerMessage.includes('swiggy')) return 'Swiggy';
    if (lowerMessage.includes('zomato')) return 'Zomato';
    if (lowerMessage.includes('ola')) return 'Ola';
    if (lowerMessage.includes('uber')) return 'Uber';
    if (lowerMessage.includes('zepto')) return 'Zepto';
    if (lowerMessage.includes('blinkit')) return 'Blinkit';
    if (lowerMessage.includes('apay wallet')) return 'Amazon Pay Transaction';
    if (lowerMessage.includes('wallet')) return 'Amazon Pay Transaction';

    return super.extractMerchant(message, sender) ?? 'Amazon Pay';
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('payment')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited')) return TransactionType.CREDIT;
    if (lowerMessage.includes('refunded')) return TransactionType.CREDIT;
    if (lowerMessage.includes('received')) return TransactionType.CREDIT;

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: "Transaction Reference Number is 123456789012"
    const refPattern = /Transaction\s+Reference\s+Number\s+is\s+(\d{12})/i;
    const refMatch = message.match(refPattern);
    if (refMatch) {
      return refMatch[1];
    }

    // Pattern 2: "Reference Number: 123456789012"
    const altRefPattern = /Reference\s+(?:Number|No)[:\s]+(\d{12})/i;
    const altRefMatch = message.match(altRefPattern);
    if (altRefMatch) {
      return altRefMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for transaction keywords
    const transactionKeywords = [
      'debited for',
      'payment of rs',
      'using apay balance',
      'transaction reference number',
      'updated balance is',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword)) ||
      super.isTransactionMessage(message);
  }
}

export default new JuspayParser();
