import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Millennium BIM (Mozambique) SMS messages (Portuguese).
 *
 * Amounts use a dot decimal separator (e.g. "1000.00") and currency "MZN".
 * Dates are DD/MM/YY, times HH:MM (24h).
 *
 * Supported formats:
 * - Debit (EXPENSE):
 *   "A conta 123456789 foi debitada no valor de 50.00 MZN as 10:14 do dia 31/05/26. Em caso de duvida, ligue 8003500. Millennium bim"
 * - Credit (INCOME):
 *   "A conta 123456789 recebeu o valor de 1000.00 MZN as 12:16 do dia 26/04/26. Em  caso de duvida, ligue 8003500. Millennium bim"
 * - Debit with commission/fee:
 *   "A conta 123456789 foi debitada no valor de 1000.00 MZN as 12:25 do dia 27/01/26, comissao 30.00 MZN. Em caso de duvida, ligue 8003500. Millennium bim"
 *
 * Portuguese keys:
 * - "foi debitada" = debit  (EXPENSE)
 * - "recebeu"      = credit (INCOME)
 * - "no valor de X MZN" = amount
 * - "comissao X MZN"    = fee (when present)
 * - "A conta NNN"       = account number
 *
 * These messages have no merchant and no balance — that is expected.
 * Only the "foi debitada / recebeu" formats are handled; anything else returns null.
 */
export class MillenniumBimParser extends BankParser {

  getBankName(): string {
    return 'Millennium BIM';
  }

  getCurrency(): string {
    return 'MZN';
  }

  canHandle(sender: string): boolean {
    return sender.toLowerCase() === 'mbim';
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('foi debitada') || lower.includes('recebeu o valor');
  }

  protected extractAmount(message: string): number | null {
    // "no valor de 50.00 MZN" (debit) or "o valor de 1000.00 MZN" (credit)
    const pattern = /\bvalor\s+de\s+([0-9]+\.[0-9]{2})\s*MZN/i;
    const match = message.match(pattern);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('foi debitada')) return TransactionType.EXPENSE;
    if (lower.includes('recebeu o valor')) return TransactionType.INCOME;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "A conta 123456789 ..."
    const pattern = /A\s+conta\s+(\d+)/i;
    const match = message.match(pattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return null;
  }

  protected extractMerchant(_message: string, _sender: string): string | null {
    return null;
  }

  protected extractBalance(_message: string): number | null {
    return null;
  }

  protected extractReference(_message: string): string | null {
    return null;
  }
}

export default new MillenniumBimParser();
