import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Greater Bank SMS messages.
 *
 * Supported formats:
 * - Debit alert: "Your Account XXXX<last4> had a DEBIT transaction of RS. <amount> on <date> at <time>.Available balance is Rs. <balance>: GREATER BANK"
 * - UPI/IMPS transfer: "Your a/c no. XXXXXXXX<last4> is debited for Rs.<amount> on <date> and credited to a/c no. XXXXXXXX<last4> (UPI Ref no <ref>) If Not You? Call ... Greater Bank"
 */
export class GreaterBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Greater Bank';
  }

  canHandle(sender: string): boolean {
    const upper = sender.toUpperCase();
    return (
      upper.includes('GRTRBN') ||
      upper.includes('GREATRBN') ||
      upper.includes('GREATERBNK') ||
      upper.includes('GREATERBANK') ||
      upper.includes('GREATER')
    );
  }

  extractAmount(message: string): number | null {
    // Format 1: "RS. 100.00" or "RS.100.00"
    const rsUpperPattern = /RS\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(rsUpperPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return super.extractAmount(message);
  }

  extractAccountLast4(message: string): string | null {
    // "Account XXXX5207"
    const accountPattern = /Account\s+[X*]+(\d{4})/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) {
      return accountMatch[1];
    }

    // "a/c no. XXXXXXXX5207"
    const acNoPattern = /a\/c\s+no\.?\s+[X*]+(\d{4})/i;
    const acNoMatch = message.match(acNoPattern);
    if (acNoMatch) {
      return acNoMatch[1];
    }

    return super.extractAccountLast4(message);
  }

  extractBalance(message: string): number | null {
    // "Available balance is Rs. 1127.55"
    const balPattern = /[Aa]vailable\s+balance\s+is\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(balPattern);
    if (match) {
      const balStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // "UPI Ref no 232135417634"
    const upiRefPattern = /UPI\s+Ref\s+no\s+(\d+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    return super.extractReference(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lower = message.toLowerCase();

    // UPI transfer to another account
    if (lower.includes('upi ref')) {
      return 'Bank Transfer';
    }

    // Generic debit alert with no destination info
    if (lower.includes('debit transaction')) {
      return 'Debit Transaction';
    }

    return super.extractMerchant(message, sender);
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('debit transaction') || lower.includes('credit transaction')) return true;
    return super.isTransactionMessage(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('debit transaction') || lower.includes('is debited')) {
      return TransactionType.EXPENSE;
    }
    if (lower.includes('credit transaction') || lower.includes('is credited')) {
      return TransactionType.INCOME;
    }
    return super.extractTransactionType(message);
  }
}

export default new GreaterBankParser();
