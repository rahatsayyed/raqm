import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Al Rajhi Bank (Saudi Arabia) SMS messages
 *
 * Supported formats (Arabic):
 * - Purchase: "شراء ... بـSAR 5.75 لـMERCHANT"
 * - Online purchase: "شراء انترنت ... بـSAR 140 لـMERCHANT"
 * - ATM withdrawal: "سحب:صراف آلي ... مبلغ:SAR 100 مكان السحب:LOCATION"
 * - Outgoing local transfer: "حوالة محلية صادرة ... مبلغ:SAR 100 الى:RECIPIENT"
 * - Incoming local transfer: "حوالة محلية واردة ... مبلغ:SAR 7714.80 من:SENDER"
 * - Outgoing internal transfer: "حوالة داخلية صادرة ... بـSAR 200"
 * - Incoming internal transfer: "حوالة داخلية واردة ... بـSAR 1170"
 * - Loan installment: "خصم: قسط تمويل ... القسط: 2304.58 SAR"
 * - Bill payment: "سداد فاتورة"
 *
 * Sender: AlRajhiBank
 */
export class AlRajhiBankParser extends BankParser {

  getBankName(): string {
    return 'Al Rajhi Bank';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized.includes('ALRAJHI') ||
      normalized.includes('RAJHI') ||
      sender.includes('الراجحي');
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "بـSAR 5.75" or "بـSAR 140"
    const bPattern = /بـSAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const bMatch = message.match(bPattern);
    if (bMatch) {
      return this.parseSarAmount(bMatch[1]);
    }

    // Pattern 2: "مبلغ:SAR 100" or "مبلغ: SAR 100"
    const amountPattern = /مبلغ:\s*SAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const amountMatch = message.match(amountPattern);
    if (amountMatch) {
      return this.parseSarAmount(amountMatch[1]);
    }

    // Pattern 3: "القسط: 2304.58 SAR" (loan installment)
    const installmentPattern = /القسط:\s*([0-9,]+(?:\.\d{1,2})?)\s*SAR/i;
    const installmentMatch = message.match(installmentPattern);
    if (installmentMatch) {
      return this.parseSarAmount(installmentMatch[1]);
    }

    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    // Incoming (واردة = incoming)
    if (message.includes('واردة')) return TransactionType.INCOME;

    // Expense types
    if (message.includes('شراء')) return TransactionType.EXPENSE;   // purchase
    if (message.includes('سحب')) return TransactionType.EXPENSE;    // withdrawal
    if (message.includes('صادرة')) return TransactionType.EXPENSE;  // outgoing
    if (message.includes('خصم')) return TransactionType.EXPENSE;    // deduction
    if (message.includes('سداد')) return TransactionType.EXPENSE;   // payment/settlement

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "لـMERCHANT" (to/for merchant) — stop at newline or date pattern
    const toPattern = /لـ([^\n*]+?)(?:\n|\d{2}\/\d|$)/;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const raw = toMatch[1].trim();
      // Skip if it looks like an account number (all *s and digits)
      const isAccountLike = raw.split('').every(c => c === '*' || /\d/.test(c) || c === ';' || /\s/.test(c));
      if (!isAccountLike) {
        // If contains ";", take the part after it (name after account)
        const merchant = raw.includes(';')
          ? this.cleanMerchantName(raw.substring(raw.indexOf(';') + 1).trim())
          : this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 2: "الى:MERCHANT" (to: recipient for transfers)
    const toColonPattern = /الى:([^\n]+?)(?:\n|الى:|الرسوم:|$)/;
    const toColonMatch = message.match(toColonPattern);
    if (toColonMatch) {
      const raw = toColonMatch[1].trim();
      const isDigitsOnly = raw.split('').every(c => c === '*' || /\d/.test(c));
      if (!isDigitsOnly) {
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 3: "مكان السحب:LOCATION" (withdrawal location for ATM)
    const atmPattern = /مكان السحب:([^\n]+?)(?:\n|$)/;
    const atmMatch = message.match(atmPattern);
    if (atmMatch) {
      const merchant = this.cleanMerchantName(atmMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "من:SENDER" for incoming transfers — extract who sent money
    const fromPattern = /من:([^\n*]+?)(?:\n|\d{2}\/\d|$)/;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const raw = fromMatch[1].trim();
      const isDigitsOnly = raw.split('').every(c => c === '*' || /\d/.test(c));
      if (raw.trim() !== '' && !isDigitsOnly) {
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 5: "من****;NAME" for incoming internal transfers
    const fromInlinePattern = /من\*+;(.+?)(?:\n|\d{2}\/\d|$)/;
    const fromInlineMatch = message.match(fromInlinePattern);
    if (fromInlineMatch) {
      const merchant = this.cleanMerchantName(fromInlineMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // ATM fallback
    if (message.includes('صراف آلي')) {
      return 'ATM Withdrawal';
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "المبلغ المتبقي: SAR 13827.48" (remaining amount)
    const remainingPattern = /المبلغ المتبقي:\s*SAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const remainingMatch = message.match(remainingPattern);
    if (remainingMatch) {
      return this.parseSarAmount(remainingMatch[1]);
    }

    return null;
  }

  protected detectIsCard(message: string): boolean {
    // مدى = Mada (Saudi debit card network)
    // بطاقة = card
    if (message.includes('مدى') || message.includes('بطاقة')) {
      return true;
    }
    return super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    // Skip OTP / verification
    if (message.includes('رمز') || message.toLowerCase().includes('otp') ||
      message.includes('كلمة المرور')) {
      return false;
    }

    const keywords = [
      'شراء',   // purchase
      'سحب',    // withdrawal
      'حوالة',  // transfer
      'خصم',    // deduction
      'سداد',   // payment/settlement
      'SAR',    // currency marker
    ];
    return keywords.some(kw => message.includes(kw));
  }
}

export default new AlRajhiBankParser();
