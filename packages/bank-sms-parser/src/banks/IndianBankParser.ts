import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType, MandateInfo } from '../core/types';

/**
 * Parser for Indian Bank
 *
 * Common sender patterns:
 * - Service Implicit (transactions): XX-INDBNK-S (e.g., AD-INDBNK-S, AX-INDBNK-S)
 * - OTP: XX-INDBNK-T
 * - Promotional: XX-INDBNK-P
 * - Direct: INDBNK, INDIAN
 */
export class IndianBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Indian Bank';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return (
      normalized.includes('INDIAN BANK') ||
      normalized.includes('INDIANBANK') ||
      normalized.includes('INDIANBK') ||
      // Match DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-INDBNK-S$/.test(normalized) ||
      // Also handle other patterns for completeness
      /^[A-Z]{2}-INDBNK-[TPG]$/.test(normalized) ||
      // Legacy patterns without suffix
      /^[A-Z]{2}-INDBNK$/.test(normalized) ||
      // Direct sender IDs
      normalized === 'INDBNK' ||
      normalized === 'INDIAN'
    );
  }

  extractAmount(message: string): number | null {
    // Pattern 1: debited Rs. 19000.00
    const debitPattern = /debited\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: credited Rs. 5000.00
    const creditPattern = /credited\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2a: Rs.589.00 credited to (amount before credited)
    const creditPatternReverse = /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+credited\s+to/i;
    const creditReverseMatch = message.match(creditPatternReverse);
    if (creditReverseMatch) {
      const amount = parseFloat(creditReverseMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 3: withdrawn Rs. 2000
    const withdrawnPattern = /withdrawn\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const withdrawnMatch = message.match(withdrawnPattern);
    if (withdrawnMatch) {
      const amount = parseFloat(withdrawnMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 4: UPI payment of Rs. 500
    const upiPattern = /UPI\s+payment\s+of\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      const amount = parseFloat(upiMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 5: Sent Rs.440.00 (newer UPI-debit format)
    const sentPattern = /Sent\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const sentMatch = message.match(sentPattern);
    if (sentMatch) {
      const amount = parseFloat(sentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 0: newer UPI-debit format "to NARMADA FOODS.RRN 213416112187"
    // Stop at the period before RRN so the RRN/trailing text is not captured.
    const sentToPattern = /to\s+([^.\n]+?)\.RRN\b/i;
    const sentToMatch = message.match(sentToPattern);
    if (sentToMatch) {
      const merchant = this.cleanMerchantName(sentToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1: "to Merchant Name"
    const toPattern = /to\s+([^.\n]+?)(?:\.\s*UPI:|UPI:|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "from Sender Name"
    const fromPattern = /from\s+([^.\n]+?)(?:\.\s*UPI:|UPI:|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2b: "credited ... by Sender Name" (no "to"/"from" keyword present).
    // Not an upstream PennyWise pattern — added locally for a format PennyWise hasn't
    // hit yet ("A/c ... is credited with Rs.X ... by NAME").
    const byPattern = /\bby\s+([^.\n?]+?)(?:[.?]|\s*UPI:|$)/i;
    const byMatch = message.match(byPattern);
    if (byMatch) {
      const merchant = this.cleanMerchantName(byMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2a: "linked to VPA 7970282159-2@axl" - extract VPA
    const vpaPattern = /VPA\s+([\w.-]+@[\w]+)/i;
    const vpaMatch = message.match(vpaPattern);
    if (vpaMatch) {
      const vpa = vpaMatch[1];
      // Extract the part before @ as merchant name
      const merchantFromVpa = vpa.split('@')[0];
      return this.cleanMerchantName(merchantFromVpa);
    }

    // Pattern 3: ATM withdrawal at location
    const atmPattern = /ATM\s+(?:withdrawal\s+)?at\s+([^.\n]+?)(?:\s+on|$)/i;
    const atmMatch = message.match(atmPattern);
    if (atmMatch) {
      const location = this.cleanMerchantName(atmMatch[1].trim());
      if (this.isValidMerchantName(location)) {
        return `ATM - ${location}`;
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: A/c *1234 or A/c XX1234
    const pattern1 = /A\/c\s+([*X\d]+)/i;
    const match1 = message.match(pattern1);
    if (match1) {
      return this.extractLast4Digits(match1[1]);
    }

    // Pattern 2: Account XX1234 or XXXX1234
    const pattern2 = /Account\s+([X*\d]+)/i;
    const match2 = message.match(pattern2);
    if (match2) {
      return this.extractLast4Digits(match2[1]);
    }

    // Pattern 3: A/c ending 1234
    const pattern3 = /A\/c\s+ending\s+(\d{4})/i;
    const match3 = message.match(pattern3);
    if (match3) {
      return this.extractLast4Digits(match3[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: UPI:515314436916
    const upiRefPattern = /UPI:(\d+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Pattern 1a: UPI Ref no 917477824021
    const upiRefNoPattern = /UPI\s+Ref\s+no\s+(\d+)/i;
    const upiRefNoMatch = message.match(upiRefNoPattern);
    if (upiRefNoMatch) {
      return upiRefNoMatch[1];
    }

    // Pattern 1b: RRN 213416112187 (newer UPI-debit format). Checked AFTER the UPI-ref
    // patterns so a message carrying both a UPI ref and an RRN keeps preferring the UPI
    // ref; the "Sent Rs." format carries only the RRN.
    const rrnPattern = /RRN\s+(\d+)/i;
    const rrnMatch = message.match(rrnPattern);
    if (rrnMatch) {
      return rrnMatch[1];
    }

    // Pattern 2: Ref No. 123456
    const refNoPattern = /Ref\s+No\.?\s*(\w+)/i;
    const refNoMatch = message.match(refNoPattern);
    if (refNoMatch) {
      return refNoMatch[1];
    }

    // Pattern 3: Transaction ID: ABC123
    const txnIdPattern = /Transaction\s+ID:?\s*(\w+)/i;
    const txnIdMatch = message.match(txnIdPattern);
    if (txnIdMatch) {
      return txnIdMatch[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  extractBalance(message: string): number | null {
    // Pattern 1: Bal Rs. 50000.00 or Bal- Rs. 50000.00 or Total Bal : Rs. 50000.00
    const balPattern1 = /Bal[:\s-]+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const balMatch1 = message.match(balPattern1);
    if (balMatch1) {
      const amount = parseFloat(balMatch1[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: Available Balance: Rs. 25000 (or "Available balance is Rs. 25000")
    const balPattern2 = /Available\s+Balance:?\s+(?:is\s+)?Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const balMatch2 = message.match(balPattern2);
    if (balMatch2) {
      const amount = parseFloat(balMatch2[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Indian Bank specific patterns
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('upi payment') && !lowerMessage.includes('received')) return TransactionType.EXPENSE;
    // Newer UPI-debit format: "Sent Rs.440.00 from A/c ..."
    if (lowerMessage.includes('sent rs')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;

    // Fall back to base class for other patterns
    return super.extractTransactionType(message);
  }

  /**
   * Recognise the newer "Sent Rs.<amt> ... to <merchant>" UPI-debit format as a
   * transaction. The base isTransactionMessage only knows verbs like debited/credited/
   * withdrawn, so without this override the message is dropped (parse() returns null)
   * even though it is a real debit.
   */
  isTransactionMessage(message: string): boolean {
    if (super.isTransactionMessage(message)) return true;
    return message.toLowerCase().includes('sent rs');
  }

  /**
   * Guard against classifying a "Sent Rs. ... Avl Bal ..." debit as a balance-update-only
   * notification. The base guard treats any message with an "Avl Bal" keyword and no known
   * txn verb as a pure balance update; "sent" is a txn verb here, so exclude it.
   */
  isBalanceUpdateNotification(message: string): boolean {
    if (message.toLowerCase().includes('sent rs')) return false;
    return super.isBalanceUpdateNotification(message);
  }

  // ==========================================
  // Mandate / Subscription Logic
  // ==========================================

  /**
   * Checks if this is a mandate notification (not a transaction).
   * Delegates to base class E-Mandate and future debit checks.
   */
  isMandateNotification(message: string): boolean {
    return this.isEMandateNotification(message) || this.isFutureDebitNotification(message);
  }

  /**
   * Parses mandate subscription information from Indian Bank messages.
   * Uses base class logic but returns bank-specific type.
   */
  parseMandateSubscription(message: string): IndianMandateInfo | null {
    const baseInfo = super.parseMandateSubscription(message);
    if (!baseInfo) return null;

    return {
      amount: baseInfo.amount,
      nextDeductionDate: baseInfo.nextDeductionDate,
      merchant: baseInfo.merchant,
      umn: baseInfo.umn,
      dateFormat: 'dd-MMM-yy',
    };
  }
}

/**
 * Mandate information for Indian Bank
 */
export interface IndianMandateInfo extends MandateInfo {
  dateFormat: string;
}

export default new IndianBankParser();
