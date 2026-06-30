import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Discover Card - handles USD credit card transactions
 */
export class DiscoverCardParser extends BankParser {

  getBankName(): string {
    return 'Discover Card';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'DISCOVER' ||
      upperSender.includes('DISCOVERCARD') ||
      upperSender === '347268' ||  // DLT sender ID
      /^[A-Z]{2}-DISCOVER-[A-Z]$/.test(upperSender);
  }

  extractAmount(message: string): number | null {
    // Discover patterns: "A transaction of $25.00", "transaction of $5.36"
    const patterns = [
      /transaction of\s+\$([0-9,]+(?:\.[0-9]{2})?)/i,
      /A transaction of\s+\$([0-9,]+(?:\.[0-9]{2})?)/i,
      /\$([0-9,]+(?:\.[0-9]{2})?)\s+at/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) return amount;
        return null;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Credit card transactions are expenses
    if (lowerMessage.includes('discover card alert')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transaction of')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transaction')) return TransactionType.EXPENSE;

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "transaction of $25.00 at WWW.XXX.ORG"
    const atPattern = /at\s+([^\s]+(?:\s+[^\s]*)*?)(?:\s+on|\s+Text|$)/i;
    const atMatch = message.match(atPattern);
    if (atMatch) {
      const merchant = atMatch[1].trim();
      if (merchant.length > 0 && !/\w+\s+\d{1,2},\s+\d{4}/.test(merchant)) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 2: More specific for PAYPAL cases "at PAYPAL *SParkXXX"
    const paypalPattern = /at\s+(PAYPAL\s+\*[^\s]+)/i;
    const paypalMatch = message.match(paypalPattern);
    if (paypalMatch) {
      const merchant = paypalMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractReference(message: string): string | null {
    // Look for dates in the message: "on February 21, 2025" or "on July 20, 2025"
    const datePattern = /on\s+(\w+\s+\d{1,2},\s+\d{4})/i;
    const dateMatch = message.match(datePattern);
    if (dateMatch) {
      return dateMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip STOP messages
    if (lowerMessage.includes('text stop to end')) {
      // But still process if it has transaction info
      if (!lowerMessage.includes('transaction of')) {
        return false;
      }
    }

    // Discover specific transaction keywords
    const discoverTransactionKeywords = [
      'discover card alert:',
      'transaction of',
      'no action needed',
      'see it at https://app.discover.com',
    ];

    if (discoverTransactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new DiscoverCardParser();
