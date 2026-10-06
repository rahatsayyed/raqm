// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseIranianBankParser } from '../core/BaseIranianBankParser';
import { TransactionType } from '../core/types';

const PATTERN = /([0-9.]+)\s+([+-][0-9,]+)\s+\d{2}\/\d{2}_\d{2}:\d{2}\s+مانده:\s*([0-9,]+)/;

// Pasargad Bank (Wepod) compact "account +amount date مانده: balance" format.
export class PasargadBankParser extends BaseIranianBankParser {
  getBankName(): string {
    return 'Pasargad Bank';
  }

  canHandle(sender: string): boolean {
    return new Set(['B.PASARGAD', 'PASARGAD', 'WEPOD']).has(sender.toUpperCase());
  }

  protected isTransactionMessage(message: string): boolean {
    if (super.isTransactionMessage(message)) return true;

    if (PATTERN.test(message.trim())) {
      const lower = message.toLowerCase();
      const nonTransactional =
        lower.includes('otp') ||
        lower.includes('رمز یکبار مصرف') ||
        lower.includes('کد تایید') ||
        lower.includes('تبلیغ') ||
        lower.includes('پیشنهاد') ||
        lower.includes('تخفیف') ||
        lower.includes('cashback offer') ||
        (lower.includes('درخواست') && lower.includes('پرداخت'));
      return !nonTransactional;
    }
    return false;
  }

  protected extractAmount(message: string): number | null {
    const match = message.trim().match(PATTERN);
    if (!match) return null;
    const parsed = parseFloat(match[2].slice(1).replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const match = message.trim().match(PATTERN);
    if (!match) return null;
    const sign = match[2].charAt(0);
    if (sign === '+') return TransactionType.INCOME;
    if (sign === '-') return TransactionType.EXPENSE;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.trim().match(PATTERN);
    if (!match) return null;
    const pureNumeric = match[1].replace(/\./g, '');
    return pureNumeric.length >= 4 ? pureNumeric.slice(-4) : null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.trim().match(PATTERN);
    if (!match) return null;
    const parsed = parseFloat(match[3].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
}

export default new PasargadBankParser();
