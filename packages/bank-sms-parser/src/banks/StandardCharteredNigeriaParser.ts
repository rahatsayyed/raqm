// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Standard Chartered Bank Nigeria "Credit Alert!"/"Debit Alert!" SMS messages. */
export class StandardCharteredNigeriaParser extends BankParser {

  getBankName(): string {
    return 'Standard Chartered Bank Nigeria';
  }

  getCurrency(): string {
    return 'NGN';
  }

  canHandle(sender: string): boolean {
    const upper = sender.toUpperCase();
    return upper.includes('SCBANK') ||
      upper.includes('STANCHART') ||
      upper.includes('STANDARDCHARTERED') ||
      upper.includes('STANDARD CHARTERED');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('verification code')) {
      return false;
    }
    return /\b(credit|debit)\s+alert!/i.test(message) && /Amt:\s*NGN/i.test(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    if (/\bcredit\s+alert!/i.test(message)) return TransactionType.INCOME;
    if (/\bdebit\s+alert!/i.test(message)) return TransactionType.EXPENSE;
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
    // Fields share one line, so stop at the next ", Date:" field
    const match = message.match(/Desc:\s*(.+?)(?=,\s*Date:|$)/i);
    if (!match) return null;
    const desc = match[1].trim();
    return desc === '' ? null : desc;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/Acct:\s*x*([0-9]+)/i);
    if (!match) return null;
    return this.extractLast4Digits(match[1]);
  }
}

export default new StandardCharteredNigeriaParser();
