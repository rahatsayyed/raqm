import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for CRDB Bank (Tanzania).
 *
 * CRDB sends bilingual Swahili/English SMS across several transaction types.
 * Default currency is Tanzanian Shilling (TZS), but some card payments are
 * billed in a foreign currency (e.g. USD) while the balance stays in TZS.
 * For those, the transaction amount/currency reflect the foreign spend and
 * the balance reflects the TZS figure (see parse()).
 *
 * Supported formats:
 * - ATM withdrawal (English): "... has been withdrawn using a Card ... Balance is TZS ..."
 * - Card payment / POS / online (English): "Paid:MERCHANT ... CCY 9.99 Card:... Bal:TZS..."
 * - Mobile money send (Swahili): "Muamala umefanikiwa TZS40000 AIRTEL kwenda NAME phone"
 * - Bill payment / utility (Swahili): "Malipo yamekamilika MERCHANT TZS 2000"
 */
export class CrdbBankParser extends BankParser {

  getBankName(): string {
    return 'CRDB Bank';
  }

  getCurrency(): string {
    return 'TZS';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('CRDB');
  }

  /**
   * Override parse to surface per-transaction foreign currency.
   *
   * The base extractAmount() already picks the spent amount (e.g. USD 9.99 for the
   * Netflix card-payment form). Here we detect when that amount is billed in a
   * non-TZS currency and copy it onto the transaction, while extractBalance()
   * keeps reporting the TZS balance figure.
   */
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const transaction = super.parse(smsBody, sender, timestamp);
    if (transaction === null) return null;
    const currency = this.extractCurrency(smsBody);
    if (currency !== null && currency !== this.getCurrency()) {
      return { ...transaction, currency };
    }
    return transaction;
  }

  /**
   * Detects the currency of the SPENT amount (not the balance).
   *
   * Card-payment form: "Paid:NETFLIX.COM, NL USD 9.99 Card:... Bal:TZS923041.06"
   * The currency we want is the one immediately preceding the amount after "Paid:".
   */
  protected extractCurrency(message: string): string | null {
    // Currency + amount right before "Card:" in the card-payment form.
    const paidCurrencyPattern = /Paid:.*?\b([A-Z]{3})\s*[0-9][0-9,]*(?:\.\d{1,2})?\s*Card:/i;
    const paidCurrencyMatch = message.match(paidCurrencyPattern);
    if (paidCurrencyMatch !== null) {
      const code = paidCurrencyMatch[1].toUpperCase();
      if ([...code].every(c => /[a-zA-Z]/.test(c))) return code;
    }
    return null;
  }

  protected extractAmount(message: string): number | null {
    // Card-payment form: amount sits between the merchant and "Card:".
    // e.g. "Paid:NETFLIX.COM, NL USD 9.99 Card:..." -> 9.99
    const paidPattern = /Paid:.*?\b[A-Z]{3}\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*Card:/i;
    const paidMatch = message.match(paidPattern);
    if (paidMatch !== null) {
      const amount = this.parseAmountLocal(paidMatch[1]);
      if (amount !== null) return amount;
    }

    // LUKU token form: the TOTAL line wins over the Cost/VAT/EWURA/REA figures.
    const totalMatch = message.match(/TOTAL\s+TZS\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
    if (totalMatch !== null) {
      const amount = this.parseAmountLocal(totalMatch[1]);
      if (amount !== null) return amount;
    }

    // "TZS 50000.00" (with space) or "TZS40000" (no space).
    const tzsPattern = /TZS\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
    // Use the FIRST TZS amount that is not the balance.
    for (const match of [...message.matchAll(tzsPattern)]) {
      // Skip the balance figure ("Balance is TZS ..." / "Bal:TZS...").
      const matchIndex = match.index ?? 0;
      const precedingText = message.substring(0, matchIndex).slice(-20).toLowerCase();
      if (precedingText.includes('bal')) continue;
      const amount = this.parseAmountLocal(match[1]);
      if (amount !== null) return amount;
    }

    return super.extractAmount(message);
  }

  private parseAmountLocal(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();

    // Keywords are tiered by signal strength so weaker directional words ("kwenda",
    // "received") can't override an unambiguous first-person verb. A deposit SMS may
    // also contain "kwenda" ("to"), and a send confirmation may mention the recipient
    // having "received" — the tiering resolves both correctly.
    if (lower.includes('umepokea')) return TransactionType.INCOME;             // you received
    if (lower.includes('umefanikiwa kutuma')) return TransactionType.EXPENSE;  // you sent
    if (lower.includes('umetuma')) return TransactionType.EXPENSE;             // you sent

    // Tier 2 — strong action verbs.
    if (lower.includes('withdrawn')) return TransactionType.EXPENSE;           // ATM withdrawal
    if (lower.includes('paid:')) return TransactionType.EXPENSE;               // card payment
    if (lower.includes('malipo yamekamilika')) return TransactionType.EXPENSE; // payment completed
    if (lower.includes('imelipwa')) return TransactionType.EXPENSE;            // has been paid

    // Tier 3 — weaker income hints.
    if (lower.includes('received')) return TransactionType.INCOME;
    if (lower.includes('deposited')) return TransactionType.INCOME;

    // Tier 4 — weak directional marker (only reached when nothing stronger matched).
    if (lower.includes('kwenda')) return TransactionType.EXPENSE;              // "to" (transfer)

    // Fallback — generic "transaction successful", defaults to expense to match
    // all provided send/payment samples.
    if (lower.includes('muamala umefanikiwa')) return TransactionType.EXPENSE;

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Card-payment form: "Paid:NETFLIX.COM, NL USD 9.99 Card:..."
    // Merchant is everything after "Paid:" up to the currency+amount.
    const paidMerchantPattern = /Paid:\s*(.+?)\s+[A-Z]{3}\s*[0-9]/i;
    const paidMerchantMatch = message.match(paidMerchantPattern);
    if (paidMerchantMatch !== null) {
      const merchant = paidMerchantMatch[1].trim().replace(/,+$/, '').trim();
      if (merchant.length > 0) return merchant;
    }

    // ATM withdrawal.
    if (/withdrawn using a Card/i.test(message)) {
      return 'ATM Withdrawal';
    }

    // Recipient stops at the first digit or label; "kwenda LIPA <merchant>" drops the LIPA prefix.
    const kwendaPattern =
      /kwenda\s+(?:LIPA\s+)?(.+?)(?=\s+(?:\d|[0-9X*]{4,}|AC\b|A\/C\b|Risiti\b|REF\b|Balance\b|Bal\b)|[.,]|$)/i;
    const kwendaMatch = message.match(kwendaPattern);
    if (kwendaMatch !== null) {
      const merchant = kwendaMatch[1].trim().replace(/[.,]+$/, '').trim();
      if (merchant.length > 0 && merchant.toLowerCase() !== 'akaunti yako') return merchant;
    }

    // LUKU token forms carry no merchant name, only a TOKEN.
    if (/Malipo yamekamilika/i.test(message) && (/TOKEN/i.test(message) || /KWH/i.test(message))) {
      return 'LUKU';
    }

    // Bill payment / utility (Swahili): "Malipo yamekamilika TOTAL TZS 2000".
    // Merchant is the text between the completion phrase and the amount.
    const billPattern = /Malipo yamekamilika\s+(.+?)\s+TZS/i;
    const billMatch = message.match(billPattern);
    if (billMatch !== null) {
      const merchant = billMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }
    if (/Malipo yamekamilika/i.test(message)) {
      return 'Bill Payment';
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    const risiti = message.match(/Risiti:\s*([A-Za-z0-9-]+)/i);
    if (risiti !== null) return risiti[1].trim();

    const generic = super.extractReference(message);
    if (generic !== null) return generic;

    const kumb = message.match(/KUMB:\s*([A-Za-z0-9]+)/i);
    if (kumb !== null) return kumb[1].trim();

    return null;
  }

  protected detectIsCard(message: string): boolean {
    if (/\bCard:?\s*[0-9*X]{4,}/i.test(message)) return true;
    return super.detectIsCard(message);
  }

  protected extractBalance(message: string): number | null {
    // "Balance is TZS 550070.90" or "Bal:TZS923041.06".
    const patterns = [
      /Balance is\s+TZS\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
      /Bal:\s*TZS\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match !== null) {
        const amount = this.parseAmountLocal(match[1]);
        if (amount !== null) return amount;
      }
    }
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // Card number form: "Card 4232***0581" / "Card:4232***0581".
    const cardPattern = /Card:?\s*([0-9*]{4,})/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch !== null) {
      const last4 = this.extractLast4Digits(cardMatch[1]);
      if (last4 !== null) return last4;
    }

    // Account-number labels (Swahili + English).
    const accountPattern = /(?:akaunti yako nambari|bank account|account|AC No\.?)[:\s]*([0-9*]{4,})/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch !== null) {
      const last4 = this.extractLast4Digits(accountMatch[1]);
      if (last4 !== null) return last4;
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    // Reject OTP / promotional noise.
    if (
      lower.includes('otp') ||
      lower.includes('one time password') ||
      lower.includes('verification code') ||
      lower.includes('namba ya siri')
    ) {
      return false;
    }

    // Accept both English and Swahili transaction markers.
    const markers = [
      'withdrawn',
      'paid:',
      'muamala umefanikiwa',
      'umefanikiwa kutuma',
      'umetuma',
      'malipo yamekamilika',
      'imelipwa',
      'kwenda',
      'umepokea',
      'received',
      'deposited',
    ];

    return markers.some(marker => lower.includes(marker));
  }
}

export default new CrdbBankParser();
