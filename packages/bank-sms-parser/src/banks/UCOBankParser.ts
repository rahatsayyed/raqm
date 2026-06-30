import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for UCO Bank SMS messages
 *
 * Supported formats:
 * - Debit: "A/c XX1111 Debited with Rs.2000.00 on 21-09-2025 by UCO-UPI.Avl Bal Rs.11111.11. Report Dispute https://spgrs.ucoonline.in/Home_Page.jsp"
 * - Credit: "A/c XX1111 Credited with Rs.2,000.00 on 21-09-2025 by UCO-UPI.Avl Bal Rs.11111.11. Report Dispute https://spgrs.ucoonline.in/Home_Page.jsp -UCO Bank"
 *
 * Sender patterns: XX-UCOBNK-S (where XX can be any two letters)
 */
export class UCOBankParser extends BankParser {

  getBankName(): string {
    return 'UCO Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('UCOBNK') ||
      normalizedSender.includes('UCOBANK') ||
      normalizedSender.includes('UCO BANK') ||
      // DLT patterns with any two-letter prefix followed by -UCOBNK-S
      /^[A-Z]{2}-UCOBNK-[ST]$/.test(normalizedSender) ||
      // Other variations
      /^[A-Z]{2}-UCOBNK$/.test(normalizedSender) ||
      /^[A-Z]{2}-UCOBANK$/.test(normalizedSender)
    );
  }

  protected extractAmount(message: string): number | null {
    // UCO Bank format: "Rs.2000.00" or "Rs.2,000.00"
    const amountPattern = /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(amountPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // UCO Bank format: "by UCO-UPI" or "by <merchant>"
    const merchantPattern = /by\s+([^.]+?)(?:\.Avl|$)/i;
    const match = message.match(merchantPattern);
    if (match) {
      const merchant = match[1].trim();

      // Handle UCO-UPI transactions
      if (merchant.toLowerCase().includes('uco-upi')) {
        return 'UPI Transfer';
      }

      // Clean up common suffixes
      return this.cleanMerchantName(merchant);
    }

    // Fall back to base class extraction
    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null) return baseResult;

    // UCO Bank format: "A/c XX1111"
    const accountPatterns = [
      /A\/c\s+([X*\d]+)/i,
      /Account\s+([X*\d]+)/i,
      /Acc\s+([X*\d]+)/i,
    ];

    for (const pattern of accountPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // UCO Bank format: "Avl Bal Rs.11111.11"
    const balancePatterns = [
      /Avl\s+Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Available\s+Balance\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Balance[:.]?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractBalance(message);
  }

  protected extractReference(message: string): string | null {
    // Look for any transaction reference patterns specific to UCO Bank
    const refPatterns = [
      /ref[:#]?\s*([\w]+)/i,
      /txn[:#]?\s*([\w]+)/i,
      /transaction\s+id[:#]?\s*([\w]+)/i,
    ];

    for (const pattern of refPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return super.extractReference(message);
  }
}

export default new UCOBankParser();
