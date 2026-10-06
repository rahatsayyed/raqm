import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

const POS_DETECT = /Amount\s*:\s*(?:(?:SAR|SR)\s|[0-9])/i;
const POS_AMOUNT = /Amount\s*:\s*(?:(?:SAR|SR)\s*([0-9,]+(?:\.\d{1,2})?)|([0-9,]+(?:\.\d{1,2})?)\s*(?:SAR|SR))/i;
const POS_CARD = /By:\s*(\d+)\s*;/;
const POS_MERCHANT = /At:\s*([^\n]+)/;
const MASKED_ONLY = /^[*;\s\p{Nd}]*$/u;
const MASKED_DIGITS_ONLY = /^[*\p{Nd}]*$/u;

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
 * Supported formats (English, multi-line PoS):
 * - "PoS Purchase\nBy:<digits>;<method>\nAmount:SR <number>\nAt:<merchant>\n<date>"
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

  private isEnglishPosFormat(message: string): boolean {
    return /PoS Purchase/i.test(message) && POS_DETECT.test(message);
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized.includes('ALRAJHI') ||
      normalized.includes('RAJHI') ||
      sender.includes('الراجحي');
  }

  protected extractAmount(message: string): number | null {
    if (this.isEnglishPosFormat(message)) {
      const posMatch = message.match(POS_AMOUNT);
      if (posMatch) {
        return this.parseSarAmount(posMatch[1] || posMatch[2]);
      }
    }

    // Refund/cashback alerts use an explicit Amount field without the PoS title
    if (this.isRefundOrReversalMessage(message) || this.isCashbackMessage(message)) {
      const labelled = this.labelledSarAmount(message);
      if (labelled !== null) return labelled;
    }

    // Pattern 1: "بـSAR 5.75" / "بـSR 5.75" (optional spacing)
    const bMatch = message.match(/بـ?\s*:?[ \t]*(?:SAR|SR)\s*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)\b/i);
    if (bMatch) return this.parseSarAmount(bMatch[1]);

    // Pattern 2: "مبلغ:SAR 100" / "مبلغ:SR 100" (optional spacing)
    const amountMatch = message.match(/مبلغ\s*:?[ \t]*(?:SAR|SR)\s*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)\b/i);
    if (amountMatch) return this.parseSarAmount(amountMatch[1]);

    // Historical Arabic layouts may put the number before the currency
    const numberFirstMatch = message.match(/^\s*(?:بـ?|مبلغ)\s*:?[ \t]*([0-9,]+(?:\.\d{1,2})?)\s*(?:SAR|SR)\s*$/im);
    if (numberFirstMatch) return this.parseSarAmount(numberFirstMatch[1]);

    // Pattern 3: "القسط: 2304.58 SAR" (loan installment)
    const installmentMatch = message.match(/القسط:\s*([0-9,]+(?:\.\d{1,2})?)\s*SAR/i);
    if (installmentMatch) return this.parseSarAmount(installmentMatch[1]);

    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    // Return/reversal wording beats the original purchase term repeated in return notices
    if (this.isCashbackReversalMessage(message)) return TransactionType.EXPENSE;
    if (this.isCashbackMessage(message)) return TransactionType.INCOME;
    if (this.isRefundOrReversalMessage(message)) return TransactionType.INCOME;

    if (this.isEnglishPosFormat(message)) return TransactionType.EXPENSE;

    // واردة = incoming
    if (message.includes('واردة')) return TransactionType.INCOME;

    if (this.isPurchaseMessage(message)) return TransactionType.EXPENSE;

    if (message.includes('سحب')) return TransactionType.EXPENSE;    // withdrawal
    if (message.includes('صادرة')) return TransactionType.EXPENSE;  // outgoing
    if (message.includes('خصم')) return TransactionType.EXPENSE;    // deduction
    if (message.includes('سداد')) return TransactionType.EXPENSE;   // payment/settlement

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    if (!this.isEnglishPosFormat(message) &&
      (this.isPurchaseMessage(message) || this.isRefundOrReversalMessage(message) ||
        this.isCashbackMessage(message))) {
      const labelled = this.labelledMerchant(message);
      if (labelled !== null) return labelled;
    }

    if (this.isEnglishPosFormat(message)) {
      const posMatch = message.match(POS_MERCHANT);
      if (posMatch) {
        let raw = posMatch[1].trim();
        // Strip a leading numeric terminal id ("170658 riyadh" -> "riyadh")
        const stripped = raw.replace(/^\d+\s+/, '').trim();
        if (stripped !== '' && /\p{L}/u.test(stripped)) {
          raw = stripped;
        }
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
      return null;
    }

    // Pattern 1: "لـMERCHANT" (to/for merchant) — stop at newline or date pattern
    const toMatch = message.match(/لـ([^\n*]+?)(?:\n|\d{2}\/\d|$)/);
    if (toMatch) {
      const raw = toMatch[1].trim();
      if (!MASKED_ONLY.test(raw)) {
        // After ";" is the name following the account
        const merchant = raw.includes(';')
          ? this.cleanMerchantName(raw.substring(raw.indexOf(';') + 1).trim())
          : this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 2: "الى:MERCHANT" (to: recipient for transfers)
    const toColonMatch = message.match(/الى:([^\n]+?)(?:\n|الى:|الرسوم:|$)/);
    if (toColonMatch) {
      const raw = toColonMatch[1].trim();
      if (!MASKED_DIGITS_ONLY.test(raw)) {
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 3: "مكان السحب:LOCATION" (withdrawal location for ATM)
    const atmMatch = message.match(/مكان السحب:([^\n]+?)(?:\n|$)/);
    if (atmMatch) {
      const merchant = this.cleanMerchantName(atmMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "من:SENDER" for incoming transfers
    const fromMatch = message.match(/من:([^\n*]+?)(?:\n|\d{2}\/\d|$)/);
    if (fromMatch) {
      const raw = fromMatch[1].trim();
      if (raw.trim() !== '' && !MASKED_DIGITS_ONLY.test(raw)) {
        const merchant = this.cleanMerchantName(raw);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 5: "من****;NAME" for incoming internal transfers
    const fromInlineMatch = message.match(/من\*+;(.+?)(?:\n|\d{2}\/\d|$)/);
    if (fromInlineMatch) {
      const merchant = this.cleanMerchantName(fromInlineMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    if (message.includes('صراف آلي')) {
      return 'ATM Withdrawal';
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // English PoS "By:<digits>;<method>" identifies the card; keep the last 4
    if (this.isEnglishPosFormat(message)) {
      const match = message.match(POS_CARD);
      if (match) {
        const last4 = this.extractLast4Digits(match[1]);
        if (last4 !== null) return last4;
      }
    }
    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    // "المبلغ المتبقي: SAR 13827.48" (remaining amount)
    const remainingMatch = message.match(/المبلغ المتبقي\s*:\s*(?:SAR|SR)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (remainingMatch) return this.parseSarAmount(remainingMatch[1]);

    // Current balance form: "رصيد: 1.55 SR"
    const balanceMatch = message.match(/رصيد\s*:\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:SAR|SR)/i);
    if (balanceMatch) return this.parseSarAmount(balanceMatch[1]);

    return null;
  }

  protected detectIsCard(message: string): boolean {
    if (this.isEnglishPosFormat(message)) return true;
    // مدى = Mada (Saudi debit card network), بطاقة = card
    if (message.includes('مدى') || message.includes('بطاقة')) {
      return true;
    }
    return super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    if (this.isDeclinedOrFailedMessage(message)) return false;

    if (message.includes('رمز') || /otp/i.test(message) ||
      message.includes('كلمة المرور') ||
      /verification code/i.test(message) ||
      /one time password/i.test(message)) {
      return false;
    }

    if (this.isEnglishPosFormat(message)) return true;

    const keywords = [
      'شراء',      // purchase
      'سحب',       // withdrawal
      'حوالة',     // transfer
      'خصم',       // deduction
      'سداد',      // payment/settlement
      'استرجاع',   // refund/return
      'مرتجع',     // returned purchase
      'عكس',       // reversal
      'refund',
      'reversal',
      'cashback',
      'كاش باك',
      'SAR',
      'SR',
    ];
    const lower = message.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  private isPurchaseMessage(message: string): boolean {
    return /purchase/i.test(message) || /PoS/i.test(message) || message.includes('شراء');
  }

  private isRefundOrReversalMessage(message: string): boolean {
    const explicitTitle = /^\s*(?:(?:pos\s+)?purchase\s+|card\s+purchase\s+)?(?:refund|reversal)\b/im;
    const explicitArabicTitle = /^\s*(?:استرجاع|إرجاع|مرتجع|عكس\s+العملية)\b/m;
    return explicitTitle.test(message) || explicitArabicTitle.test(message);
  }

  private isCashbackMessage(message: string): boolean {
    return /cashback/i.test(message) || message.includes('كاش باك');
  }

  private isCashbackReversalMessage(message: string): boolean {
    return this.isCashbackMessage(message) &&
      (/reversal/i.test(message) || /^\s*كاش\s+باك\s+عكس(?:\s|$)/m.test(message));
  }

  private labelledSarAmount(message: string): number | null {
    const match = message.match(
      /^\s*Amount\s*:\s*(?:(?:SAR|SR)\s*([0-9,]+(?:\.\d{1,2})?)|([0-9,]+(?:\.\d{1,2})?)\s*(?:SAR|SR))\s*$/im
    );
    return match ? this.parseSarAmount(match[1] || match[2]) : null;
  }

  private labelledMerchant(message: string): string | null {
    const match = message.match(/^\s*(?:At|لدى|التاجر)\s*:?\s*([^\n]+?)\s*$/im);
    if (!match) return null;
    const merchant = this.cleanMerchantName(match[1].trim());
    return this.isValidMerchantName(merchant) ? merchant : null;
  }

  private isDeclinedOrFailedMessage(message: string): boolean {
    const lower = message.toLowerCase();
    const english = [
      'declined', 'failed', 'not successful', 'rejected',
      'could not be completed', 'was not completed',
    ];
    const arabic = [
      'عملية مرفوضة', 'تم رفض العملية', 'فشل العملية',
      'عملية فاشلة', 'تعذر إتمام العملية', 'عملية غير ناجحة',
    ];
    return english.some((p) => lower.includes(p)) || arabic.some((p) => message.includes(p));
  }
}

export default new AlRajhiBankParser();
