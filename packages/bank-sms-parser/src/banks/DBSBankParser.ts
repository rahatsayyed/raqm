import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for DBS Bank (Development Bank of Singapore) SMS messages
 */
export class DBSBankParser extends BankParser {

  getBankName(): string {
    return 'DBS Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('DBSBNK') ||
      normalizedSender.includes('DBS') ||
      normalizedSender === 'DBSBANK' ||
      // DLT patterns
      /^[A-Z]{2}-DBSBNK-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-DBS-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-DBSBANK-[ST]$/.test(normalizedSender);
  }

  extractAmount(message: string): number | null {
    // Pattern: "debited with INR 11" or "credited with INR 100"
    const patterns = [
      /(?:debited|credited)\s+with\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
      /INR\s*([0-9,]+(?:\.\d{2})?)\s+(?:debited|credited)/i,
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

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) {
      return superResult;
    }

    // Pattern: "account no ********1234" or "a/c ****1234"
    const patterns = [
      /account\s+no\s+\*+(\d{4})/i,
      /a\/c\s+\*+(\d{4})/i,
      /account\s+\*+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Current Balance is INR37888.45" or "Balance: INR 1000"
    const patterns = [
      /Current\s+Balance\s+is\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
      /Balance[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/i,
      /Avl\s+Bal[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }

    return super.extractBalance(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }
}

export default new DBSBankParser();
