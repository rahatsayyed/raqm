import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Navy Federal Credit Union (NFCU) - handles USD debit card and credit card transactions
 */
export class NavyFederalParser extends BankParser {

  getBankName(): string {
    return 'Navy Federal Credit Union';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'NFCU' ||
      upperSender === 'NAVYFED' ||
      upperSender.includes('NAVY FEDERAL') ||
      upperSender.includes('NAVYFEDERAL') ||
      /^[A-Z]{2}-NFCU-[A-Z]$/.test(upperSender)
    );
  }

  extractAmount(message: string): number | null {
    // NFCU pattern: "Transaction for $3.26 was approved"
    const patterns = [
      /Transaction for \$([0-9,]+(?:\.[0-9]{2})?)\s+was approved/i,
      /Transaction for \$([0-9,]+(?:\.[0-9]{2})?)\s+was declined/i,
      /for \$([0-9,]+(?:\.[0-9]{2})?)\s+was approved/i,
      /for \$([0-9,]+(?:\.[0-9]{2})?)\s+was declined/i,
    ];

    for (const pattern of patterns) {
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

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: "at Google One at 08:19 PM" - captures merchant between first "at" and second "at" (for time)
    const merchantPattern = /on (?:debit|credit) card \d{4} at (.+?)\s+at \d{2}:\d{2}/i;
    const merchantMatch = message.match(merchantPattern);
    if (merchantMatch) {
      return merchantMatch[1].trim();
    }

    // Alternative pattern without time: "at merchant."
    const simpleMerchantPattern = /on (?:debit|credit) card \d{4} at (.+?)(?:\.|$)/i;
    const simpleMatch = message.match(simpleMerchantPattern);
    if (simpleMatch) {
      const merchant = simpleMatch[1].trim();
      // Clean up common trailing text
      return merchant.replace(/Txt STOP.*/g, '').trim();
    }

    return super.extractMerchant(message, sender);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('was approved')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('was declined')) {
      return null; // Don't track declined transactions
    }
    if (lowerMessage.includes('payment received')) {
      return TransactionType.CREDIT;
    }
    if (lowerMessage.includes('deposit')) {
      return TransactionType.CREDIT;
    }
    return null;
  }

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) {
      return superResult;
    }

    // Pattern: "on debit card xxxx" or "on credit card xxxx"
    const patterns = [
      /on debit card (\d{4})/i,
      /on credit card (\d{4})/i,
      /(?:debit|credit) card (\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // NFCU specific transaction keywords
    const nfcuTransactionKeywords = [
      'transaction for',
      'was approved on',
      'was declined on',
    ];

    if (nfcuTransactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      // Exclude declined transactions
      if (lowerMessage.includes('was declined')) {
        return false;
      }
      return true;
    }

    return super.isTransactionMessage(message);
  }

  detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit card')) {
      return true;
    }
    if (lowerMessage.includes('credit card')) {
      return true;
    }
    return super.detectIsCard(message);
  }
}

export default new NavyFederalParser();
