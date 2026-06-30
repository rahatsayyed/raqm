import { BankParser } from './BankParser';
import { CompiledPatterns } from './CompiledPatterns';
import { MandateInfo } from './types';

/**
 * Base abstract class for Indian bank parsers.
 * Handles common patterns across Indian banks (INR currency, UPI, etc.).
 */
export abstract class BaseIndianBankParser extends BankParser {

  getCurrency(): string {
    return 'INR';
  }

  /**
   * Checks if the message is for an investment transaction.
   * Credits to a bank account are income, not investment.
   */
  protected isInvestmentTransaction(lowerMessage: string): boolean {
    // Credits to a bank account are income, not investment (ACH dividends, vendor payments, etc.)
    // Only use "credited" and "deposited" — "received" is ambiguous
    if (lowerMessage.includes('credited') || lowerMessage.includes('deposited')) {
      return false;
    }
    return super.isInvestmentTransaction(lowerMessage);
  }

  // ==========================================
  // Unified Mandate / Subscription Logic
  // ==========================================

  /**
   * Checks if this is an E-Mandate notification (not a transaction).
   */
  isEMandateNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('e-mandate') ||
      lowerMessage.includes('upi-mandate') ||
      (lowerMessage.includes('mandate') && lowerMessage.includes('successfully created'))
    );
  }

  /**
   * Checks if this is a future debit notification (subscription alert, not a current transaction).
   */
  isFutureDebitNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('will be debited') ||
      lowerMessage.includes('mandate set for') ||
      (lowerMessage.includes('upcoming') && lowerMessage.includes('mandate'))
    );
  }

  /**
   * Parses combined Mandate / E-Mandate / UPI-Mandate subscription information.
   * Returns a MandateInfo object or null.
   */
  parseMandateSubscription(message: string): MandateInfo | null {
    if (!this.isEMandateNotification(message) && !this.isFutureDebitNotification(message)) {
      return null;
    }

    // 1. Extract amount
    // Patterns: "Rs.1050.00", "INR 59.00", "Rs 123.45"
    let amount: number | null = null;

    const inrMatch = message.match(CompiledPatterns.Amount.INR_PATTERN);
    if (inrMatch) {
      const parsed = parseFloat(inrMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) {
        amount = parsed;
      }
    }

    if (amount === null) {
      const rsMatch = message.match(CompiledPatterns.Amount.RS_PATTERN);
      if (rsMatch) {
        const parsed = parseFloat(rsMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed)) {
          amount = parsed;
        }
      }
    }

    if (amount === null) {
      return null;
    }

    // 2. Extract merchant
    let merchant = 'Unknown Subscription';
    const merchantPatterns = [
      /towards\s+([^.\n]+?)(?:\s+from|\s+A\/c|\s+UMRN|\s+ID:|\s+Alert:|\s*\.|$)/i,
      /for\s+([^.\n]+?)(?:\s+mandate|\s+will\s+be|\s+ID:|\s+Act:|\s*\.|$)/i,
      /Info:\s*([^.\n]+?)(?:\s*$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const m = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(m)) {
          merchant = m;
          break;
        }
      }
    }

    // 3. Extract date (for future debits)
    const ddMmmYySource = CompiledPatterns.Date.DD_MMM_YY.source;
    const ddMmYyyySource = CompiledPatterns.Date.DD_MM_YYYY.source;
    const datePattern = new RegExp(
      `(?:on|for)\\s+(${ddMmmYySource}|${ddMmYyyySource})`,
      'i'
    );
    const dateMatch = message.match(datePattern);
    const nextDeductionDate = dateMatch ? dateMatch[1] : null;

    // 4. Extract UMN (Unique Mandate Number) if present
    const umnPattern = /UMN[:\s]+([^.\s]+)/i;
    const umnMatch = message.match(umnPattern);
    const umn = umnMatch ? umnMatch[1] : null;

    const resolvedAmount = amount;
    return {
      amount: resolvedAmount,
      nextDeductionDate,
      merchant,
      umn,
      dateFormat: 'dd-MMM-yy',
    };
  }

  // ==========================================
  // Unified Balance Update Logic
  // ==========================================

  /**
   * Checks if this is a balance update notification (not a transaction).
   */
  isBalanceUpdateNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const hasBalanceKeyword =
      lowerMessage.includes('available bal') ||
      lowerMessage.includes('avl bal') ||
      lowerMessage.includes('account balance') ||
      lowerMessage.includes('a/c balance') ||
      lowerMessage.includes('updated balance');

    const hasTxnKeyword =
      lowerMessage.includes('debited') ||
      lowerMessage.includes('credited') ||
      lowerMessage.includes('withdrawn') ||
      lowerMessage.includes('deposited') ||
      lowerMessage.includes('spent') ||
      lowerMessage.includes('transferred') ||
      lowerMessage.includes('payment of');

    return hasBalanceKeyword && !hasTxnKeyword;
  }

  /**
   * Parses generic balance update notification.
   */
  parseBalanceUpdate(message: string): BaseBalanceUpdateInfo | null {
    if (!this.isBalanceUpdateNotification(message)) {
      return null;
    }

    const accountLast4 = this.extractAccountLast4(message);
    const balance = this.extractBalance(message);
    if (balance === null) {
      return null;
    }

    return {
      bankName: this.getBankName(),
      accountLast4: accountLast4 ?? null,
      balance,
    };
  }

  // ==========================================
  // Common Helper Methods
  // ==========================================

  /**
   * Helper function to convert month abbreviation to number.
   */
  protected getMonthNumber(monthAbbr: string): number {
    switch (monthAbbr.toUpperCase()) {
      case 'JAN': return 1;
      case 'FEB': return 2;
      case 'MAR': return 3;
      case 'APR': return 4;
      case 'MAY': return 5;
      case 'JUN': return 6;
      case 'JUL': return 7;
      case 'AUG': return 8;
      case 'SEP': return 9;
      case 'OCT': return 10;
      case 'NOV': return 11;
      case 'DEC': return 12;
      default: return 1;
    }
  }
}

export interface BaseBalanceUpdateInfo {
  bankName: string;
  accountLast4: string | null;
  balance: number;
  asOfDate?: Date | null;
}
