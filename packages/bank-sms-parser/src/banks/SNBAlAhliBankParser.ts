import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Saudi National Bank / Al Ahli Bank (SNB-AlAhli, Saudi Arabia).
 *
 * Handles Arabic POS purchase, withdrawal and transfer formats such as:
 *   شراء نقاط بيع SamsungPay
 *   بـSAR 19.45
 *   من filwah al
 *   مدى *2342
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
    // Pattern 1: "بـSAR 19.45" (POS purchase, card transaction)
    const bPattern = /بـ\s*SAR\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const bMatch = message.match(bPattern);
    if (bMatch) {
      return this.parseSarAmount(bMatch[1]);
    }

    // Pattern 2: "مبلغ: SAR 100" or "مبلغ:SAR 100"
    const amountPattern = /مبلغ\s*:?\s*SAR\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const amountMatch = message.match(amountPattern);
    if (amountMatch) {
      return this.parseSarAmount(amountMatch[1]);
    }

    // Pattern 3: "SAR 19.45" (loose fallback)
    const looseSarPattern = /SAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const looseSarMatch = message.match(looseSarPattern);
    if (looseSarMatch) {
      return this.parseSarAmount(looseSarMatch[1]);
    }

    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (message.includes('واردة')) return TransactionType.INCOME;   // incoming transfer
    if (message.includes('إيداع')) return TransactionType.INCOME;   // deposit
    if (message.includes('شراء')) return TransactionType.EXPENSE;   // purchase
    if (message.includes('سحب')) return TransactionType.EXPENSE;    // withdrawal
    if (message.includes('صادرة')) return TransactionType.EXPENSE;  // outgoing transfer
    if (message.includes('خصم')) return TransactionType.EXPENSE;    // deduction
    if (message.includes('سداد')) return TransactionType.EXPENSE;   // bill payment
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // For outgoing purchases/transfers, merchant follows "من" (from) on its own line.
    // For incoming transfers it is also "من" (sender), so we extract it the same way.
    const fromPattern = /من\s+([^\n]+?)(?:\n|$)/;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const raw = fromMatch[1].trim();
      if (raw.length > 0 && !raw.split('').every(c => c === '*' || /\d/.test(c))) {
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // "الى: NAME" (to: recipient) for outgoing transfers
    const toPattern = /الى\s*:?\s*([^\n]+?)(?:\n|$)/;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // ATM fallback
    if (message.includes('صراف')) {
      return 'ATM Withdrawal';
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "مدى *2342" or "مدى*2342" (Mada card)
    const madaPattern = /مدى\s*\*+\s*(\d{3,4})/;
    const madaMatch = message.match(madaPattern);
    if (madaMatch) {
      return this.extractLast4Digits(madaMatch[1]);
    }

    // "بطاقة *2342" (card)
    const cardPattern = /بطاقة\s*\*+\s*(\d{3,4})/;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return this.extractLast4Digits(cardMatch[1]);
    }

    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    // "الرصيد: SAR 1234.56" or "الرصيد المتاح: SAR 1234.56"
    const balancePattern = /الرصيد(?:\s*المتاح)?\s*:?\s*SAR\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      return this.parseSarAmount(balanceMatch[1]);
    }

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
      message.includes('رمز') ||
      message.toLowerCase().includes('otp') ||
      message.includes('كلمة المرور')
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
      'SAR',
    ];
    return keywords.some(kw => message.includes(kw));
  }
}

export default new SNBAlAhliBankParser();
