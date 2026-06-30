import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Jio Payments Bank (JPB/JPBL) SMS messages
 */
export class JioPaymentsBankParser extends BankParser {

  getBankName(): string {
    return 'Jio Payments Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('JIOPBS');
  }

  extractAmount(message: string): number | null {
    // Pattern 1: credited with Rs.1670.00
    const creditPattern = /credited\s+with\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: Rs. 1170.00 Sent from
    const sentPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+Sent\s+from/i;
    const sentMatch = message.match(sentPattern);
    if (sentMatch) {
      const amount = parseFloat(sentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 3: debited with Rs. 1750.00
    const debitPattern = /debited\s+with\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: UPI/CR/700003371002/AMAN KU
    // Pattern 2: UPI/DR/520300007125/AMAN KUM
    const upiPattern = /UPI\/(?:CR|DR)\/[\d]+\/([^.\n]+?)(?:\s*\.|$)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      const merchant = this.cleanMerchantName(upiMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // If no specific merchant found, check transaction type
    if (message.toLowerCase().includes('upi/cr')) return 'UPI Credit';
    if (message.toLowerCase().includes('upi/dr')) return 'UPI Payment';
    if (message.toLowerCase().includes('sent from')) return 'Money Transfer';

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: JPB A/c x4288
    const jpbPattern = /JPB\s+A\/c\s+([x\d]+)/i;
    const jpbMatch = message.match(jpbPattern);
    if (jpbMatch) {
      return this.extractLast4Digits(jpbMatch[1]);
    }

    // Pattern 2: from x4288
    const fromPattern = /from\s+([x\d]+)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      return this.extractLast4Digits(fromMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: Avl. Bal: Rs. 9095.5
    const balancePattern = /Avl\.?\s*Bal:\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(balance)) return balance;
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern: UPI/CR/700003371002 or UPI/DR/520300007125
    const upiRefPattern = /UPI\/(?:CR|DR)\/(\d+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('upi/cr')) return TransactionType.INCOME;
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('upi/dr')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('sent from')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for Jio Payments Bank specific transaction keywords
    if (
      lowerMessage.includes('jpb a/c') ||
      lowerMessage.includes('upi/cr') ||
      lowerMessage.includes('upi/dr') ||
      lowerMessage.includes('sent from')
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new JioPaymentsBankParser();
