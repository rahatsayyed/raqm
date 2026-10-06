// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Moniepoint MFB (Nigeria) SMS messages with a CREDIT/DEBIT ALERT header. */
export class MoniepointParser extends BankParser {

  getBankName(): string {
    return 'Moniepoint';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    const upper = sender.toUpperCase();
    return upper.includes('MONIEPOINT') || upper.includes('MONNIFY');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /\b(credit|debit)\s+alert\b/i.test(message) && /Amt:\s*NGN/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/\bcredit\s+alert\b/i.test(message)) return TransactionType.INCOME;
    if (/\bdebit\s+alert\b/i.test(message)) return TransactionType.EXPENSE;
    return null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/Amt:\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/\bBal:\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // [ \t]* so an empty "Desc:" line cannot capture the next line
    const match = message.match(/Desc:[ \t]*(.+)/i);
    if (!match) return null;
    const desc = match[1].trim();
    return desc === '' ? null : desc;
  }

  protected extractAccountLast4(message: string): string | null {
    // Digit/asterisk run only, so a trailing "(Personal)" label is not absorbed
    const match = message.match(/Acc:\s*([0-9*]+)/i);
    if (!match) return null;
    return this.extractLast4Digits(match[1]);
  }
}

export default new MoniepointParser();
