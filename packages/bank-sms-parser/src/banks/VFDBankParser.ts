// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for VFD Microfinance Bank (Nigeria) line-based SMS alerts. */
export class VFDBankParser extends BankParser {

  getBankName(): string {
    return 'VFD Microfinance Bank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('VFD');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /Amt:\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*(DR|CR)\b/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const match = message.match(/Amt:\s*N\s*[0-9,]+(?:\.\d{1,2})?\s*(DR|CR)\b/i);
    if (!match) return null;
    switch (match[1].toUpperCase()) {
      case 'DR': return TransactionType.EXPENSE;
      case 'CR': return TransactionType.INCOME;
      default: return null;
    }
  }

  protected extractAmount(message: string): number | null {
    // Anchored to "Amt:" so the "Chgs:" fee is never picked up
    const match = message.match(/Amt:\s*N\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Balance:\s*N\s*([0-9,]+(?:\.\d{1,2})?)/i);
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
    // Masked as "xxx348", only 3 digits exposed
    const match = message.match(/Acct:\s*x*([0-9]+)/i);
    if (!match) return null;
    return this.extractLast4Digits(match[1]);
  }
}

export default new VFDBankParser();
