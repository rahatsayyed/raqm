import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * South Indian Bank specific parser.
 * Handles South Indian Bank's unique message formats including:
 * - UPI debit/credit transactions
 * - Balance updates
 * - Card transactions
 */
export class SouthIndianBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'South Indian Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    // Common South Indian Bank sender IDs
    const sibSenders = new Set([
      'SIBSMS',
      'AD-SIBSMS',
      'CP-SIBSMS',
      'SIBSMS-S',
      'AD-SIBSMS-S',
      'CP-SIBSMS-S',
      'SOUTHINDIANBANK',
      'SIBBANK',
    ]);

    // Direct match
    if (sibSenders.has(upperSender)) return true;

    // Check for patterns with suffixes
    if (upperSender.includes('SIBSMS')) return true;
    if (upperSender.includes('SIBBANK')) return true;

    // DLT patterns
    return (
      upperSender.startsWith('AD-SIB') ||
      upperSender.startsWith('CP-SIB') ||
      upperSender.startsWith('VM-SIB')
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Check if it's a transaction message
    if (!this.isTransactionMessage(smsBody)) {
      return null;
    }

    // Extract amount
    const amount = this.extractAmount(smsBody);
    if (amount === null) return null;

    // Extract transaction type
    const transactionType = this.extractTransactionType(smsBody);
    if (transactionType === null) return null;

    // Extract other details
    const merchant = this.extractMerchant(smsBody, sender) ?? 'Unknown';
    const reference = this.extractReference(smsBody);
    const accountLast4 = this.extractAccountLast4(smsBody);
    const balance = this.extractBalance(smsBody);

    return {
      amount,
      type: transactionType,
      merchant,
      reference,
      accountLast4,
      balance,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
    };
  }

  extractAmount(message: string): number | null {
    // Pattern for "Rs.42225.06" or "Rs.42225.06," (with comma after)
    const patterns = [
      /(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // For IMPS transactions, extract from "Info: IMPS/xxx/reference/MERCHANT" format
    if (message.toLowerCase().includes('imps') && message.toLowerCase().includes('info:')) {
      // Pattern for "Info: IMPS/FDRL/528005821348/EPIFI ACCOUN." - capture until period or next keyword
      const impsPattern = /Info:\s*IMPS\/[^/]+\/[^/]+\/\s*([A-Za-z\s]+?)(?:\.|Final|Bal|balance)/i;
      const impsMatch = message.match(impsPattern);
      if (impsMatch) {
        const merchant = impsMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Fallback: capture everything up to period
      const impsPattern2 = /Info:\s*IMPS\/[^/]+\/[^/]+\/([^.]+)/i;
      const impsMatch2 = message.match(impsPattern2);
      if (impsMatch2) {
        const merchant = impsMatch2[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // For UPI transactions, try to extract UPI ID or merchant name
    if (message.toLowerCase().includes('upi')) {
      // Pattern for "Info:UPI/IPOS/number/MERCHANT NAME on" format
      const infoPattern = /Info:\s*UPI\/[^/]+\/\d{12}\/\s*([^/]+?)\s+on/i;
      const infoMatch = message.match(infoPattern);
      if (infoMatch) {
        const merchant = infoMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Check for "to" pattern (e.g., "to merchant@upi")
      // Only match if it appears early in the message to avoid matching footer phone numbers
      const messagePrefix = message.substring(0, 200); // Only look in first 200 chars
      const toPattern = /to\s+([^,\s]+@[^\s,]+)/i;
      const toMatch = messagePrefix.match(toPattern);
      if (toMatch) {
        const merchant = toMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Check for "from" pattern for incoming transfers
      if (message.toLowerCase().includes('credit')) {
        const fromPattern = /from\s+([^,\s]+@[^\s,]+)/i;
        const fromMatch = messagePrefix.match(fromPattern);
        if (fromMatch) {
          const merchant = fromMatch[1].trim();
          if (merchant.length > 0) {
            return this.cleanMerchantName(merchant);
          }
        }
        // Default to UPI Credit if no merchant found
        return 'UPI Credit';
      }

      // Default to UPI Transaction for UPI messages (if not credit)
      return 'UPI Transaction';
    }

    // For debit/credit transactions - merchant between amount and balance
    // Only apply this if NOT a UPI transaction (already handled above)
    if (
      (message.toLowerCase().includes('debit') || message.toLowerCase().includes('credit')) &&
      !message.toLowerCase().includes('upi')
    ) {
      // Pattern for "DEBIT:Rs.983.75 MERCHANT NAME Bal:Rs.79184.67"
      const debitCreditPattern =
        /(?:DEBIT|CREDIT)[:\s]*Rs\.?\s*[0-9,]+(?:\.\d{2})?\s+([A-Z\s]+?)\s+(?:Bal|Available)/i;
      const debitCreditMatch = message.match(debitCreditPattern);
      if (debitCreditMatch) {
        const merchant = debitCreditMatch[1].trim();
        if (merchant.length > 0 && merchant.length > 2) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // For ATM withdrawals
    if (
      message.toLowerCase().includes('atm') ||
      message.toLowerCase().includes('withdrawn')
    ) {
      return 'ATM';
    }

    // For card transactions
    if (message.toLowerCase().includes('card')) {
      // Try to extract merchant after "at"
      const atPattern = /at\s+([^,\n]+?)(?:\s+on|\s*,|$)/i;
      const atMatch = message.match(atPattern);
      if (atMatch) {
        const merchant = atMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transfer to')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credit')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('transfer from')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback')) return TransactionType.INCOME;

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern for IMPS reference in "Info: IMPS/xxx/reference/merchant" format
    // Handle variations with or without space after the last slash
    if (message.toLowerCase().includes('imps') && message.toLowerCase().includes('info:')) {
      // More flexible pattern that handles variations
      const impsRefPattern = /Info:\s*IMPS\/[^/]+\/(\d+)(?:\/\s*|\s+)/i;
      const impsRefMatch = message.match(impsRefPattern);
      if (impsRefMatch) {
        const ref = impsRefMatch[1].trim();
        if (ref.length > 0) return ref;
      }

      // Fallback pattern: capture reference number between second and third slash
      const impsRefPattern2 = /Info:\s*IMPS\/[^/]+\/([^/]+)\//i;
      const impsRefMatch2 = message.match(impsRefPattern2);
      if (impsRefMatch2) {
        const ref = impsRefMatch2[1].trim();
        if (ref.length > 0 && ref.split('').every(c => c >= '0' && c <= '9')) {
          return ref;
        }
      }
    }

    // Pattern for UPI reference in "Info: UPI/provider/rrn/..." format.
    const upiInfoPattern = /Info:\s*UPI\/[^/]+\/(\d{12})(?:\/|\s|$)/i;
    const upiInfoMatch = message.match(upiInfoPattern);
    if (upiInfoMatch) {
      return upiInfoMatch[1].trim();
    }

    // Pattern for RRN (e.g., "RRN:523273398527" or "RRN:567304295699.")
    const rrnPattern = /RRN[:\s]*(\d{12})/i;
    const rrnMatch = message.match(rrnPattern);
    if (rrnMatch) {
      return rrnMatch[1].trim();
    }

    // Pattern for reference number
    const refPattern = /Ref(?:erence)?[:\s]*([A-Z0-9]+)/i;
    const refMatch = message.match(refPattern);
    if (refMatch) {
      return refMatch[1].trim();
    }

    return super.extractReference(message);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) return parentResult;

    // Pattern for "A/c X1234" or "A/c XX1234" or "A/c XXX1234"
    const patterns = [
      /A\/c\s+[X*]*(\d{4})/i,
      /Account\s+[X*]*(\d{4})/i,
      /from\s+[X*]*(\d{4})/i,
      /to\s+[X*]*(\d{4})/i,
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
    // Pattern for "Bal:Rs.1234.17" or "Balance:Rs.1234.17" or "Final balance is Rs.1234.17"
    const patterns = [
      /Final\s+balance\s+is\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Bal(?:ance)?[:\s]*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Available\s+Bal(?:ance)?[:\s]*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Avl\s+Bal[:\s]*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return super.extractBalance(message);
  }

  /**
   * Extract date and time from message.
   * Format: "20-08-25 12:13:23" (YY-MM-DD HH:MM:SS)
   * Returns a timestamp in milliseconds, or null if not found.
   */
  private extractDateTime(message: string): number | null {
    // Pattern for "20-08-25 12:13:23" format
    const dateTimePattern = /(\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/;
    const match = message.match(dateTimePattern);
    if (match) {
      const dateStr = match[1];
      const timeStr = match[2];

      try {
        // Parse YY-MM-DD format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = 2000 + parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);

          // Parse HH:MM:SS format
          const timeParts = timeStr.split(':');
          if (timeParts.length === 3) {
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);
            const second = parseInt(timeParts[2], 10);

            return new Date(year, month - 1, day, hour, minute, second).getTime();
          }
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code') ||
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount')
    ) {
      return false;
    }

    // Skip UPI auto-pay scheduled reminders
    if (lowerMessage.includes('upi auto pay') && lowerMessage.includes('is scheduled on')) {
      return false;
    }

    // Check for transaction keywords
    const transactionKeywords = [
      'debit', 'credit', 'withdrawn', 'deposited',
      'spent', 'received', 'transferred', 'paid',
      'purchase', 'refund', 'cashback', 'upi',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export default new SouthIndianBankParser();
