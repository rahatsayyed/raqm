// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

// One parser for all Arab Bank markets; per-message currency (EGP/JOD/USD) is detected.
export class ArabBankParser extends BankParser {
  getBankName(): string {
    return 'Arab Bank';
  }

  getCurrency(): string {
    return 'EGP';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    if (normalized.includes('ARABBANK')) return true;
    const stripped = normalized.replace(/[\s\-_]/g, '');
    return stripped.includes('ARABBANK') || /^[A-Z]{2}ARABBK[A-Z]?$/.test(stripped);
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const transaction = super.parse(smsBody, sender, timestamp);
    if (transaction === null) return null;
    const currency = this.extractCurrency(smsBody) ?? this.getCurrency();
    return { ...transaction, currency };
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (
      lower.includes('otp') ||
      lower.includes('one time password') ||
      lower.includes('verification code') ||
      lower.includes('passcode') ||
      lower.includes('declined') ||
      lower.includes('transaction failed') ||
      lower.includes('trx failed') ||
      lower.includes('has failed') ||
      lower.includes('was unsuccessful') ||
      lower.includes('not successful') ||
      message.includes('رمز التحقق') ||
      message.includes('كلمة المرور')
    ) {
      return false;
    }

    if (/using\s+Card/i.test(message)) return true;
    if (lower.includes('has been debited') || lower.includes('has been credited')) return true;
    if (message.includes('تم قيد')) return true;

    return false;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();

    if (message.includes('تم قيد')) return TransactionType.INCOME;
    if (/using\s+Card/i.test(message)) return TransactionType.EXPENSE;
    if (lower.includes('has been debited')) return TransactionType.EXPENSE;
    if (lower.includes('has been credited')) return TransactionType.INCOME;

    return null;
  }

  private toNumber(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAmount(message: string): number | null {
    const card = message.match(/for\s+[A-Z]{3}\s+([0-9,]+(?:\.\d+)?)/i);
    if (card) {
      const value = this.toNumber(card[1]);
      if (value !== null) return value;
    }

    const transfer = message.trim().match(/^(?:JOD|USD|EGP)\s*([0-9,]+(?:\.\d+)?)/i);
    if (transfer) {
      const value = this.toNumber(transfer[1]);
      if (value !== null) return value;
    }

    const arabic = message.match(/([0-9,]+(?:\.\d+)?)\s*جنيه/);
    if (arabic) {
      const value = this.toNumber(arabic[1]);
      if (value !== null) return value;
    }

    return null;
  }

  protected extractCurrency(message: string): string | null {
    const card = message.match(/for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d+)?/i);
    if (card) return card[1].toUpperCase();

    const transfer = message.trim().match(/^(JOD|USD|EGP)\s*[0-9,]+(?:\.\d+)?/i);
    if (transfer) return transfer[1].toUpperCase();

    if (message.includes('جنيه')) return 'EGP';

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const card = message.match(/from\s+(.+?)\s+for\s+[A-Z]{3}\s/i);
    if (card) {
      const merchant = this.cleanMerchantName(card[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const lower = message.toLowerCase();

    if (lower.includes('has been debited')) {
      const debit = message.match(/\bto\s+(.+?)(?:\s+as\b|\s+Balance\b|$)/i);
      if (debit) {
        const merchant = this.cleanMerchantName(debit[1].trim());
        if (this.isValidMerchantName(merchant)) return merchant;
      }
    }

    if (lower.includes('has been credited')) {
      const credit = message.match(/from\s*(.+?)(?:\s+as\b|\s+Balance\b|$)/i);
      if (credit) {
        const merchant = this.cleanMerchantName(credit[1].trim());
        if (this.isValidMerchantName(merchant)) return merchant;
      }
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const englishCard = message.match(/Card\s+[X*]*(\d{4})/i);
    if (englishCard) return englishCard[1];

    const arabicCard = message.match(/رقم\s*#(\d{4})/);
    if (arabicCard) return arabicCard[1];

    const lower = message.toLowerCase();

    if (lower.includes('has been debited')) {
      const debitAcct = message.match(/debited\s+from\s+([0-9*]+)/i);
      if (debitAcct) {
        const last4 = this.extractLast4Digits(debitAcct[1]);
        if (last4 !== null) return last4;
      }
    }

    if (lower.includes('has been credited')) {
      const creditAcct = message.match(/credited\s+to\s+([0-9*]+)/i);
      if (creditAcct) {
        const last4 = this.extractLast4Digits(creditAcct[1]);
        if (last4 !== null) return last4;
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    const patterns = [
      /Available\s+balance\s+is\s+[A-Z]{3}\s+([0-9,]+(?:\.\d+)?)/i,
      /Balance\s+([0-9,]+(?:\.\d+)?)\s*(?:JOD|USD|EGP)/i,
      /Balance\s+(?:JOD|USD|EGP)\s+([0-9,]+(?:\.\d+)?)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const value = this.toNumber(match[1]);
        if (value !== null) return value;
      }
    }
    return null;
  }

  protected detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();

    if (
      lower.includes('has been debited') ||
      lower.includes('has been credited') ||
      lower.includes('debited from') ||
      lower.includes('credited to')
    ) {
      return false;
    }

    if (lower.includes('trx using card')) return true;
    if (message.includes('تم قيد') || message.includes('لبطاقتك')) return true;

    return false;
  }
}

export default new ArabBankParser();
