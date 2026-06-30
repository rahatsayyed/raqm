import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

/**
 * Parser for Emirates Islamic Bank (UAE) transactions.
 * Extends BankParser with UAE-specific logic inlined from UAEBankParser.
 *
 * Sender is "EI SMS" for all messages. Handles debit/credit card purchases,
 * ATM withdrawals, telegraphic transfers, online banking transfers, credit
 * card payments and salary deposits.
 *
 * Sample formats (masked):
 *  - Debit/Credit Card Purchase ... Card Ending: 1234 ... At: <merchant> ... Amount: AED 12.34
 *  - Telegraphic Transfer Deducted/Received ... Account: 123XXX12XXX12 ... Amount: AED 12.00
 *  - Payment towards Credit Card ... From Account: 12345XXXXX123 ... Amount: AED 1,123.12
 *  - ATM Withdrawal ... Debit Card Ending: 1234 ... Amount: AED 123.00
 *  - Salary Deposited Account: 123XXX12XXX12 ... Amount: AED 123,123.12
 */
export class EmiratesIslamicParser extends BankParser {

  private static readonly MONTH_ABBREVIATIONS = new Set([
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]);

  getBankName(): string {
    return 'Emirates Islamic';
  }

  getCurrency(): string {
    return 'AED';
  }

  canHandle(sender: string): boolean {
    // Sender is "EI SMS"; normalize by uppercasing and stripping spaces.
    // Match the exact "EISMS" token and the full bank name, but never a bare
    // two-letter "EI" substring (far too broad; would steal other banks' SMS).
    const normalizedSender = sender.toUpperCase().replace(/\s+/g, '');
    return normalizedSender === 'EISMS' ||
      normalizedSender === 'EMIRATESISLAMIC' ||
      normalizedSender === 'EMIRATESISLAMICBANK';
  }

  // ─── UAEBankParser helpers ─────────────────────────────────────────────────

  private isMonthAbbreviation(code: string): boolean {
    return EmiratesIslamicParser.MONTH_ABBREVIATIONS.has(code.toUpperCase());
  }

  protected containsCardPurchase(message: string): boolean {
    return message.toLowerCase().includes('credit card purchase') ||
      message.toLowerCase().includes('debit card purchase');
  }

  // ─── isTransactionMessage ─────────────────────────────────────────────────

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP / verification messages.
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Credit Card payment receipt (sample #5) is a confirmation/duplicate of the
    // "Payment towards Credit Card" debit (sample #3). We classify it as a
    // NON-transaction and return null here to avoid double-counting the payment.
    if (lowerMessage.includes('confirm receipt of your payment')) {
      return false;
    }

    // Emirates Islamic transaction indicators.
    const transactionKeywords = [
      'debit card purchase',
      'credit card purchase',
      'payment towards credit card',
      'telegraphic transfer',
      'atm withdrawal',
      'online banking transfer',
      'salary deposited',
      'deducted',
      'received',
      'deposited',
    ];
    return transactionKeywords.some(kw => lowerMessage.includes(kw));
  }

  // ─── extractTransactionType ───────────────────────────────────────────────

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Income: incoming telegraphic transfers and salary deposits.
    if (lowerMessage.includes('telegraphic transfer received')) return TransactionType.INCOME;
    if (lowerMessage.includes('salary deposited')) return TransactionType.INCOME;

