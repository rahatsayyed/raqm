// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

const SENDER_PATTERN = /(^|[-.])DTB($|[-.])/;
const ALERT_PATTERN =
  /has been (debited|credited) with TZS\s*([0-9][0-9,]*(?:\.\d+)?)\s+for\s+(.+?)\s+on\s+\d/i;
const TOTAL_PATTERN = /TOTAL\s+TZS\s*([0-9][0-9,]*(?:\.\d+)?)/i;
const TZS_AMOUNT_PATTERN = /TZS\s*([0-9][0-9,]*(?:\.\d+)?)/i;
const REFERENCE_PATTERNS = [
  /Ref\s*No\.?\s*:?\s*([0-9]+)/i,
  /Reference\s*:?\s*([0-9]+)/i,
  /Ref\s*:?\s*([0-9]+)/i,
];

export class DiamondTrustBankParser extends BankParser {
  getBankName(): string {
    return 'Diamond Trust Bank';
  }

  getCurrency(): string {
    return 'TZS';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    if (normalized === 'DTB') return true;
    return SENDER_PATTERN.test(normalized);
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

    if (
      lower.includes('is being processed') ||
      (lower.includes('transfer request for') && lower.includes('has been received'))
    ) {
      return false;
    }

    const isTipsSuccess = lower.includes('has been successfully processed');
    const isAlert = ALERT_PATTERN.test(message);
    const isLuku = lower.includes('luku') && TOTAL_PATTERN.test(message);

    return isTipsSuccess || isAlert || isLuku;
  }

  private toNumber(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAmount(message: string): number | null {
    if (message.toLowerCase().includes('luku')) {
      const total = message.match(TOTAL_PATTERN);
      if (total) return this.toNumber(total[1]);
    }

    const alert = message.match(ALERT_PATTERN);
    if (alert) return this.toNumber(alert[2]);

    const tzs = message.match(TZS_AMOUNT_PATTERN);
    if (tzs) return this.toNumber(tzs[1]);

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const alert = message.match(ALERT_PATTERN);
    if (alert) {
      const direction = alert[1].toLowerCase();
      if (direction === 'debited') return TransactionType.EXPENSE;
      if (direction === 'credited') return TransactionType.INCOME;
      return null;
    }

    const lower = message.toLowerCase();
    if (lower.includes('tips transaction of') || lower.includes('luku')) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const lower = message.toLowerCase();
    if (lower.includes('luku')) return 'LUKU';

    const alert = message.match(ALERT_PATTERN);
    if (alert) {
      const purpose = alert[3].trim();
      if (purpose.length > 0) return this.toTitleCase(purpose);
    }

    if (lower.includes('tips transaction of')) return 'TIPS Transfer';

    return null;
  }

  protected extractReference(message: string): string | null {
    for (const pattern of REFERENCE_PATTERNS) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  // POS and ATM purposes are card transactions; everything else is account-based.
  protected detectIsCard(message: string): boolean {
    const alert = message.match(ALERT_PATTERN);
    if (!alert) return false;
    const purpose = alert[3].toUpperCase();
    return purpose.includes('POS') || purpose.includes('ATM');
  }

  private toTitleCase(text: string): string {
    return text
      .split(/\s+/)
      .map((word) => {
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }
}

export default new DiamondTrustBankParser();
