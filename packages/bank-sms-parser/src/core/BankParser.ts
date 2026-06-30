import { CompiledPatterns } from './CompiledPatterns';
import { Constants } from './constants';
import { ParsedTransaction, TransactionType, createParsedTransaction } from './types';

/**
 * Base class for bank-specific message parsers.
 * Each bank should extend this class and implement its specific parsing logic.
 */
export abstract class BankParser {

  /**
   * Returns the name of the bank this parser handles.
   */
  abstract getBankName(): string;

  /**
   * Checks if this parser can handle messages from the given sender.
   */
  abstract canHandle(sender: string): boolean;

  /**
   * Returns the currency used by this bank.
   * Defaults to INR for Indian banks. International banks should override this.
   */
  getCurrency(): string {
    return 'INR';
  }

  /**
   * Parses an SMS message and extracts transaction information.
   * Returns null if the message cannot be parsed.
   */
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

    const rawAccountLast4 = this.extractAccountLast4(smsBody);
    const safeAccountLast4 = rawAccountLast4 !== null
      ? (this.extractLast4Digits(rawAccountLast4) ?? rawAccountLast4)
      : null;

    return createParsedTransaction({
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: safeAccountLast4,
      balance: this.extractBalance(smsBody),
      creditLimit: availableLimit,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency: this.getCurrency(),
    });
  }

  /**
   * Checks if the message is a transaction message (not OTP, promotional, etc.)
   */
  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Skip promotional messages
    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('win ')
    ) {
      return false;
    }

    // Skip payment request messages (common across banks)
    if (
      lowerMessage.includes('has requested') ||
      lowerMessage.includes('payment request') ||
      lowerMessage.includes('collect request') ||
      lowerMessage.includes('requesting payment') ||
      lowerMessage.includes('requests rs') ||
      lowerMessage.includes('ignore if already paid')
    ) {
      return false;
    }

    // Skip merchant payment acknowledgments
    if (lowerMessage.includes('have received payment')) {
      return false;
    }

    // Skip payment reminder/due messages
    if (
      lowerMessage.includes('is due') ||
      lowerMessage.includes('min amount due') ||
      lowerMessage.includes('minimum amount due') ||
      lowerMessage.includes('in arrears') ||
      lowerMessage.includes('is overdue') ||
      lowerMessage.includes('ignore if paid') ||
      (lowerMessage.includes('pls pay') && lowerMessage.includes('min of'))
    ) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'debited', 'credited', 'withdrawn', 'deposited',
      'spent', 'received', 'transferred', 'paid',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  /**
   * Extracts the transaction currency from the message.
   */
  protected extractCurrency(message: string): string | null {
    const currencyPattern = /([A-Z]{3})\s*[0-9,]+(?:\.\d{2})?/i;
    const match = message.match(currencyPattern);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }

  /**
   * Extracts the transaction amount from the message.
   */
  protected extractAmount(message: string): number | null {
    for (const pattern of CompiledPatterns.Amount.ALL_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Extracts the transaction type (INCOME/EXPENSE/INVESTMENT).
   */
  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Check for investment transactions first (highest priority)
    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('deducted')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback')) {
      return TransactionType.INCOME;
    }

    return null;
  }

  /**
   * Checks if the message is for an investment transaction.
   */
  protected isInvestmentTransaction(lowerMessage: string): boolean {
    const investmentKeywords = [
      // Clearing corporations
      'iccl',
      'indian clearing corporation',
      'nsccl',
      'nse clearing',
      'clearing corporation',

      // Auto-pay indicators
      'nach',
      'ach',
      'ecs',

      // Investment platforms
      'groww',
      'zerodha',
      'upstox',
      'kite',
      'kuvera',
      'paytm money',
      'etmoney',
      'coin by zerodha',
      'smallcase',
      'angel one',
      'angel broking',
      '5paisa',
      'icici securities',
      'icici direct',
      'hdfc securities',
      'kotak securities',
      'motilal oswal',
      'sharekhan',
      'edelweiss',
      'axis direct',
      'sbi securities',

      // Investment types
      'mutual fund',
      'sip',
      'elss',
      'ipo',
      'folio',
      'demat',
      'stockbroker',
      'digital gold',
      'sovereign gold',

      // Stock exchanges
      'nse',
      'bse',
      'cdsl',
      'nsdl',
    ];

    return investmentKeywords.some((kw) => lowerMessage.includes(kw));
  }

  /**
   * Extracts merchant/payee information.
   */
  protected extractMerchant(message: string, _sender: string): string | null {
    for (const pattern of CompiledPatterns.Merchant.ALL_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }
    return null;
  }

  /**
   * Extracts transaction reference number.
   */
  protected extractReference(message: string): string | null {
    for (const pattern of CompiledPatterns.Reference.ALL_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Extracts last 4 digits from a raw captured string.
   * Filters to digits only, takes last 4. Returns null if fewer than 3 digits.
   */
  protected extractLast4Digits(raw: string): string | null {
    const digits = raw.split('').filter((c) => /\d/.test(c)).join('');
    const last4 = digits.slice(-4);
    return last4.length >= 3 ? last4 : null;
  }

  /**
   * Extracts last 4 digits of account number.
   */
  protected extractAccountLast4(message: string): string | null {
    for (const pattern of CompiledPatterns.Account.ALL_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const rawCapture = match[1];
        const last4 = this.extractLast4Digits(rawCapture);
        if (last4 !== null && this.isValidAccountLast4(last4, match[0], message)) {
          return last4;
        }
      }
    }
    return null;
  }

  /**
   * Validates that the extracted 4 digits are actually part of an account number,
   * not a date, RRN, or other numeric field.
   */
  private isValidAccountLast4(last4: string, matchedText: string, fullMessage: string): boolean {
    const escapedLast4 = last4.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if it's part of a date pattern
    const datePatterns = [
      new RegExp(`\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`),
      new RegExp(`${escapedLast4}[/-]\\d{1,2}[/-]\\d{1,2}`),
      new RegExp(`\\bon\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
      new RegExp(`\\bdated\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
    ];

    for (const datePattern of datePatterns) {
      if (datePattern.test(fullMessage)) {
        return false;
      }
    }

    // Check if it's a standalone year (2024, 2025, etc.)
    const last4Int = parseInt(last4, 10);
    if (last4Int >= 2000 && last4Int <= 2099) {
      const yearContextPatterns = [
        new RegExp(`\\bon\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
        new RegExp(`\\bdated\\s+.*?${escapedLast4}`, 'i'),
        new RegExp(`${escapedLast4}(?:\\s|$)`),
      ];

      for (const yearPattern of yearContextPatterns) {
        if (yearPattern.test(fullMessage)) {
          const accountBeforeYear = new RegExp(`(?:A\\/c|Account|Acct).{0,25}${escapedLast4}`, 'i');
          if (!accountBeforeYear.test(fullMessage)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Extracts balance after transaction.
   */
  protected extractBalance(message: string): number | null {
    for (const pattern of CompiledPatterns.Balance.ALL_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Extracts credit card available limit from the message.
   * Only ever evaluated for CREDIT messages.
   */
  protected extractAvailableLimit(message: string): number | null {
    const cur = '(?:Rs\\.?|INR|₹)';
    const creditLimitPatterns = [
      new RegExp(`Available\\s+limit\\s+${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Available\\s+limit:?\\s*${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Avl\\s+Lmt:?\\s*${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Avail\\s+Limit:?\\s*${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Available\\s+Credit\\s+Limit:?\\s*${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(?:^|\\s)Limit:?\\s*${cur}\\s*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
    ];

    for (const pattern of creditLimitPatterns) {
      const match = message.match(pattern);
      if (match) {
        const limitStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(limitStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Detects if the transaction is from a card (credit/debit) based on message patterns.
   * First excludes account-related patterns, then checks for actual card patterns.
   */
  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // FIRST: Explicitly exclude account-related patterns - these are NOT cards
    const accountPatterns = [
      'a/c',
      'account',
      'ac ',
      'acc ',
      'saving account',
      'current account',
      'savings a/c',
      'current a/c',
    ];

    for (const pattern of accountPatterns) {
      if (lowerMessage.includes(pattern)) {
        return false;
      }
    }

    // SECOND: Check for actual card-specific patterns
    const cardPatterns = [
      'card ending',
      'card xx',
      'debit card',
      'credit card',
      'card no.',
      'card number',
      'card *',
      'card x',
    ];

    for (const pattern of cardPatterns) {
      if (lowerMessage.includes(pattern)) {
        return true;
      }
    }

    // Check for masked card number patterns with "ending" keyword
    const maskedCardRegex = /(?:xx|XX|\*{2,})?\d{4}/;
    if (lowerMessage.includes('ending') && maskedCardRegex.test(message)) {
      return true;
    }

    return false;
  }

  /**
   * Cleans merchant name by removing common suffixes and noise.
   */
  protected cleanMerchantName(merchant: string): string {
    return merchant
      .replace(CompiledPatterns.Cleaning.TRAILING_PARENTHESES, '')
      .replace(CompiledPatterns.Cleaning.REF_NUMBER_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.DATE_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.UPI_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.TIME_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.TRAILING_DASH, '')
      .replace(CompiledPatterns.Cleaning.PVT_LTD, '')
      .replace(CompiledPatterns.Cleaning.LTD, '')
      .trim();
  }

  /**
   * Validates if the extracted merchant name is valid.
   */
  protected isValidMerchantName(name: string): boolean {
    const commonWords = new Set([
      'USING', 'VIA', 'THROUGH', 'BY', 'WITH', 'FOR', 'TO', 'FROM', 'AT', 'THE',
    ]);

    return (
      name.length >= Constants.Parsing.MIN_MERCHANT_NAME_LENGTH &&
      /[a-zA-Z]/.test(name) &&
      !commonWords.has(name.toUpperCase()) &&
      !/^\d+$/.test(name) &&
      !name.includes('@')
    );
  }

  /**
   * Helper to parse an amount string with optional commas.
   */
  protected parseAmount(raw: string): number {
    return parseFloat(raw.replace(/,/g, '').trim()) || 0;
  }
}
