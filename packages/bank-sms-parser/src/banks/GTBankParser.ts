// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Guaranty Trust Bank / GTBank (Nigeria) line-based SMS alerts. */
export class GTBankParser extends BankParser {

  getBankName(): string {
    return 'GTBank';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    const upper = sender.toUpperCase();
    return upper.includes('GTBANK') || upper.includes('GTB') || upper.includes('GUARANTY');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /Amt:\s*NGN\s*[0-9,]+(?:\.\d{1,2})?\s*(DR|CR)\b/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const match = message.match(/Amt:\s*NGN\s*[0-9,]+(?:\.\d{1,2})?\s*(DR|CR)\b/i);
    if (!match) return null;
    switch (match[1].toUpperCase()) {
      case 'DR': return TransactionType.EXPENSE;
      case 'CR': return TransactionType.INCOME;
      default: return null;
    }
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
    const match = message.match(/Acct:\s*\**([0-9]+)/i);
    if (!match) return null;
    return this.extractLast4Digits(match[1]);
  }
}

export default new GTBankParser();
