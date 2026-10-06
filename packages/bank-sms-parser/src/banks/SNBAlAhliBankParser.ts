import { BankParser } from '../core/BankParser';
import { FinancialMessageSafety } from '../core/FinancialMessageSafety';
import { SaudiTransactionMessageGuards } from '../core/SaudiTransactionMessageGuards';
import { TransactionType } from '../core/types';

const MASKED_OR_BLANK = /^[*\s\p{Nd}]*$/u;

/**
 * Parser for Saudi National Bank / Al Ahli Bank (SNB-AlAhli, Saudi Arabia).
 *
 * Handles Arabic POS purchase, withdrawal and transfer formats such as:
 *   شراء نقاط بيع SamsungPay
 *   بـSAR 19.45
 *   من SYNTHETIC MERCHANT
 *   مدى *0002
 *   في 07:53 03/04/26
 *
 * Sender examples: SNB-AlAhli, SNB, AlAhliBank, الأهلي
 */
export class SNBAlAhliBankParser extends BankParser {

  getBankName(): string {
    return 'Saudi National Bank';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized.includes('SNB') ||
      normalized.includes('ALAHLI') ||
      normalized.includes('AL-AHLI') ||
      normalized.includes('AL AHLI') ||
      sender.includes('الأهلي');
  }

  protected extractAmount(message: string): number | null {
    const patterns = [
      /\(\s*(?:SAR|SR)\s*([0-9,]+(?:\.\d{1,2})?)\s*\)/i,
      /(?:بـ?|مبلغ)[ \t]*:?[ \t]*(?:SAR|SR)[ \t]*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)\b/i,
      /(?:بـ?|مبلغ)[ \t]*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)[ \t]*:?[ \t]*(?:SAR|SR)\b/i,
      /^\s*(?:SAR|SR)[ \t]*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)\s*$/im,
      /^\s*([0-9][0-9,]*(?:\.\d{1,2})?)[ \t]*(?:SAR|SR)\s*$/im,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = this.parseSarAmount(match[1]);
        if (amount !== null) return amount;
      }
    }
    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (message.includes('استرجاع') || message.includes('مرتجع') ||
      message.includes('إرجاع') || message.includes('عكس العملية') ||
      message.includes('اعادة شراء') || message.includes('إعادة شراء')) {
      return TransactionType.INCOME;
    }
    if (message.includes('تصحيح') && message.includes('سحب') &&
      (message.includes('طوارئ') || message.includes('نقد'))) {
      return TransactionType.INCOME;
    }
    if (message.includes('سداد') &&
      (message.includes('بطاقة') || message.includes('ائتمان'))) {
      return TransactionType.TRANSFER;
    }
    if (message.includes('واردة')) return TransactionType.INCOME;   // incoming transfer
    if (message.includes('حوالة بين حساباتك')) return TransactionType.TRANSFER;
    if (message.includes('إيداع')) return TransactionType.INCOME;   // deposit
    if (message.includes('شراء')) return TransactionType.EXPENSE;   // purchase
    if (message.includes('سحب')) return TransactionType.EXPENSE;    // withdrawal
    if (message.includes('صادرة')) return TransactionType.EXPENSE;  // outgoing transfer
    if (message.includes('خصم')) return TransactionType.EXPENSE;    // deduction
    if (message.includes('سداد')) return TransactionType.EXPENSE;   // bill payment
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Merchant (purchase) and sender (incoming transfer) both follow "من" on its own line
    for (const match of message.matchAll(/(?:^|\n)من[ \t]*([^\n]+)/g)) {
      const raw = match[1].trim();
      if (raw === '' || MASKED_OR_BLANK.test(raw)) continue;
      const merchant = this.cleanMerchantName(raw.replace(/^(?:[0-9*]+)[ \t]*/, '').trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    // "الى: NAME" (to: recipient) for outgoing transfers
    const toMatch = message.match(/الى\s*:?\s*([^\n]+?)(?:\n|$)/);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    if (message.includes('صراف')) {
      return 'ATM Withdrawal';
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "مدى *0002" or "مدى*0002" (Mada card)
    const madaMatch = message.match(/\*?\s*مدى(?:\s*-\s*ابل)?\s*\*+\s*(\d{3,4})\*?/);
    if (madaMatch) return this.extractLast4Digits(madaMatch[1]);

    // "بطاقة *0002" (card)
    const cardMatch = message.match(/بطاقة\s*\*+\s*(\d{3,4})/);
    if (cardMatch) return this.extractLast4Digits(cardMatch[1]);

    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    // "الرصيد: SAR 1234.56" or "الرصيد المتاح: SAR 1234.56"
    const balanceMatch = message.match(/الرصيد(?:\s*المتاح)?\s*:?\s*(?:SAR|SR)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (balanceMatch) return this.parseSarAmount(balanceMatch[1]);

    return null;
  }

  protected detectIsCard(message: string): boolean {
    if (
      message.includes('مدى') ||
      message.includes('بطاقة') ||
      message.includes('نقاط بيع') ||
      message.toLowerCase().includes('samsungpay') ||
      message.toLowerCase().includes('applepay')
    ) {
      return true;
    }
    return super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    if (
      SaudiTransactionMessageGuards.isDeclinedOrFailed(message) ||
      SaudiTransactionMessageGuards.isPromotionalOrOperationalNotice(message) ||
      FinancialMessageSafety.isSecurityCode(message) || message.includes('رمز') ||
      message.toLowerCase().includes('otp') || message.includes('كلمة المرور')
    ) {
      return false;
    }

    const keywords = [
      'شراء',   // purchase
      'سحب',    // withdrawal
      'حوالة',  // transfer
      'خصم',    // deduction
      'سداد',   // payment
      'إيداع',  // deposit
      'SAR', 'SR',
    ];
    return keywords.some((kw) => message.includes(kw));
  }
}

export default new SNBAlAhliBankParser();
