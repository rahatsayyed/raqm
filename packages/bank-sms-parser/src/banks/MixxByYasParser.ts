// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

const TSH_NUMBER = 'TSh\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)';

const AMOUNT_ANCHORS = [
  new RegExp(`Amount\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`Txn\\s+Amt\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`\\bAmt\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`Cash\\s*Out\\s+of\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`Bustisha\\s+Balance\\s+by\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`received\\s+${TSH_NUMBER}`, 'i'),
  /TOTAL\s+([0-9][0-9,]*(?:\.[0-9]+)?)/i,
];

const BALANCE_PATTERNS = [
  new RegExp(`New\\s+balance\\s+is\\s+${TSH_NUMBER}`, 'i'),
  new RegExp(`New\\s+Bal(?:ance)?:?\\s+${TSH_NUMBER}`, 'i'),
];

export class MixxByYasParser extends BankParser {
  getBankName(): string {
    return 'Mixx by Yas';
  }

  getCurrency(): string {
    return 'TZS';
  }

  // Wallet has no stable per-account number, so never mint a last4.
  protected extractAccountLast4(_message: string): string | null {
    return null;
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().replace(/[\s\-_]/g, '');
    return normalized.includes('MIXXBYYAS');
  }

  private toNumber(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAmount(message: string): number | null {
    for (const pattern of AMOUNT_ANCHORS) {
      const match = message.match(pattern);
      if (match) return this.toNumber(match[1]);
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('you have received')) return TransactionType.INCOME;
    if (lower.includes('money sent successfully')) return TransactionType.EXPENSE;
    if (lower.includes('txn amt')) return TransactionType.EXPENSE;
    if (lower.includes('amt tsh')) return TransactionType.EXPENSE;
    if (lower.includes('cash out of')) return TransactionType.EXPENSE;
    if (lower.includes('bustisha balance by')) return TransactionType.EXPENSE;
    if (
      lower.includes('payment successful') ||
      lower.includes('kwh') ||
      lower.includes('ewura')
    ) {
      return TransactionType.EXPENSE;
    }
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const lower = message.toLowerCase();

    if (lower.includes('money sent successfully')) return 'Mobile Money Transfer';
    if (lower.includes('cash out of')) return 'Agent Cash Out';
    if (lower.includes('bustisha')) return 'Bustisha';
    if (lower.includes('kwh') || lower.includes('ewura')) return 'LUKU';
    if (lower.includes('mixx interest')) return 'Mixx Interest';

    const received = message.match(
      /received\s+TSh\s*[0-9,]+(?:\.[0-9]+)?\s+from\s+([A-Za-z0-9 .&]+?)\s*;/i
    );
    if (received) {
      const institution = received[1].trim();
      if (institution.length > 0) return institution;
    }

    const sentTo = message.match(/sent\s+to\s+([A-Za-z0-9 ]+?)\s*\(/i);
    if (sentTo) {
      const payee = sentTo[1].trim();
      if (payee.length > 0) return payee;
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    for (const pattern of BALANCE_PATTERNS) {
      const match = message.match(pattern);
      if (match) return this.toNumber(match[1]);
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    const match = message.match(/Txn\s*ID:?\s*(\d+)/i);
    return match ? match[1] : null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (!lower.includes('tsh') && !lower.includes('payment successful')) return false;

    if (
      lower.includes('otp') ||
      lower.includes('one time password') ||
      lower.includes('verification code') ||
      lower.includes('do not share')
    ) {
      return false;
    }

    // Secondary twin of an outbound transfer; the primary carries the amount.
    if (lower.includes('you have sent') && lower.includes('please wait for confirmation')) {
      return false;
    }

    if (lower.includes('your transaction is successf') && this.extractAmount(message) === null) {
      return false;
    }

    // Legacy Tigo Pesa TIPS formats belong to TigoPesaParser.
    if (lower.includes('from tips.')) return false;

    return true;
  }
}

export default new MixxByYasParser();
