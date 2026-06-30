import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Alinma Bank (Saudi Arabia) SMS messages
 *
 * Handles Arabic text formats:
 * - "شراء محلي من نقاط البيع" = Local purchase from POS
 * - "شراء عبر" = Purchase via
 * - "بمبلغ" / "مبلغ" = Amount
 * - "الرصيد" = Balance
 * - "من" = From (merchant)
 * - Currency: SAR (Saudi Riyal) / ريال سعودى
 */
export class AlinmaBankParser extends BankParser {

  getBankName(): string {
    return 'Alinma Bank';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('ALINMA') ||
      normalizedSender === 'ALINMA' ||
      normalizedSender.includes('الإنماء'); // Arabic name
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "بمبلغ: XX SAR" or "بمبلغ: 3 SAR"
    const amountSARPattern = /بمبلغ:\s*([0-9]+(?:\.[0-9]{2})?)\s*SAR/i;
    const match1 = message.match(amountSARPattern);
    if (match1) {
      const parsed = parseFloat(match1[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 2: "مبلغ: SAR XXX.XX"
    const amountPattern2 = /مبلغ:\s*SAR\s*([0-9]+(?:\.[0-9]{2})?)/i;
    const match2 = message.match(amountPattern2);
    if (match2) {
      const parsed = parseFloat(match2[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 3: "مبلغ: ريال سعودى XXX.XX"
    const amountArabicPattern = /مبلغ:\s*ريال سعودى\s*([0-9]+(?:\.[0-9]{2})?)/;
    const match3 = message.match(amountArabicPattern);
    if (match3) {
      const parsed = parseFloat(match3[1]);
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    // "شراء" means "purchase" in Arabic - always an expense
    if (message.includes('شراء') || /purchase/i.test(message)) {
      return TransactionType.EXPENSE;
    }

    // For future: could add support for income/refunds
    // "إيداع" typically means deposit/credit
    if (message.includes('إيداع') || /deposit/i.test(message)) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "من: Establishment Name" (من = from)
    const fromPattern = /من:\s*([^\n]+?)(?:\n|في:)/i;
    const match1 = message.match(fromPattern);
    if (match1) {
      let merchant = match1[1].trim();
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "لدى: Commercial Self-Technolog" (لدى = at/with)
    const atPattern = /لدى:\s*([^\n]+?)(?:\n|في:)/i;
    const match2 = message.match(atPattern);
    if (match2) {
      let merchant = match2[1].trim();
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Default for POS transactions
    if (message.includes('POS') || message.includes('نقاط البيع')) {
      return 'POS Transaction';
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;

    // Pattern 1: "حساب: **XXXX" or "حساب: **0000" (حساب = account)
    const accountPattern = /حساب:\s*\*+(\d{4})/;
    const match1 = message.match(accountPattern);
    if (match1) return match1[1];

    // Pattern 2: "حساب: *XXXX"
    const accountPattern2 = /حساب:\s*\*(\d{4})/;
    const match2 = message.match(accountPattern2);
    if (match2) return match2[1];

    // Pattern 3: "البطاقة: **XXXX" (البطاقة = card)
    const cardPattern = /البطاقة:\s*\*+(\d{4})/;
    const match3 = message.match(cardPattern);
    if (match3) return match3[1];

    // Pattern 4: "البطاقة الائتمانية: **XXXX" (credit card)
    const creditCardPattern = /البطاقة الائتمانية:\s*\*+(\d{4})/;
    const match4 = message.match(creditCardPattern);
    if (match4) return match4[1];

    // Pattern 5: "بطاقة مدى: XXXX*" (Mada card - reversed format)
    const madaPattern = /بطاقة مدى:\s*(\d{4})\*/;
    const match5 = message.match(madaPattern);
    if (match5) return match5[1];

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Pattern 1: "الرصيد: XXX.XX SAR" (الرصيد = balance)
    const balanceSARPattern = /الرصيد:\s*([0-9]+(?:\.[0-9]{2})?)\s*SAR/i;
    const match1 = message.match(balanceSARPattern);
    if (match1) {
      const parsed = parseFloat(match1[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 2: "الرصيد: XXX.XX ريال" (ريال = riyal)
    const balanceRiyalPattern = /الرصيد:\s*([0-9]+(?:\.[0-9]{2})?)\s*ريال/;
    const match2 = message.match(balanceRiyalPattern);
    if (match2) {
      const parsed = parseFloat(match2[1]);
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    // Skip OTP messages
    if (
      /OTP/i.test(message) ||
      message.includes('رمز') || // "رمز" = code
      message.includes('كلمة المرور') // "كلمة المرور" = password
    ) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'شراء',     // purchase
      'بمبلغ',    // amount
      'مبلغ',     // amount
      'الرصيد',   // balance
      'Purchase', // English variant
      'POS',
    ];

    return transactionKeywords.some((kw) => message.includes(kw));
  }

  protected detectIsCard(message: string): boolean {
    // Check for card-related keywords in Arabic
    return message.includes('البطاقة') ||          // card
      message.includes('بطاقة') ||                 // card
      message.includes('البطاقة الائتمانية') ||    // credit card
      message.includes('بطاقة مدى') ||             // Mada card
      message.includes('POS') ||
      message.includes('نقاط البيع');              // POS in Arabic
  }
}

export default new AlinmaBankParser();
