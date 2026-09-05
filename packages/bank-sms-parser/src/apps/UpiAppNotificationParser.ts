import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

export interface UpiAppConfig {
  /** Android package name — this is what gets passed as `sender`. */
  packageName: string;
  /** Human display name, stored as the transaction's bankName (e.g. "Google Pay"). */
  appName: string;
}

const AMOUNT = String.raw`(?:₹|Rs\.?|INR)\s?(?<amount>\d[\d,]*(?:\.\d{1,2})?)`;

/**
 * UPI app notification text is short and, across GPay/PhonePe/Paytm/BHIM, almost
 * identical in shape — one shared pattern set covers all four rather than four
 * near-duplicate per-app sets. Add an app-specific set only when a real-world format
 * genuinely diverges. Every pattern is fully anchored: a promotional or
 * payment-request notification that merely *mentions* an amount must not match.
 */
export const UPI_DEBIT_PATTERNS: RegExp[] = [
  new RegExp(`^${AMOUNT}\\s+(?:paid|sent|debited)\\s+to\\s+(?<merchant>.+?)\\s*$`, 'i'),
  new RegExp(`^(?:you\\s+)?(?:paid|sent)\\s+${AMOUNT}\\s+to\\s+(?<merchant>.+?)\\s*$`, 'i'),
  new RegExp(
    `^payment\\s+of\\s+${AMOUNT}\\s+to\\s+(?<merchant>.+?)\\s+(?:is\\s+|was\\s+)?success(?:ful)?\\s*[.!]?\\s*$`,
    'i',
  ),
];

export const UPI_CREDIT_PATTERNS: RegExp[] = [
  new RegExp(`^${AMOUNT}\\s+(?:received|credited)\\s+from\\s+(?<merchant>.+?)\\s*$`, 'i'),
  new RegExp(`^(?:you\\s+)?received\\s+${AMOUNT}\\s+from\\s+(?<merchant>.+?)\\s*$`, 'i'),
];

/** Trailing noise UPI apps append to the counterparty name. */
const MERCHANT_SUFFIXES =
  /\s+(?:via\s+UPI|using\s+UPI|on\s+(?:Google\s+Pay|PhonePe|Paytm|BHIM)|through\s+UPI)\b.*$/i;

export function cleanMerchant(raw: string): string | null {
  const cleaned = raw
    .replace(MERCHANT_SUFFIXES, '')
    .replace(/[.!,;:\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) return null;
  return cleaned.length > 60 ? cleaned.slice(0, 60).trim() : cleaned;
}

/**
 * Parses a bank/UPI app's *notification* text rather than an SMS. Selected by exact
 * package-name match on the `sender` argument, which the notification ingestion path
 * overloads with the posting app's package name (see the design doc). Package names
 * contain dots and lowercase letters and can never collide with a DLT SMS sender ID.
 */
export class UpiAppNotificationParser extends BankParser {
  constructor(private readonly config: UpiAppConfig) {
    super();
  }

  getBankName(): string {
    return this.config.appName;
  }

  getPackageName(): string {
    return this.config.packageName;
  }

  canHandle(sender: string): boolean {
    return sender === this.config.packageName;
  }

  /**
   * Fully overrides BankParser.parse — the base implementation's extractors are tuned
   * for long bank SMS bodies (account digits, balances, DLT footers), none of which a
   * two-clause notification line has.
   */
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const line = smsBody.trim();
    if (line.length === 0) return null;

    const groups: Array<[RegExp[], TransactionType]> = [
      [UPI_DEBIT_PATTERNS, TransactionType.EXPENSE],
      [UPI_CREDIT_PATTERNS, TransactionType.INCOME],
    ];

    for (const [patterns, type] of groups) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match?.groups?.amount) continue;

        const amount = parseFloat(match.groups.amount.replace(/,/g, ''));
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const merchant = match.groups.merchant ? cleanMerchant(match.groups.merchant) : null;
        if (merchant === null) continue;

        return createParsedTransaction({
          amount,
          type,
          merchant,
          reference: null,
          accountLast4: null,
          balance: null,
          smsBody: line,
          sender,
          timestamp,
          bankName: this.config.appName,
          currency: 'INR',
          isFromCard: false,
        });
      }
    }

    return null;
  }
}
