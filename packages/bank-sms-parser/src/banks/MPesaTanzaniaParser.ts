import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

const CUR = '(?:TZS|Tshs|Tsh)';
const AMT = '([0-9,]+(?:\\.[0-9]{1,2})?)';
const CURRENCY_REGEX = new RegExp(CUR, 'i');

const AMOUNT_PATTERNS = [
  new RegExp(`Umepokea\\s+${CUR}\\s*${AMT}`, 'i'),
  new RegExp(`received(?:\\s+a\\s+payment\\s+of)?\\s+${CUR}\\s*${AMT}`, 'i'),
  new RegExp(`Withdraw\\s+${CUR}\\s*${AMT}`, 'i'),
  new RegExp(`${CUR}\\s*${AMT}\\s+(?:sent|paid)\\s+to`, 'i'),
  new RegExp(`${CUR}\\s*${AMT}\\s+has\\s+been\\s+deducted`, 'i'),
  new RegExp(`${CUR}\\s*${AMT}`, 'i'),
];

const AMOUNT_TAIL = `${CUR}\\s*[0-9,]+(?:\\.[0-9]{1,2})?`;

// Sender IDs are shared with Kenya M-Pesa; differentiation is by Tsh/TZS currency in the body.
export class MPesaTanzaniaParser extends BankParser {
  getBankName(): string {
    return 'M-Pesa Tanzania';
  }

  getCurrency(): string {
    return 'TZS';
  }

  // Wallet SMS carry no stable per-account number, so never mint a last4.
  protected extractAccountLast4(_message: string): string | null {
    return null;
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('MPESA') ||
      normalizedSender.includes('M-PESA') ||
      normalizedSender === 'MPESA' ||
      normalizedSender === 'M-PESA' ||
      normalizedSender.includes('VODACOM');
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!CURRENCY_REGEX.test(smsBody)) return null;

    if (this.isThinReceiptDuplicate(smsBody)) return null;

    const parsed = super.parse(smsBody, sender, timestamp);
    if (parsed === null) return null;

    // Reference-based hash dedups the English/Swahili TIPS twins that share a transaction id.
    const reference = parsed.reference;
    if (reference && reference.trim().length > 0) {
      return { ...parsed, transactionHash: `mpesa-tz:${reference}` };
    }
    return parsed;
  }

  // "<NAME> has received Tsh ..." with no balance is a spurious echo of an outbound transfer.
  private isThinReceiptDuplicate(message: string): boolean {
    return message.toLowerCase().includes('has received') && this.extractBalance(message) === null;
  }

  protected extractAmount(message: string): number | null {
    for (const pattern of AMOUNT_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();

    if (lower.includes('umepokea')) return TransactionType.INCOME;
    if (lower.includes('you have received')) return TransactionType.INCOME;
    if (lower.includes('received a payment')) return TransactionType.INCOME;
    if (lower.includes('received tsh')) return TransactionType.INCOME;
    if (lower.includes('received tzs')) return TransactionType.INCOME;

    if (lower.includes('sent to')) return TransactionType.EXPENSE;
    if (lower.includes('paid to')) return TransactionType.EXPENSE;
    if (lower.includes('withdraw')) return TransactionType.EXPENSE;
    if (lower.includes('deducted')) return TransactionType.EXPENSE;

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    if (new RegExp(`Withdraw\\s+${CUR}`, 'i').test(message)) return 'Agent Withdrawal';

    const repayment = message.match(/repayment of\s+(.+?)\s+service/i);
    if (repayment) {
      const merchant = repayment[1].trim();
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const candidates: Array<{ regex: RegExp; post?: (s: string) => string }> = [
      { regex: /sent to business\s+(.+?)(?:\s+on\s+\d|\s+for\s+account|\s+Total\s+fee|$)/i },
      { regex: /sent to\s+(.+?)\s+for\s+account/i },
      { regex: /sent to\s+(.+?)(?:\s*\(|\s+on\s+\d|\s+Total\s+fee|$)/i },
      { regex: /paid to\s+(.+?)(?:\s+for\s+account|\s+on\s+\d|\s*\(Merchant|\s+and\s+charged|$)/i },
      {
        regex: new RegExp(`received\\s+a\\s+payment\\s+of\\s+${AMOUNT_TAIL}\\s+from\\s+(.+?)(?:\\s+on\\s+\\d|$)`, 'i'),
        post: (s) => s.trim().replace(/^\d+\s*-\s*/, '').trim(),
      },
      { regex: /kutoka\s+(.+?)(?:\s*,|\s+Akaunti|\s+tarehe|$)/i },
      {
        regex: new RegExp(`received\\s+${AMOUNT_TAIL}\\s+from\\s+(.+?)(?:\\s*\\(|\\s+on\\s+\\d|$)`, 'i'),
      },
    ];

    for (const { regex, post } of candidates) {
      const match = message.match(regex);
      if (match) {
        const raw = post ? post(match[1]) : match[1];
        const merchant = this.cleanTzMerchant(raw);
        if (this.isValidMerchantName(merchant)) return merchant;
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(
      new RegExp(`(?:New M-Pesa balance is|Balance is)\\s+${CUR}\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i')
    );
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    const txnId = message.match(/^\s*([A-Z0-9]{8,12})\s+(?:Confirmed|confirmed|imethibitishwa)/i);
    if (txnId) return txnId[1];

    const tips = message.match(/TIPS\s+Reference[:\s]+([A-Z0-9]+)/i);
    if (tips) return tips[1];

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (!lower.includes('confirmed') && !lower.includes('imethibitishwa')) return false;
    if (!CURRENCY_REGEX.test(message)) return false;

    const transactionKeywords = [
      'umepokea',
      'received',
      'sent to',
      'paid to',
      'withdraw',
      'deducted',
      'new m-pesa balance',
      'balance is',
    ];

    return transactionKeywords.some((keyword) => lower.includes(keyword));
  }

  private cleanTzMerchant(raw: string): string {
    return raw
      .replace(/\s*\(.*?\)\s*$/, '')
      .replace(/\s+on\s+\d.*/i, '')
      .replace(/\s+tarehe\s+\d.*/i, '')
      .replace(/\s+for\s+account.*/i, '')
      .replace(/\s+Total\s+fee.*/i, '')
      .replace(/\s*,.*$/, '')
      .replace(/\.\s*$/, '')
      .replace(/\s*-\s*$/, '')
      .trim();
  }
}

export default new MPesaTanzaniaParser();
