import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for India Post Payments Bank (IPPB) SMS messages
 */
export class IPPBParser extends BankParser {

  getBankName(): string {
    return 'India Post Payments Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();

    // Pattern: XX-IPBMSG-S or XX-IPBMSG-T where XX is any two letters
    return /^[A-Z]{2}-IPBMSG-[ST]$/.test(normalizedSender);
  }

  protected extractAmount(message: string): number | null {
    // Pattern: Rs.1.00 or Rs. 1.00
    const amountPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const match = message.match(amountPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractAmount(message);
  }

  protected extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null) return baseResult;

    // Pattern 1: A/C X1234 or a/c X1234
    const accountPattern = /[Aa]\/[Cc]\s+([X\d]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Pattern: Avl Bal Rs.436.91
    const balancePattern = /Avl\s+Bal\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractBalance(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Pattern 1: "for UPI to john@superyes" (Debit)
    if (lowerMessage.includes('debit')) {
      const toPattern = /to\s+([^\s]+(?:@[^\s]+)?)/i;
      const match = message.match(toPattern);
      if (match) {
        const merchant = match[1].trim();
        // Clean up UPI ID if needed
        if (merchant.includes('@')) {
          const name = merchant.substring(0, merchant.indexOf('@'));
          return this.cleanMerchantName(name);
        } else {
          return this.cleanMerchantName(merchant);
        }
      }

      // Fallback: "for UPI" without specific merchant
      if (lowerMessage.includes('for upi')) {
        return 'UPI Payment';
      }
    }

    // Pattern 2: "from john doe thru IPPB" (Credit)
    if (lowerMessage.includes('received a payment')) {
      const fromPattern = /from\s+(.+?)\s+thru/i;
      const match = message.match(fromPattern);
      if (match) {
        const senderName = match[1].trim();
        return this.cleanMerchantName(senderName);
      }
    }

    return super.extractMerchant(message, sender);
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: Ref 560002638161
    const refPattern = /Ref\s+(\d+)/i;
    const refMatch = message.match(refPattern);
    if (refMatch) {
      return refMatch[1];
    }

    // Pattern 2: Info: UPI/CREDIT/523498793035
    const infoPattern = /Info:\s*UPI\/[^/]+\/(\d+)/i;
    const infoMatch = message.match(infoPattern);
    if (infoMatch) {
      return infoMatch[1];
    }

    return super.extractReference(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('received a payment')) return TransactionType.INCOME;
    if (lowerMessage.includes('credit') && lowerMessage.includes('info: upi/credit')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for IPPB-specific transaction keywords
    if (
      lowerMessage.includes('debit rs') ||
      lowerMessage.includes('received a payment') ||
      (lowerMessage.includes('info: upi') && lowerMessage.includes('credit'))
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new IPPBParser();
