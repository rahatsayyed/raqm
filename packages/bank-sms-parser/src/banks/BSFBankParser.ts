// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for BSF - Banque Saudi Fransi (Saudi Arabia) Arabic transfer SMS messages. */
export class BSFBankParser extends BankParser {

  getBankName(): string {
    return 'Banque Saudi Fransi';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().replace(/[\s\-_]/g, '');
    if (normalized === 'BSF' || normalized.includes('BSFR')) return true;
    if (/(?:^|[^A-Z])BSF(?:[^A-Z]|$)/.test(sender.toUpperCase())) return true;
    if (sender.includes('الفرنسي')) return true;
    return false;
  }

  protected extractAmount(message: string): number | null {
    // Labelled القيمة (value) or مبلغ (amount), never الرسوم (fee)
    const amountLabel = '(?:القيمة|مبلغ)';

    const currencyFirst = message.match(
      new RegExp(`${amountLabel}\\s*:?\\s*SAR\\s*([0-9,]+(?:\\.\\d{1,2})?)`, 'i')
    );
    if (currencyFirst) return this.parseSarAmount(currencyFirst[1]);

    const currencyLast = message.match(
      new RegExp(`${amountLabel}\\s*:?\\s*([0-9,]+(?:\\.\\d{1,2})?)\\s*SAR`, 'i')
    );
    if (currencyLast) return this.parseSarAmount(currencyLast[1]);

    return null;
  }

  private parseSarAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (message.includes('واردة')) return TransactionType.INCOME;
    if (message.includes('صادرة')) return TransactionType.EXPENSE;
    if (message.includes('خصم')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const isIncoming = message.includes('واردة');
    const isOutgoing = message.includes('صادرة');

    if (isOutgoing) {
      const match = message.match(/إلى\s*:?\s*([^\n]+?)(?:\n|$)/);
      if (match) {
        const merchant = this.cleanCounterparty(match[1]);
        if (merchant !== null) return merchant;
      }
    }

    if (isIncoming) {
      const match = message.match(/من\s*:?\s*([^\n]+?)(?:\n|$)/);
      if (match) {
        const merchant = this.cleanCounterparty(match[1]);
        if (merchant !== null) return merchant;
      }
    }

    return null;
  }

  // Rejects purely masked/numeric captures such as account or IBAN fragments
  private cleanCounterparty(raw: string): string | null {
    const value = raw.trim().replace(/[*× \t]+$/, '');
    if (value.trim() === '') return null;
    if (/^[*×\d\s]+$/.test(value)) return null;
    const cleaned = this.cleanMerchantName(value);
    return this.isValidMerchantName(cleaned) ? cleaned : null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/حساب\s*\*+\s*(\d{3,4})/);
    if (match) return this.extractLast4Digits(match[1]);
    // Incoming layout only carries masked IBANs; do not guess digits from them
    return null;
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/آيبان\s*:?\s*([*A-Z0-9]+)/i);
    if (match) {
      const value = match[1].trim();
      if (value !== '') return value;
    }
    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    if (message.includes('رمز') || /otp/i.test(message) || message.includes('كلمة المرور')) {
      return false;
    }
    const keywords = ['حوالة', 'واردة', 'صادرة', 'خصم', 'SAR'];
    return keywords.some((kw) => message.includes(kw));
  }
}

export default new BSFBankParser();
