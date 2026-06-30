import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Old Hickory Credit Union (USA) - handles USD currency transactions
 */
export class OldHickoryParser extends BankParser {

  getBankName(): string {
    return 'Old Hickory Credit Union';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const cleanSender = sender.replace(/[^\d]/g, ''); // Remove non-digits

    // Phone number format: (877) 590-7589 -> 8775907589
    if (cleanSender === '8775907589') {
      return true;
    }

    // Text-based senders
    const upper = sender.toUpperCase();
    if (
      upper === 'OLDHICKORY' ||
      upper === 'OHCU' ||
      upper.includes('HICKORY') ||
      upper.includes('OLD HICKORY')
    ) {
      return true;
    }

    // DLT patterns for US credit unions
    if (/^[A-Z]{2}-HICKORY-[A-Z]$/.test(sender.toUpperCase())) {
      return true;
    }

    return false;
  }

  protected extractAmount(message: string): number | null {
    // Old Hickory patterns: "transaction for $27.00"
    const patterns = [
      /\$([0-9,]+(?:\.[0-9]{2})?)/,
      /transaction for\s+\$([0-9,]+(?:\.[0-9]{2})?)/i,
      /posted.*?\$([0-9,]+(?:\.[0-9]{2})?)/i,
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

    // Posted transactions are typically expenses (debit transactions)
    if (lowerMessage.includes('transaction') && lowerMessage.includes('posted')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('has posted')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('transaction for')) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // For credit union alerts, the merchant/account info is usually not specified.
    // The message is about which account was affected, not where money was spent.

    // Extract account name from "posted to ACCOUNT NAME"
    const accountPattern = /posted to\s+([^(]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      const accountName = match[1].trim();
      if (accountName.length > 0) {
        return `Account: ${this.cleanMerchantName(accountName)}`;
      }
    }

    // If no specific merchant info, this is likely an account alert
    return 'Transaction Alert';
  }

  protected extractAccountLast4(message: string): string | null {
    const base = super.extractAccountLast4(message);
    if (base !== null) {
      return base;
    }

    // Pattern: "ACCOUNT NAME (part of ACCOUNT#)" - extract account identifier
    const accountPattern = /\(part of\s+([^)]+)\)/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Look for threshold values as reference
    const thresholdPattern = /above the\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+value you set/i;
    const match = message.match(thresholdPattern);
    if (match) {
      return `Alert threshold: $${match[1]}`;
    }

    return super.extractReference(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Old Hickory specific transaction keywords
    const hickoryTransactionKeywords = [
      'transaction',
      'has posted',
      'posted to',
      'above the',
      'value you set',
      'account name',
    ];

    if (hickoryTransactionKeywords.some((kw) => lowerMessage.includes(kw))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new OldHickoryParser();