    // Expenses: card purchases (per issue, credit card purchases are EXPENSE too),
    // ATM withdrawals, outgoing transfers and credit-card payments.
    if (lowerMessage.includes('credit card purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debit card purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('payment towards credit card')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('telegraphic transfer deducted')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('online banking transfer')) return TransactionType.EXPENSE;

    // UAE base class fallback
    return this.uaeExtractTransactionType(message);
  }

  /**
   * UAEBankParser extractTransactionType logic used as super-fallback.
   */
  private uaeExtractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credit card purchase')) return TransactionType.CREDIT;
    if (this.containsCardPurchase(message)) return TransactionType.EXPENSE;
    if (lowerMessage.includes('cheque credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('cheque returned')) return TransactionType.EXPENSE;
    if (
      lowerMessage.includes('atm cash withdrawal') ||
      (lowerMessage.includes('atm') && lowerMessage.includes('withdrawn'))
    ) return TransactionType.EXPENSE;
    if (lowerMessage.includes('inward remittance')) return TransactionType.INCOME;
    if (lowerMessage.includes('cash deposit')) return TransactionType.INCOME;
    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('outward remittance')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('payment instructions')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('funds transfer request')) return TransactionType.TRANSFER;
    if (lowerMessage.includes('has been processed')) return TransactionType.EXPENSE;

    if (
      lowerMessage.includes('credit') &&
      !lowerMessage.includes('credit card') &&
      !lowerMessage.includes('debit') &&
      !lowerMessage.includes('purchase') &&
      !lowerMessage.includes('payment')
    ) {
      return TransactionType.INCOME;
    }

    if (lowerMessage.includes('debit') && !lowerMessage.includes('credit')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('payment')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  // ─── extractAmount ────────────────────────────────────────────────────────

  protected extractAmount(message: string): number | null {
    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const CURRENCY_RE = /^[A-Z]{3}$/;

    // Generic multi-currency amount extraction for UAE banks
    // Patterns: "AED 100.00", "USD 50.50", "Amount: AED 12.34", etc.
    const patterns: RegExp[] = [
      /(?:purchase of|transfer of|amount|for|of)\s+([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i,
      /([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i,
      /([A-Z]{3})\s+\*+([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();
        if (
          CURRENCY_RE.test(currencyCode) &&
          !MONTH_RE.test(currencyCode)
        ) {
          let amountStr = match[2].replace(/,/g, '');
          if (amountStr.includes('*')) {
            amountStr = amountStr.replace(/\*/g, '');
            if (amountStr === '' || amountStr === '.') continue;
          }
          const amount = parseFloat(amountStr);
          if (!isNaN(amount)) {
            return Math.round(amount * 100) / 100;
          }
        }
      }
    }

    return super.extractAmount(message);
  }

  // ─── extractMerchant ──────────────────────────────────────────────────────

  protected extractMerchant(message: string, sender: string): string | null {
    // Card purchases use "At: <merchant>" on its own line.
    const atPattern = /At:\s*(.+?)(?:\r?\n|$)/i;
    const atMatch = message.match(atPattern);
    if (atMatch) {
      const merchant = atMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    // ATM withdrawals use "From: <location>" on its own line.
    if (/ATM Withdrawal/i.test(message)) {
      const fromPattern = /From:\s*(.+?)(?:\r?\n|$)/i;
      const fromMatch = message.match(fromPattern);
      if (fromMatch) {
        const location = fromMatch[1].trim();
        if (location.length > 0) {
          return `ATM Withdrawal: ${this.cleanMerchantName(location)}`;
        }
      }
      return 'ATM Withdrawal';
    }

    return super.extractMerchant(message, sender);
  }

  // ─── extractAccountLast4 ─────────────────────────────────────────────────

  protected extractAccountLast4(message: string): string | null {
    // Prefer the card number when present: "Card Ending: 1234" / "Debit Card Ending: 1234".
    const cardEndingPattern = /Card Ending:\s*(\d{3,})/i;
    const cardEndingMatch = message.match(cardEndingPattern);
    if (cardEndingMatch) {
      const result = this.extractLast4Digits(cardEndingMatch[1]);
      if (result !== null) return result;
    }

    // Otherwise use the trailing digits of the masked account number, e.g.
    // "Account: 123XXX12XXX12" or "From Account: 12345XXXXX123".
    const accountPattern = /Account:\s*([X\d]+)/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) {
      const result = this.extractLast4Digits(accountMatch[1]);
      if (result !== null) return result;
    }

    return super.extractAccountLast4(message);
  }

  // ─── extractBalance ──────────────────────────────────────────────────────

  protected extractBalance(message: string): number | null {
    // "Available Balance: AED 12,123.12" and credit-card "Available Limit: AED 123,123.12".
    const balancePattern = /Available\s+(?:Balance|Limit):\s*([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balanceStr = balanceMatch[2].replace(/,/g, '');
      const amount = parseFloat(balanceStr);
      if (!isNaN(amount)) return amount;
    }

    return super.extractBalance(message);
  }

  // ─── extractCurrency ─────────────────────────────────────────────────────

  protected extractCurrency(message: string): string | null {
    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const CURRENCY_RE = /^[A-Z]{3}$/;

    const currencyPatterns: RegExp[] = [
      /Amount\s+([A-Z]{3})/i,
      /\b([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /[A-Z]{3}\s+([A-Z]{3})/i,
    ];

    for (const pattern of currencyPatterns) {
      const match = message.match(pattern);
      if (match) {
        for (let i = 1; i < match.length; i++) {
          const groupVal = match[i];
          if (!groupVal) continue;
          const upperVal = groupVal.toUpperCase();
          if (upperVal.length === 3 && CURRENCY_RE.test(upperVal) && !MONTH_RE.test(upperVal)) {
            return upperVal;
          }
        }
      }
    }

    // Final fallback
    const simpleMatch = message.match(/\b([A-Z]{3})\s+\d/i);
    if (simpleMatch) {
      const code = simpleMatch[1].toUpperCase();
      if (!this.isMonthAbbreviation(code)) return code;
    }

    return null;
  }

  // ─── parse ────────────────────────────────────────────────────────────────

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const transaction = super.parse(smsBody, sender, timestamp);
    if (transaction === null) return null;

    const extractedCurrency = this.extractCurrency(smsBody);
    if (extractedCurrency !== null) {
      return { ...transaction, currency: extractedCurrency };
    }
    return transaction;
  }
}

export default new EmiratesIslamicParser();
