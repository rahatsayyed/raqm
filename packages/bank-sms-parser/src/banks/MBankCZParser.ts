import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for mBank CZ (Czech Republic) SMS messages.
 *
 * Supported formats:
 * - Card payment: "Nova platba kartou\n100,00 CZK v obchode MERCHANT."
 * - Incoming transfer: "Prichozi platba\n500,00 CZK od odezilatele SENDER."
 * - Outgoing transfer: "Odchozi platba\n250,00 CZK na ucet ACCOUNT."
 *
 * Notes:
 * - Czech uses comma as decimal separator (100,00)
 * - Currency: CZK (Czech Koruna)
 */
export class MBankCZParser extends BankParser {

  getBankName(): string {
    return 'mBank CZ';
  }

  getCurrency(): string {
    return 'CZK';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return (normalized.includes('MBANK') && normalized.includes('CZ')) ||
      normalized === 'MBANK';
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/(\d[\d\s]*(?:,\d{1,2})?)\s*CZK/i);
    if (match) {
      const amountStr = match[1].replace(/ /g, '').replace(',', '.');
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('příchozí')) return TransactionType.INCOME;
    if (lower.includes('nová platba kartou')) return TransactionType.EXPENSE;
    if (lower.includes('odchozí')) return TransactionType.EXPENSE;
    if (lower.includes('výběr')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const storeMatch = message.match(/v obchodě\s+(.+?)\./i);
    if (storeMatch) {
      const merchant = this.cleanMerchantName(storeMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const fromMatch = message.match(/od odesílatele\s+(.+?)\./i);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const toMatch = message.match(/na účet\s+(.+?)\./i);
    if (toMatch) {
      const raw = toMatch[1].trim();
      if (raw.length > 0) return raw;
    }

    return null;
  }

  protected detectIsCard(message: string): boolean {
    return message.toLowerCase().includes('platba kartou');
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('otp') || lower.includes('heslo') || lower.includes('kód')) {
      return false;
    }
    const keywords = ['platba kartou', 'příchozí platba', 'odchozí platba', 'výběr'];
    return keywords.some(kw => lower.includes(kw));
  }
}

export default new MBankCZParser();
