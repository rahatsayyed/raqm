// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

// Shares the "NMB" sender with NMB Bank (Nepal); register before the Nepal parser.
export class NMBTanzaniaParser extends BankParser {
  private readonly amountRegex = /(?:TZS|TSHS?)\s*(?:(?:TZS|TSHS?)\s*)?([0-9][0-9,]*(?:\.\d+)?)/i;

  getBankName(): string {
    return 'NMB Bank Tanzania';
  }

  getCurrency(): string {
    return 'TZS';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('NMB');
  }

  private toNumber(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAmount(message: string): number | null {
    const anchors = ['kiasi cha', 'you have paid', 'umepokea', 'kimetumwa'];

    const lower = message.toLowerCase();
    for (const anchor of anchors) {
      const idx = lower.indexOf(anchor);
      if (idx < 0) continue;
      const region = anchor === 'kimetumwa' ? message : message.substring(idx);
      const match = region.match(this.amountRegex);
      if (match) {
        const value = this.toNumber(match[1]);
        if (value !== null) return value;
      }
    }

    const match = message.match(this.amountRegex);
    if (match) {
      const value = this.toNumber(match[1]);
      if (value !== null) return value;
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('umepokea')) return TransactionType.INCOME;
    if (lower.includes('kimetumwa')) return TransactionType.EXPENSE;
    if (lower.includes('you have paid')) return TransactionType.EXPENSE;
    if (lower.includes('kimetolewa')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const kwenda = message.match(/kwenda\s+(.+?)(?=\s+0?[0-9X]{4,}|\s+Tarehe\b|\.|$)/i);
    if (kwenda) {
      const name = kwenda[1].trim().replace(/\.+$/, '').trim();
      if (name.length > 0 && /[a-zA-Z]/.test(name)) return name;
    }

    const to = message.match(/\bto\s+(.+?)(?:\s+\d{4,})?\s+on\s+/i);
    if (to) {
      const name = to[1].trim();
      if (name.length > 0 && /[a-zA-Z]/.test(name)) return name;
    }

    if (message.toLowerCase().includes('mshiko fasta')) return 'Mshiko Fasta';

    const kupitia = message.match(/kupitia\s+(.+?)(?:\s+\d|\.|$)/i);
    if (kupitia) {
      const channel = kupitia[1].trim().replace(/\.+$/, '').trim();
      if (channel.length > 0 && /[a-zA-Z]/.test(channel)) return channel;
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    const kumb = message.match(/Kumb:\s*([A-Z0-9_]+)/i);
    if (kumb) return kumb[1];

    const leading = message.trim().match(/^([A-Z0-9_]{6,})\./);
    if (leading) return leading[1];

    return null;
  }

  protected extractBalance(_message: string): number | null {
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/inayoishia na\s+([0-9X]{3,})/i);
    if (match) return this.extractLast4Digits(match[1]);
    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (
      lower.includes('otp') ||
      lower.includes('one time password') ||
      lower.includes('verification code')
    ) {
      return false;
    }

    const hasTanzanianCurrency = /\b(?:TZS|TShs?)\s*[0-9]/i.test(message);
    const tanzaniaSignals = [
      'mshiko fasta',
      'nmb pesa',
      'nmb karibu yako',
      'kiasi cha',
      'umepokea',
      'kimetumwa',
      'kimetolewa',
      'kwenda',
    ];
    if (!hasTanzanianCurrency && !tanzaniaSignals.some((s) => lower.includes(s))) return false;

    const transactionVerbs = ['umepokea', 'kimetumwa', 'kimetolewa', 'you have paid'];
    return transactionVerbs.some((v) => lower.includes(v));
  }
}

export default new NMBTanzaniaParser();
