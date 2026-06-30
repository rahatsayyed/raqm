import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';
import { CompiledPatterns } from '../core/CompiledPatterns';

/**
 * Parser for Emirates NBD Bank (UAE) transactions.
 * Handles credit card and account transactions in AED and other currencies.
 * UAE bank logic (from UAEBankParser) is inlined as private helpers.
 */
export class EmiratesNBDParser extends BankParser {

  private static readonly MONTH_ABBREVIATIONS = new Set([
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]);

  getBankName(): string {
    return 'Emirates NBD';
  }

  getCurrency(): string {
    return 'AED';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase().replace(/\s+/g, '');
    return normalizedSender.includes('EMIRATESNBD') ||
      normalizedSender.includes('ENBD') ||
      normalizedSender.includes('EMIRATESNB');
  }

  // ─── UAEBankParser helpers (inlined) ──────────────────────────────────────

  private isMonthAbbreviation(code: string): boolean {
    return EmiratesNBDParser.MONTH_ABBREVIATIONS.has(code.toUpperCase());
  }

  /**
   * Checks if the message contains a credit/debit card purchase pattern.
   * Common across UAE banks (from UAEBankParser).
   */
  protected containsCardPurchase(message: string): boolean {
    return message.toLowerCase().includes('credit card purchase') ||
      message.toLowerCase().includes('debit card purchase');
  }

  /**
   * UAEBankParser extractCurrency logic.
   */
  private uaeExtractCurrency(message: string): string | null {
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
          if (upperVal.length === 3 && /^[A-Z]{3}$/.test(upperVal) && !this.isMonthAbbreviation(upperVal)) {
            return upperVal;
          }
        }
      }
    }

    // Final fallback
    const simplePattern = /\b([A-Z]{3})\s+\d/i;
    const simpleMatch = message.match(simplePattern);
    if (simpleMatch) {
      const code = simpleMatch[1].toUpperCase();
      if (!this.isMonthAbbreviation(code)) return code;
    }

    return null;
  }

  /**
   * UAEBankParser extractAmount logic — generic multi-currency extraction.
   */
  private uaeExtractAmount(message: string): number | null {
    const isoCurrencyPattern = CompiledPatterns.Currency?.ISO_CODE?.source ?? '[A-Z]{3}';
    const patterns: RegExp[] = [
      new RegExp(`(?:purchase of|transfer of|amount|for|of)\\s+(${isoCurrencyPattern})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCurrencyPattern})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCurrencyPattern})\\s+\\*+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();
        if (this.isMonthAbbreviation(currencyCode)) continue;

        let amountStr = match[2].replace(/,/g, '');

        if (amountStr.includes('*')) {
          amountStr = amountStr.replace(/\*/g, '');
          if (amountStr === '' || amountStr === '.') continue;
        }

        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return null;
  }

  /**
   * UAEBankParser extractTransactionType logic.
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
    ) {
      return TransactionType.EXPENSE;
    }
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

  /**
   * UAEBankParser extractBalance fallback logic.
   */
  private uaeExtractBalance(message: string): number | null {
    return super.extractBalance(message);
  }

  /**
   * UAEBankParser extractAvailableLimit fallback logic.
   */
  private uaeExtractAvailableLimit(message: string): number | null {
    return super.extractAvailableLimit(message);
  }

  // ─── isTransactionMessage ─────────────────────────────────────────────────

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    return lowerMessage.includes('purchase of') ||
      lowerMessage.includes('debited') ||
      lowerMessage.includes('credited') ||
      lowerMessage.includes('withdrawn') ||
      lowerMessage.includes('deposited') ||
      lowerMessage.includes('transfer');
  }

  // ─── extractAmount ────────────────────────────────────────────────────────

  protected extractAmount(message: string): number | null {
    // Delegate to UAEBankParser's multi-currency amount extraction
    return this.uaeExtractAmount(message);
  }

  // ─── extractMerchant ──────────────────────────────────────────────────────

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern: "at MERCHANT_NAME. Avl" or "at MERCHANT_NAME$"
    const atMatch = message.match(/at\s+(.+?)(?:\.\s*Avl|$)/i);
    if (atMatch) {
      const merchant = atMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern: "to MERCHANT" for transfers
    const toMatch = message.match(/to\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+\(|$)/i);
    if (toMatch) {
      const merchant = toMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    return null;
  }

  // ─── extractAccountLast4 ─────────────────────────────────────────────────

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;

    // Pattern: "ending 9074"
    const endingMatch = message.match(/ending\s+(\d{4})/i);
    if (endingMatch) {
      return endingMatch[1];
    }

    // Pattern: "A/C xxxx9074"
    const accountMatch = message.match(/[xX]{4}(\d{4})/);
    if (accountMatch) {
      return accountMatch[1];
    }

    return null;
  }

  // ─── extractBalance ──────────────────────────────────────────────────────

  protected extractBalance(message: string): number | null {
    const balancePatterns: RegExp[] = [
      // Pattern 1: "Avl Bal is CURRENCY X,XXX.XX"
      /(?:Avl\s+Bal|Available\s+Balance)(?:\s+is)?\s*([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,
      // Pattern 2: "Available Balance: CURRENCY X,XXX.XX"
      /Available\s+Balance:\s*([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[2].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    // Fallback to UAEBankParser balance extraction
    return this.uaeExtractBalance(message);
  }

  // ─── extractAvailableLimit ────────────────────────────────────────────────

  protected extractAvailableLimit(message: string): number | null {
    const limitPatterns: RegExp[] = [
      // Pattern 1: "Avl Cr. Limit is CURRENCY 30,978.13"
      /Avl\s+Cr\.?\s+Limit(?:\s+is)?\s*([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,
      // Pattern 2: "Available Credit Limit: CURRENCY X,XXX.XX"
      /Available\s+Credit\s+Limit:\s*([A-Z]{3})\s+([\d,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of limitPatterns) {
      const match = message.match(pattern);
      if (match) {
        const limitStr = match[2].replace(/,/g, '');
        const parsed = parseFloat(limitStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    // Fallback to UAEBankParser available limit extraction
    return this.uaeExtractAvailableLimit(message);
  }

  // ─── extractTransactionType ──────────────────────────────────────────────

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Credits / Income
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;

    // Credit card purchases
    if (lowerMessage.includes('purchase of') && lowerMessage.includes('credit card')) {
      return TransactionType.CREDIT;
    }

    // Debits / Expenses
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transfer')) return TransactionType.EXPENSE;

    return this.uaeExtractTransactionType(message);
  }

  // ─── extractCurrency ─────────────────────────────────────────────────────

  protected extractCurrency(message: string): string | null {
    return this.uaeExtractCurrency(message);
  }

  // ─── parse ────────────────────────────────────────────────────────────────

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const transaction = super.parse(smsBody, sender, timestamp);
    if (transaction === null) return null;

    const extractedCurrency = this.uaeExtractCurrency(smsBody);
    if (extractedCurrency !== null) {
      return { ...transaction, currency: extractedCurrency };
    }
    return transaction;
  }
}

export default new EmiratesNBDParser();
