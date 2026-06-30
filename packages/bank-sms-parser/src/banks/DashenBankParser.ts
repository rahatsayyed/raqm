import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Dashen Bank - handles ETB currency transactions
 */
export class DashenBankParser extends BankParser {

  getBankName(): string {
    return 'Dashen Bank';
  }

  getCurrency(): string {
    return 'ETB'; // Ethiopian Birr
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().trim();
    return normalized === 'DASHENBANK';
  }

  /**
   * Extracts the transaction amount. Always picks the first ETB amount, not the balance.
   */
  extractAmount(message: string): number | null {
    const amountPattern = /ETB\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const match = message.match(amountPattern);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      return this.parseScaledAmount(raw);
    }

    return super.extractAmount(message);
  }

  /**
   * Extracts transaction type from Dashen Bank messages.
   */
  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('you have received')) return TransactionType.INCOME;

    if (lowerMessage.includes('has been debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited from')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // 1) Telebirr account (expense) - "credited to the Telebirr account +251922222222"
    const telebirrToPattern = /credited to the (Telebirr account [+\d]+)/i;
    const telebirrToMatch = message.match(telebirrToPattern);
    if (telebirrToMatch) {
      const merchant = telebirrToMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    // 2) Transfer credit - "from PERSON NAME on on"
    const fromPersonPattern = /from\s+([A-Z][A-Z\s]*?)\s+on\s+on/i;
    const fromPersonMatch = message.match(fromPersonPattern);
    if (fromPersonMatch) {
      const merchant = fromPersonMatch[1].trim();
      if (merchant.length > 0 && this.isValidMerchantName(merchant)) return merchant;
    }

    // 3) Telebirr account (income) - "from telebirr account number 251922222222 Ref"
    const telebirrFromPattern = /from\s+(telebirr account number \d+\s)Ref/i;
    const telebirrFromMatch = message.match(telebirrFromPattern);
    if (telebirrFromMatch) {
      const merchant = telebirrFromMatch[1];
      if (merchant.length > 0) return merchant;
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) return parentResult;

    // Dashen masks accounts as "5387********011" or "5387*****9011"
    // Capture full masked string, filter to digits, take last 4
    const pattern = /(\d{4}\*+\d+)/i;
    const match = message.match(pattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // 1) "Your current balance is ETB 1,846.06"
    const currentBalancePattern = /Your\s+current\s+balance\s+is\s+ETB\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const currentBalanceMatch = message.match(currentBalancePattern);
    if (currentBalanceMatch) {
      return this.parseScaledAmount(currentBalanceMatch[1]);
    }

    // 2) "Your account balance is ETB 543.49"
    const accountBalancePattern = /Your\s+account\s+balance\s+is\s+ETB\s+([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const accountBalanceMatch = message.match(accountBalancePattern);
    if (accountBalanceMatch) {
      return this.parseScaledAmount(accountBalanceMatch[1]);
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // 1) Receipt URL - "https://receipt.dashensuperapp.com/receipt/..."
    const receiptUrlPattern = /(https:\/\/receipt\.dashensuperapp\.com\/receipt\/[^\s]+)/i;
    const receiptUrlMatch = message.match(receiptUrlPattern);
    if (receiptUrlMatch) {
      return receiptUrlMatch[1];
    }

    // 2) "Ref No:2209012000164277"
    const refNoPattern = /Ref\s+No:(\d+)/i;
    const refNoMatch = message.match(refNoPattern);
    if (refNoMatch) {
      return refNoMatch[1];
    }

    return super.extractReference(message);
  }

  private parseScaledAmount(rawAmount: string): number | null {
    const normalized = rawAmount.replace(/,/g, '');
    const value = parseFloat(normalized);
    if (isNaN(value)) return null;
    return Math.round(value * 100) / 100;
  }
}

export default new DashenBankParser();
