import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction } from '../core/types';

export class BandhanBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Bandhan Bank';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();

    if (s.includes('BANDHAN')) return true;

    if (/^[A-Z]{2}-BDNSMS(?:-S)?$/.test(s)) return true;
    if (/^[A-Z]{2}-BANDHN(?:-S)?$/.test(s)) return true;

    return false;
  }

  extractMerchant(message: string, sender: string): string | null {
    const towardsPattern = /towards\s+([^\.\n]+?)(?:\s+Value|\s+on|\s+dt|\s+at|\.|$)/i;

    const match = message.match(towardsPattern);
    if (match) {
      let merchantRaw = match[1].trim();

      if (merchantRaw.includes('/')) {
        const segments = merchantRaw.split('/').map(s => s.trim()).filter(s => s.length > 0);
        const candidate = segments.slice().reverse().find(segment =>
          segment.length >= 2 &&
          [...segment].some(ch => /[a-zA-Z]/.test(ch)) &&
          segment.toLowerCase() !== 'upi'
        ) ?? (segments[segments.length - 1] ?? null);

        if (candidate !== null) {
          merchantRaw = candidate;
        }
      }

      const cleanedMerchant = this.cleanMerchantName(
        merchantRaw.replace(/\bu\b/gi, '').trim()
      );

      const normalizedMerchant = cleanedMerchant.toLowerCase() === 'interest'
        ? 'Interest'
        : cleanedMerchant;

      if (this.isValidMerchantName(normalizedMerchant)) {
        return normalizedMerchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractReference(message: string): string | null {
    const upiReferencePattern = /UPI\/[A-Z]{2}\/([A-Z0-9]+)/i;

    const match = message.match(upiReferencePattern);
    if (match) {
      return match[1];
    }

    return super.extractReference(message);
  }

  extractBalance(message: string): number | null {
    const clearBalancePattern = /Clear\s+Bal\s+(?:is\s+)?(?:INR\s*)?([0-9,]+(?:\.\d{2})?)/i;

    const match = message.match(clearBalancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      return isNaN(parsed) ? null : parsed;
    }

    return super.extractBalance(message);
  }
}

export default new BandhanBankParser();
