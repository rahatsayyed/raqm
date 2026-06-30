import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Sparkasse Rhein-Maas (Germany) SMS notifications.
 *
 * Sender: "Sparkasse"
 * Currency: EUR
 *
 * Supported message types ("Wecker" = alarm / push notification):
 *  - Kartenwecker      -> card purchase (EXPENSE), signed negative amount.
 *      Kartenwecker:
 *      1 neuer Kartenumsatz auf dem Konto *NNNN:
 *      MERCHANT: -70,85 EUR
 *      Neuer Saldo: 991,84 EUR
 *      Ihre Sparkasse
 *
 *  - Gehaltswecker     -> salary credit (INCOME), unsigned amount.
 *      Gehaltswecker:
 *      Gehalt ist auf Konto *NNNN eingegangen:
 *      SOURCE: 1.415,62 EUR
 *      Neuer Saldo: 1.415,67 EUR
 *      Ihre Sparkasse
 *
 *  - Kontostandswecker -> pure balance notification, no transaction amount/merchant.
 *      Rejected via isTransactionMessage so the base parse() returns null.
 *
 * Notes on number formatting (German locale):
 *  - `.` is the thousands separator, `,` is the decimal separator.
 *  - Strip `.` and replace `,` with `.` before parsing.
 */

// Matches "[+/-]<german-number> EUR" anywhere on the line.
// Group 1: optional sign. Group 2: the numeric body (with German separators).
const TRANSACTION_AMOUNT_REGEX = /([+-])?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*EUR/i;

// "Neuer Saldo: 991,84 EUR" or "Neuer Saldo 991,84 EUR"
const BALANCE_REGEX = /Neuer\s+Saldo:?\s*([+-]?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*EUR/i;

// "Konto *1832" - capture the digits after the asterisk.
const ACCOUNT_REGEX = /Konto\s*\*+\s*(\d{3,})/i;

export class SparkasseRheinMaasParser extends BankParser {

  getBankName(): string {
    return 'Sparkasse Rhein-Maas';
  }

  getCurrency(): string {
    return 'EUR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('SPARKASSE');
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    // Skip OTP / verification codes if they ever appear.
    if (
      lower.includes('otp') ||
      (lower.includes('tan') && lower.includes('code')) ||
      lower.includes('verifizierungscode')
    ) {
      return false;
    }

    // Kontostandswecker = balance-only push, no parseable transaction.
    if (lower.includes('kontostandswecker')) {
      return false;
    }

    // Must be one of the known transaction "Wecker" variants.
    return lower.includes('kartenwecker') || lower.includes('gehaltswecker');
  }

  extractAmount(message: string): number | null {
    // Find the first transaction line of the form "<label>: [+/-]<number> EUR"
    // and explicitly skip the "Neuer Saldo:" balance line.
    const transactionLine = this.findTransactionLine(message);
    if (transactionLine === null) return null;
    const amountMatch = transactionLine.match(TRANSACTION_AMOUNT_REGEX);
    if (amountMatch === null) return null;
    const raw = amountMatch[2];
    return this.parseGermanNumber(raw);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('gehaltswecker')) {
      return TransactionType.INCOME;
    }

    // Fall back to the sign on the amount line.
    const transactionLine = this.findTransactionLine(message);
    if (transactionLine !== null) {
      const signMatch = transactionLine.match(TRANSACTION_AMOUNT_REGEX);
      const sign = signMatch?.[1];
      if (sign === '+') return TransactionType.INCOME;
      if (sign === '-') return TransactionType.EXPENSE;
    }

    if (lower.includes('kartenwecker')) {
      return TransactionType.EXPENSE;
    }
    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    const transactionLine = this.findTransactionLine(message);
    if (transactionLine === null) return null;
    // Merchant is everything before the colon on the transaction line.
    const colonIdx = transactionLine.indexOf(':');
    if (colonIdx <= 0) return null;
    const candidate = transactionLine.substring(0, colonIdx).trim();
    const cleaned = this.cleanMerchantName(candidate);
    return this.isValidMerchantName(cleaned) ? cleaned : null;
  }

  extractAccountLast4(message: string): string | null {
    // Pattern: "Konto *1832"
    const match = message.match(ACCOUNT_REGEX);
    if (match !== null) {
      return this.extractLast4Digits(match[1]);
    }
    return super.extractAccountLast4(message);
  }

  extractBalance(message: string): number | null {
    const match = message.match(BALANCE_REGEX);
    if (match !== null) {
      return this.parseGermanNumber(match[1]);
    }
    return null;
  }

  detectIsCard(message: string): boolean {
    return (
      message.toLowerCase().includes('kartenwecker') ||
      message.toLowerCase().includes('kartenumsatz')
    );
  }

  /**
   * Returns the first non-balance line that contains a `<label>: <amount> EUR` payload.
   */
  private findTransactionLine(message: string): string | null {
    for (const rawLine of message.split('\n')) {
      const line = rawLine.trim();
      if (line.length === 0) continue;
      if (line.toLowerCase().startsWith('neuer saldo')) continue;
      if (TRANSACTION_AMOUNT_REGEX.test(line)) {
        return line;
      }
    }
    return null;
  }

  private parseGermanNumber(raw: string): number | null {
    // German format: "1.415,62" -> "1415.62"; "70,85" -> "70.85"
    const normalized = raw
      .replace(/\./g, '')
      .replace(/,/g, '.');
    const result = parseFloat(normalized);
    return isNaN(result) ? null : result;
  }
}

export default new SparkasseRheinMaasParser();
