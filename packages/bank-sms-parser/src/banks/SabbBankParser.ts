import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for SABB - Saudi Awwal Bank (Saudi Arabia) SMS messages.
 *
 * Handles Arabic transaction formats such as:
 *   شراء عبر نقاط البيع                    (POS purchase, e.g. Samsung Pay)
 *   شراء إنترنت                            (Online / internet purchase)
 *   حوالة صادرة مقبولة                     (Outgoing transfer)
 *   إيداع حوالة واردة                      (Incoming deposit / transfer)
 *   حوالة راتب                             (Salary transfer / credit)
 *
 * Common fields:
 *   بطاقة: ***1234;mada(Samsung Pay)       Card with last 4
 *   مبلغ: SAR 56.00  /  مبلغ: 126.28 SAR   Amount (either order)
 *   لدى: MERCHANT                          Purchase merchant
 *   من: SENDER / **NNNN                    From (sender for incoming, own a/c for outgoing)
 *   إلى: RECIPIENT / **NNNN                To (recipient for outgoing, own a/c for incoming)
 *   رسوم: SAR 0.57                         Fees on outgoing transfers
 *   في: 2026-05-06 20:02:46                Timestamp
 *
 * Sender example: SAB
 */
export class SabbBankParser extends BankParser {

  getBankName(): string {
    return 'SABB';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().replace(/[\s\-_]/g, '');
    // Match sender variants like "SAB", "SABB", "SAB-Bank", "JD-SAB-S".
    // Avoid catching banks with "SAB" as a sub-token only when there is
    // additional bank-identifying context.
    if (normalized === 'SAB' || normalized === 'SABB') return true;
    if (normalized.includes('SABBANK') || normalized.includes('SABB')) return true;
    // DLT-style headers e.g. "JD-SAB-S", "VK-SAB-T"
    if (/(?:^|[^A-Z])SAB(?:[^A-Z]|$)/.test(sender.toUpperCase())) return true;
    // Arabic name for SABB / Saudi Awwal Bank
    if (sender.includes('ساب') || sender.includes('الأول')) return true;
    return false;
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "مبلغ: SAR 56.00"
    const amountSarFirst = /مبلغ\s*:?\s*SAR\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const match1 = message.match(amountSarFirst);
    if (match1) {
      const result = this.parseSarAmount(match1[1]);
      if (result !== null) return result;
    }

    // Pattern 2: "مبلغ: 126.28 SAR"
    const amountSarLast = /مبلغ\s*:?\s*([0-9,]+(?:\.\d{1,2})?)\s*SAR/i;
    const match2 = message.match(amountSarLast);
    if (match2) {
      const result = this.parseSarAmount(match2[1]);
      if (result !== null) return result;
    }

    // Pattern 3: fallback "SAR 123.45"
    const looseSar = /SAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const match3 = message.match(looseSar);
    if (match3) {
      const result = this.parseSarAmount(match3[1]);
      if (result !== null) return result;
    }

    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    // Incoming / deposit first so it wins over generic "حوالة"
    if (message.includes('حوالة راتب')) return TransactionType.INCOME;   // salary credit
    if (message.includes('إيداع')) return TransactionType.INCOME;
    if (message.includes('واردة')) return TransactionType.INCOME;

    if (message.includes('صادرة')) return TransactionType.EXPENSE;
    if (message.includes('شراء')) return TransactionType.EXPENSE;
    if (message.includes('سحب')) return TransactionType.EXPENSE;
    if (message.includes('خصم')) return TransactionType.EXPENSE;
    if (message.includes('سداد')) return TransactionType.EXPENSE;

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Salary credit (حوالة راتب) has no merchant line; label it as "Salary".
    if (message.includes('حوالة راتب')) {
      return 'Salary';
    }

    const isIncoming = message.includes('إيداع') || message.includes('واردة');
    const isOutgoingTransfer = message.includes('صادرة');

    // Purchases use "لدى:" (at / with) for the merchant.
    const ladaPattern = /لدى\s*:?\s*([^\n]+?)(?:\n|في\s*:|$)/;
    const ladaMatch = message.match(ladaPattern);
    if (ladaMatch) {
      const cleaned = this.cleanSabbMerchant(ladaMatch[1]);
      if (cleaned !== null) return cleaned;
    }

    // Outgoing transfer: recipient is on "إلى:" line (Arabic "to").
    if (isOutgoingTransfer) {
      const toPattern = /إلى\s*:?\s*([^\n]+?)(?:\n|في\s*:|$)/;
      const toMatch = message.match(toPattern);
      if (toMatch) {
        const cleaned = this.cleanSabbMerchant(toMatch[1]);
        if (cleaned !== null) return cleaned;
      }
    }

    // Incoming transfer: sender is on "من:" line.
    if (isIncoming) {
      const fromPattern = /من\s*:?\s*([^\n]+?)(?:\n|في\s*:|$)/;
      const fromMatch = message.match(fromPattern);
      if (fromMatch) {
        const cleaned = this.cleanSabbMerchant(fromMatch[1]);
        if (cleaned !== null) return cleaned;
      }
    }

    return null;
  }

  /**
   * Cleans a captured field: trims, removes trailing masking chars (× and *),
   * runs base cleaning, and validates the result. Returns null if invalid
   * (e.g. purely masked account such as "**9999").
   */
  private cleanSabbMerchant(raw: string): string | null {
    let value = raw.trim();
    // Strip trailing masking symbols and whitespace.
    value = value.replace(/[×* \t]+$/, '');
    // Reject if what remains is just digits / mask chars (account number).
    if (value.trim() === '') return null;
    if (/^[*×\d\s]+$/.test(value)) return null;
    const cleaned = this.cleanMerchantName(value);
    return this.isValidMerchantName(cleaned) ? cleaned : null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "بطاقة: ***1234;..." (card with last 4)
    const cardPattern = /بطاقة\s*:?\s*\*+\s*(\d{3,4})/;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) return this.extractLast4Digits(cardMatch[1]);

    // For transfers, own account often appears as "من: **9999" (outgoing)
    // or "إلى: **9999" (incoming). Capture those too.
    const ownAccountPatterns = [
      /من\s*:?\s*\*+\s*(\d{3,4})/,
      /إلى\s*:?\s*\*+\s*(\d{3,4})/,
    ];
    for (const pattern of ownAccountPatterns) {
      const match = message.match(pattern);
      if (match) return this.extractLast4Digits(match[1]);
    }

    return super.extractAccountLast4(message);
  }

  protected extractBalance(message: string): number | null {
    // "الرصيد: SAR 1234.56" or "الرصيد المتاح: SAR 1234.56"
    const balancePattern = /الرصيد(?:\s*المتاح)?\s*:?\s*SAR\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const match = message.match(balancePattern);
    if (match) return this.parseSarAmount(match[1]);
    return null;
  }

  protected detectIsCard(message: string): boolean {
    if (
      message.includes('بطاقة') ||           // card
      message.includes('مدى') ||             // Mada
      message.includes('نقاط البيع') ||      // POS in Arabic
      message.toLowerCase().includes('samsungpay') ||
      message.toLowerCase().includes('samsung pay') ||
      message.toLowerCase().includes('applepay') ||
      message.toLowerCase().includes('apple pay')
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
      'شراء',      // purchase
      'سحب',       // withdrawal
      'حوالة',     // transfer
      'إيداع',     // deposit
      'خصم',       // deduction
      'سداد',      // bill payment
      'SAR',
    ];
    return keywords.some((kw) => message.includes(kw));
  }
}

export default new SabbBankParser();
