import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Bank Muscat (Oman) SMS messages
 *
 * Supported formats (Arabic):
 * - Debit: "تم خصم OMR 0.650 من حسابك رقم XXXXX بإستخدام بطاقة الخصم المباشر في MERCHANT بتاريخ DATE. رصيدك الحالي هو BALANCE OMR."
 * - Credit: "تم إيداع OMR X.XXX في حسابك رقم XXXXX بتاريخ DATE. رصيدك الحالي هو BALANCE OMR."
 *
 * Currency: OMR (Omani Rial)
 * Sender: BankMuscat, BKMUSCAT, bank muscat
 */
export class BankMuscatParser extends BankParser {

  getBankName(): string {
    return 'Bank Muscat';
  }

  getCurrency(): string {
    return 'OMR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized.includes('MUSCAT') ||
      normalized.includes('BKMUSCAT') ||
      normalized.includes('BANKMUSCAT') ||
      normalized.includes('BK MUSCAT') ||
      sender.includes('بنك مسقط');
  }

  protected isTransactionMessage(message: string): boolean {
    // Arabic debit/credit keywords
    return message.includes('تم خصم') ||       // deducted
      message.includes('تم إيداع') ||           // deposited
      message.includes('تم تحويل') ||           // transferred
      message.includes('تم سداد');              // payment made
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "تم خصم OMR 0.650" or "OMR 0.100" (currency before amount)
    const omrBeforePattern = /OMR\s+([\d,]+(?:\.\d+)?)/i;

    // Pattern 2: "0.650 OMR" (amount before currency)
    const omrAfterPattern = /([\d,]+(?:\.\d+)?)\s+OMR/i;

    // Try currency-before-amount first (more common in the screenshots)
    const beforeMatch = message.match(omrBeforePattern);
    if (beforeMatch) {
      const parsed = parseFloat(beforeMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    const afterMatch = message.match(omrAfterPattern);
    if (afterMatch) {
      const parsed = parseFloat(afterMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (message.includes('تم خصم')) return TransactionType.EXPENSE;   // deducted
    if (message.includes('تم إيداع')) return TransactionType.INCOME;  // deposited
    if (message.includes('تم تحويل')) return TransactionType.TRANSFER; // transferred
    if (message.includes('تم سداد')) return TransactionType.EXPENSE;  // payment made
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Merchant is between "في" (at) and "بتاريخ" (on date)
    const merchantPattern = /في\s+(.+?)\s+بتاريخ/i;
    const match = message.match(merchantPattern);
    if (match) {
      const raw = match[1].trim();
      // Clean up merchant: remove leading/trailing ID numbers like "757487-" or "-650068"
      const cleaned = raw
        .replace(/^\d{4,}-/, '')       // leading "757487-"
        .replace(/-\d{4,}$/, '')       // trailing "-650068"
        .replace(/-\d{4,}\s/g, ' ')   // middle "-757487 "
        .trim();
      if (cleaned.length > 0) {
        return this.cleanMerchantName(cleaned);
      }
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "حسابك رقم XXXXXXXX1234" or "حسابك رقم XXXXX"
    const accountPattern = /حسابك رقم\s+([X*\d]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return null;
  }

  protected extractBalance(message: string): number | null {
    // "رصيدك الحالي هو 9999.740 OMR" (your current balance is X OMR)
    const balancePattern = /رصيدك الحالي هو\s+([\d,]+(?:\.\d+)?)\s*OMR/i;
    const match = message.match(balancePattern);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    // Also try "OMR amount" format for balance
    const balancePattern2 = /رصيدك الحالي هو\s+OMR\s*([\d,]+(?:\.\d+)?)/i;
    const match2 = message.match(balancePattern2);
    if (match2) {
      const parsed = parseFloat(match2[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }

  protected detectIsCard(message: string): boolean {
    return message.includes('بطاقة الخصم المباشر') ||  // debit card
      message.includes('بطاقة الائتمان') ||              // credit card
      message.includes('بطاقة');                          // card (generic)
  }
}

export default new BankMuscatParser();
