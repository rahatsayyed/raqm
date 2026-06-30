import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for City Union Bank SMS messages
 *
 * Common senders: JK-CUBLTD-S, XX-CUBLTD-T, etc.
 *
 * SMS Formats:
 * - Your a/c no. XXXXXXXXXXXXXXX is debited for Rs.111.00 on 01-09-2025 and credited to a/c no. YYYYYYYYYYYYYYY (UPI Ref no 123456789012)
 * - Your a/c no. XXXXXXXXXXXXXXX is credited for Rs.111.00 on 01-09-2025 and debited from a/c no. YYYYYYYYYYYYYYY (UPI Ref no 123456789012)
 * - Savings No XXXXXXXXXXXXXXX credited with INR 111.00 towards BY NEFT TRF:AMBANI YYYYYYYYYYYYYYY: on 01-SEP-2025. Avl Bal 120.00
 */
export class CityUnionBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'City Union Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('CUBANK') ||
      normalizedSender.includes('CUBLTD') ||
      normalizedSender.includes('CUB');
  }

  extractAmount(message: string): number | null {
    // List of amount patterns for City Union Bank
    const amountPatterns = [
      // "debited for Rs.111.00"
      /debited\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "credited for Rs.111.00"
      /credited\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "credited with INR 111.00"
      /credited\s+with\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = match[1].replace(/,/g, '');
        const parsed = parseFloat(amount);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Check for debit patterns
    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited for')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited from')) return TransactionType.EXPENSE;

    // Check for credit patterns
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited for')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited to')) return TransactionType.INCOME;

    // NEFT/Transfer patterns
    if (lowerMessage.includes('neft trf')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // NEFT Transfer pattern
    if (lowerMessage.includes('neft trf')) {
      // Extract sender name from "BY NEFT TRF:NAME"
      const neftPattern = /BY\s+NEFT\s+TRF:([^:]+)/i;
      const neftMatch = message.match(neftPattern);
      if (neftMatch) {
        const merchant = this.cleanMerchantName(neftMatch[1].trim());
        return `NEFT - ${merchant}`;
      }
      return 'NEFT Transfer';
    }

    // UPI Transaction
    if (/UPI Ref/i.test(message)) {
      // Try to extract the other account details
      const toAccountPattern = /credited\s+to\s+a\/c\s+no\.\s+([A-Z0-9]+)/i;
      const fromAccountPattern = /debited\s+from\s+a\/c\s+no\.\s+([A-Z0-9]+)/i;

      const toAccountMatch = message.match(toAccountPattern);
      if (toAccountMatch) {
        const accountLast4 = toAccountMatch[1].length >= 4
          ? toAccountMatch[1].slice(-4)
          : toAccountMatch[1];
        return `UPI Transfer to A/C XX${accountLast4}`;
      }

      const fromAccountMatch = message.match(fromAccountPattern);
      if (fromAccountMatch) {
        const accountLast4 = fromAccountMatch[1].length >= 4
          ? fromAccountMatch[1].slice(-4)
          : fromAccountMatch[1];
        return `UPI Transfer from A/C XX${accountLast4}`;
      }

      return 'UPI Transfer';
    }

    // Generic transfer
    if (lowerMessage.includes('credited to a/c') || lowerMessage.includes('debited from a/c')) {
      return 'Account Transfer';
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const parent = super.extractAccountLast4(message);
    if (parent !== null && parent !== undefined) return parent;

    // Pattern: "Your a/c no. XXXXXXXXXXXXXXX" or "Savings No XXXXXXXXXXXXXXX"
    const accountPatterns = [
      /Your\s+a\/c\s+no\.\s+([X\d]+)/i,
      /Savings\s+No\s+([X\d]+)/i,
    ];

    for (const pattern of accountPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Avl Bal 120.00"
    const balancePattern = /Avl\s+Bal\s+([0-9,]+(?:\.\d{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balanceStr = balanceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
      return null;
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern: "(UPI Ref no 123456789012)"
    const upiRefPattern = /\(UPI\s+Ref\s+no\s+(\d+)\)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // NEFT transaction ID if present
    const neftRefPattern = /NEFT[:/]\s*([A-Z0-9]+)/i;
    const neftRefMatch = message.match(neftRefPattern);
    if (neftRefMatch) {
      return neftRefMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and non-transaction messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('verification') ||
      lowerMessage.includes('request')
    ) {
      return false;
    }

    // Check for City Union Bank specific transaction patterns
    if (
      lowerMessage.includes('is debited for') ||
      lowerMessage.includes('is credited for') ||
      lowerMessage.includes('credited with') ||
      lowerMessage.includes('neft trf')
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new CityUnionBankParser();
