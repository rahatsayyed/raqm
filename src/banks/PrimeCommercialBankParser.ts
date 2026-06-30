import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

export class PrimeCommercialBankParser extends BankParser {
  getBankName(): string {
    return 'Prime Commercial Bank';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase().replace(/-/g, '_');
    return (
      normalizedSender.includes('PCBLNPKA') ||
      normalizedSender === 'PRIME_ALERT' ||
      normalizedSender.includes('PRIME')
    );
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/NPR\s+([0-9,]+\.\d{2})/i);
    if (!match?.[1]) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lower.includes('deposited')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const match = message.match(/Rmk:\s*([^.\s]+)/i);
    return match?.[1]?.trim() ?? null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/#(\d{4})/);
    return match?.[1] ?? null;
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/\bon\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\b/i);
    return match?.[1] ?? null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('npr') && (lower.includes('withdrawn') || lower.includes('deposited'));
  }
}

export default new PrimeCommercialBankParser();
