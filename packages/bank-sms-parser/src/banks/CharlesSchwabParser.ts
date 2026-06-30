import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

// Valid ISO 4217 currency codes for validation
const VALID_CURRENCY_CODES = new Set([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
  'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS',
  'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
  'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD',
  'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU',
  'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK',
  'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG',
  'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK',
  'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'STN', 'SVC', 'SYP', 'SZL', 'THB',
  'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX',
  'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF',
  'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
]);

function isValidCurrencyCode(code: string): boolean {
  return VALID_CURRENCY_CODES.has(code);
}

/**
 * Parser for Charles Schwab Bank - handles USD debit card and ATM transactions
 */
export class CharlesSchwabParser extends BankParser {

  getBankName(): string {
    return 'Charles Schwab';
  }

  getCurrency(): string {
    return 'USD';
  }

  extractCurrency(message: string): string | null {
    // Common currency symbol to currency code mapping
    const symbolToCurrencyMap: Record<string, string> = {
      '€': 'EUR',
      '£': 'GBP',
      '₹': 'INR',
      '¥': 'JPY',
      '฿': 'THB',
      '₩': 'KRW',
      '$': 'USD',
      'C$': 'CAD',
      'A$': 'AUD',
      'S$': 'SGD',
      'ብር': 'ETB',
    };

    // Check for currency symbols in the message
    for (const [symbol, currencyCode] of Object.entries(symbolToCurrencyMap)) {
      if (message.includes(symbol)) {
        if (isValidCurrencyCode(currencyCode)) {
          return currencyCode;
        }
      }
    }

    // Extract and validate 3-letter currency codes from pattern like "A USD 25.50"
    const currencyCodePattern = /A\s+([A-Z]{3})\s*[0-9,]+/;
    const currencyCodeMatch = message.match(currencyCodePattern);
    if (currencyCodeMatch) {
      const currencyCode = currencyCodeMatch[1];
      if (isValidCurrencyCode(currencyCode)) {
        return currencyCode;
      }
    }

    // Check for any 3-letter currency codes in the message
    const allCurrencyCodesPattern = /\b([A-Z]{3})\b/g;
    const allMatches = [...message.matchAll(allCurrencyCodesPattern)];
    for (const match of allMatches) {
      const currencyCode = match[1];
      if (isValidCurrencyCode(currencyCode)) {
        return currencyCode;
      }
    }

    return super.extractCurrency(message) ?? 'USD';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Skip non-transaction messages
    if (!this.isTransactionMessage(smsBody)) {
      return null;
    }

    const amount = this.extractAmount(smsBody);
    if (amount === null) {
      return null;
    }

    const type = this.extractTransactionType(smsBody);
    if (type === null) {
      return null;
    }

    // Extract available limit for credit card transactions
    const availableLimit = type === TransactionType.CREDIT
      ? this.extractAvailableLimit(smsBody)
      : null;

    // Use dynamic currency detection for Charles Schwab
    const currency = this.extractCurrency(smsBody) ?? this.getCurrency();

    return createParsedTransaction({
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      creditLimit: availableLimit,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency,
    });
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'SCHWAB' ||
      upperSender.includes('CHARLES SCHWAB') ||
      upperSender.includes('SCHWAB BANK') ||
      upperSender === '24465' ||
      /^[A-Z]{2}-SCHWAB-[A-Z]$/.test(upperSender)
    );
  }

  extractAmount(message: string): number | null {
    // Charles Schwab patterns: "A $7.44 debit card transaction", "A $10.00 debit card transaction", "A $22.07 ACH was debited"
    // Multi-currency support: "A €25.50 debit card transaction", "A £15.75 ATM transaction", "A ฿500.00 ATM transaction"
    const patterns: RegExp[] = [
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+debit card transaction/i,
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+ATM transaction/i,
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+transaction/i,
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+was debited/i,
      /A\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+(?:debit card|ATM)\s+transaction/i,
      // Multi-currency patterns with symbols before amount
      /A\s+([€£₹¥฿₩ብር])\s*([0-9,]+(?:\.[0-9]{2})?)\s+debit card transaction/i,
      /A\s+([€£₹¥฿₩ብር])\s*([0-9,]+(?:\.[0-9]{2})?)\s+ATM transaction/i,
      /A\s+([€£₹¥฿₩ብር])\s*([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+transaction/i,
      /A\s+([€£₹¥฿₩ብር])\s*([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+was debited/i,
      /A\s+([€£₹¥฿₩ብር])\s*([0-9,]+(?:\.[0-9]{2})?)\s+(?:debit card|ATM)\s+transaction/i,
      // Generic currency code patterns
      /A\s+([A-Z]{3})\s*([0-9,]+(?:\.[0-9]{2})?)\s+debit card transaction/i,
      /A\s+([A-Z]{3})\s*([0-9,]+(?:\.[0-9]{2})?)\s+ATM transaction/i,
      /A\s+([A-Z]{3})\s*([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+transaction/i,
      /A\s+([A-Z]{3})\s*([0-9,]+(?:\.[0-9]{2})?)\s+ACH\s+was debited/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match.length > 2 && match[2] !== undefined
          // Multi-currency pattern with currency symbol/code
          ? match[2].replace(/,/g, '')
          // USD pattern with $ symbol
          : match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit card transaction')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm transaction')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('ach transaction')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('ach was debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('was debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transaction was debited')) return TransactionType.EXPENSE;

    return null;
  }

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null) return superResult;

    // Pattern: "account ending xxx" where xxx are last 4 digits
    const patterns: RegExp[] = [
      /account ending (\d{4})/i,
      /account.*ending (\d{4})/i,
      /from account ending (\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip STOP messages
    if (lowerMessage.includes('reply stop to end')) {
      // But still process if it has transaction info
      if (!lowerMessage.includes('transaction') && !lowerMessage.includes('debited')) {
        return false;
      }
    }

    // Charles Schwab specific transaction keywords
    const schwabTransactionKeywords = [
      'debit card transaction was debited',
      'atm transaction was debited',
      'ach was debited',
      'transaction was debited from account',
    ];

    if (schwabTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }

  detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit card transaction')) return true;
    if (lowerMessage.includes('atm transaction')) return true;  // ATM transactions are card-based
    if (lowerMessage.includes('ach transaction')) return false;  // ACH transactions are not card-based

    return super.detectIsCard(message);
  }
}

export default new CharlesSchwabParser();
