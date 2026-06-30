import { BankParser } from '../core/BankParser';
import { CompiledPatterns } from '../core/CompiledPatterns';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Base abstract class for UAE bank parsers.
 * Handles common patterns across UAE banks (AED currency, specific transaction types, etc.).
 */
export abstract class UAEBankParser extends BankParser {

  /**
   * Checks if the message contains a credit/debit card purchase pattern.
   * Common across UAE banks.
   */
  protected containsCardPurchase(message: string): boolean {
    return (
      message.toLowerCase().includes('credit card purchase') ||
      message.toLowerCase().includes('debit card purchase')
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const transaction = super.parse(smsBody, sender, timestamp);
    if (transaction === null) return null;
    const extractedCurrency = this.extractCurrency(smsBody);
    if (extractedCurrency !== null) {
      return { ...transaction, currency: extractedCurrency };
    }
    return transaction;
  }

  protected extractCurrency(message: string): string | null {
    // Explicit patterns with [A-Z]{3} inlined to avoid compilation issues
    const currencyPatterns = [
      /Amount\s+([A-Z]{3})/i,
      /\b([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      /[A-Z]{3}\s+([A-Z]{3})/i,
    ];

    for (const pattern of currencyPatterns) {
      const found = message.match(pattern);
      if (found !== null) {
        // Check all groups starting from index 1
        for (let i = 1; i < found.length; i++) {
          const groupVal = found[i];
          if (groupVal === undefined || groupVal === null) continue;
          const upperVal = groupVal.toUpperCase();
          if (
            upperVal.length === 3 &&
            /^[A-Za-z]{3}$/.test(upperVal) &&
            !this.isMonthAbbreviation(upperVal)
          ) {
            return upperVal;
          }
        }
      }
    }

    // Final fallback
    const simplePattern = /\b([A-Z]{3})\s+\d/i;
    const simpleMatch = message.match(simplePattern);
    if (simpleMatch !== null) {
      const code = simpleMatch[1].toUpperCase();
      if (!this.isMonthAbbreviation(code)) return code;
    }

    return null;
  }

  getCurrency(): string {
    return 'AED';
  }

  protected extractAmount(message: string): number | null {
    // Generic multi-currency amount extraction for UAE banks
    // Patterns: "AED 100.00", "USD 50.50", "Purchase of EUR 20.00", etc.
    const isoCurrencySource = CompiledPatterns.Currency.ISO_CODE.source;
    const patterns = [
      new RegExp(
        `(?:purchase of|transfer of|amount|for|of)\\s+(${isoCurrencySource})\\s+([0-9,]+(?:\\.\\d{2})?)`,
        'i'
      ),
      new RegExp(`(${isoCurrencySource})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCurrencySource})\\s+\\*+([0-9,]+(?:\\.\\d{2})?)`, 'i'), // Masked amount *123.45
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match !== null) {
        const currencyCode = match[1].toUpperCase();
        // Skip if currency code looks like a month
        if (this.isMonthAbbreviation(currencyCode)) {
          continue;
        }

        let amountStr = match[2].replace(/,/g, '');

        // Handle masked amounts if present (e.g. *123.45 or ***.45)
        if (amountStr.includes('*')) {
          amountStr = amountStr.replace(/\*/g, '');
          if (amountStr === '' || amountStr === '.') continue;
        }

        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAmount(message);
  }

  private isMonthAbbreviation(code: string): boolean {
    const months = new Set(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']);
    return months.has(code);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credit card purchase')) return TransactionType.CREDIT;
    if (this.containsCardPurchase(message)) return TransactionType.EXPENSE;

    // Cheque transactions
    if (lowerMessage.includes('cheque credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('cheque returned')) return TransactionType.EXPENSE;

    // ATM withdrawals are expenses
    if (
      lowerMessage.includes('atm cash withdrawal') ||
      (lowerMessage.includes('atm') && lowerMessage.includes('withdrawn'))
    ) {
      return TransactionType.EXPENSE;
    }

    // Income transactions
    if (lowerMessage.includes('inward remittance')) return TransactionType.INCOME;
    if (lowerMessage.includes('cash deposit')) return TransactionType.INCOME;
    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;

    // Outward remittance and payment instructions are expenses
    if (lowerMessage.includes('outward remittance')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('payment instructions')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('funds transfer request')) return TransactionType.TRANSFER;
    if (lowerMessage.includes('has been processed')) return TransactionType.EXPENSE;

    // Standard keywords
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
}
