import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Citi Bank (USA) - handles USD credit card transactions
 */
export class CitiBankParser extends BankParser {

  getBankName(): string {
    return 'Citi Bank';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'CITI' ||
      upperSender.includes('CITIBANK') ||
      upperSender === '692484' ||
      /^[A-Z]{2}-CITI-[A-Z]$/.test(upperSender);
  }

  protected extractAmount(message: string): number | null {
    // Citi patterns: "A $3.01 transaction", "$506.39 transaction"
    const patterns = [
      /\$([0-9,]+(?:\.[0-9]{2})?)\s+transaction/i,
      /transaction.*?\$([0-9,]+(?:\.[0-9]{2})?)/i,
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+transaction/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('transaction was made')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('card ending')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('was not present')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transaction')) return TransactionType.EXPENSE;

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "transaction was made at BP#1234E"
    const atPattern = /transaction was made at\s+([^.]+?)(?:\s+on|$)/i;
    const atMatch = message.match(atPattern);
    if (atMatch) {
      const merchant = atMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 2: "transaction at WWW Google C"
    const transactionAtPattern = /transaction at\s+([^.]+?)(?:\s+View|\.|$)/i;
    const transactionAtMatch = message.match(transactionAtPattern);
    if (transactionAtMatch) {
      const merchant = transactionAtMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const base = super.extractAccountLast4(message);
    if (base !== null) return base;

    // Pattern: "card ending in 1234"
    const cardPattern = /card ending in\s+(\d{4})/i;
    const match = message.match(cardPattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Look for dates in the message
    const datePattern = /on\s+(card ending|\w+\s+\d{1,2},\s+\d{4})/i;
    const match = message.match(datePattern);
    if (match) {
      if (!match[1].includes('card ending')) {
        return match[1];
      }
    }

    return super.extractReference(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Citi specific transaction keywords
    const citiTransactionKeywords = [
      'citi alert:',
      'transaction was made',
      'card ending',
      'was not present for',
      'view details at citi.com',
    ];

    if (citiTransactionKeywords.some((kw) => lowerMessage.includes(kw))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new CitiBankParser();
