import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Mashreq Bank - UAE
 * Handles AED currency and Mashreq NEO card transactions
 *
 * Example SMS format:
 * "Thank you for using NEO VISA Debit Card Card ending XXXX for AED 5.99 at CARREFOUR on 26-AUG-2025 10:25 PM. Available Balance is AED X,480.15"
 */
export class MashreqBankParser extends BankParser {

  getBankName(): string {
    return 'Mashreq Bank';
  }

  // Currency defaults to AED

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

    // Extract currency from message or use default AED
    const currency = this.extractCurrency(smsBody) ?? 'AED';

    // Extract available limit for credit card transactions
    const availableLimit = type === TransactionType.CREDIT
      ? this.extractAvailableLimit(smsBody)
      : null;

    return {
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
    } as ParsedTransaction;
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'MASHREQ' ||
      upperSender.includes('MASHREQ') ||
      upperSender === 'MSHREQ' ||
      // DLT patterns for UAE
      /^[A-Z]{2}-MASHREQ-[A-Z]$/.test(upperSender) ||
      /^[A-Z]{2}-MSHREQ-[A-Z]$/.test(upperSender);
  }

  // extractAmount handled by UAEBankParser base logic (BankParser fallback)
  protected extractAmount(message: string): number | null {
    // "for AED 5.99" or "for AED 1,234.56"
    const forPattern = /for\s+([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i;
    const forMatch = message.match(forPattern);
    if (forMatch) {
      const amount = parseFloat(forMatch[2].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount * 100) / 100;
      }
    }

    // Generic currency amount pattern
    const genericPattern = /\b([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i;
    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const genericMatch = message.match(genericPattern);
    if (genericMatch) {
      const currencyCode = genericMatch[1].toUpperCase();
      if (!MONTH_RE.test(currencyCode)) {
        const amount = parseFloat(genericMatch[2].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return Math.round(amount * 100) / 100;
        }
      }
    }

    return super.extractAmount(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Mashreq debit card purchase pattern: "at CARREFOUR on"
    if (
      message.toLowerCase().includes('debit card') ||
      message.toLowerCase().includes('credit card')
    ) {
      // Pattern: "at MERCHANT on DATE"
      const merchantPattern = /at\s+([^,\n]+?)\s+on\s+\d{1,2}-[A-Z]{3}-\d{4}/i;
      const match = message.match(merchantPattern);
      if (match) {
        return this.cleanMerchantName(match[1].trim());
      }
    }

    // ATM withdrawal pattern
    if (
      message.toLowerCase().includes('atm') &&
      message.toLowerCase().includes('withdrawn')
    ) {
      return 'ATM Withdrawal';
    }

    // Transfer pattern
    if (message.toLowerCase().includes('transfer')) {
      return 'Transfer';
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;

    // Mashreq patterns for card/account extraction
    const patterns: RegExp[] = [
      // "Card ending XXXX" or "Card ending 1234"
      /Card ending\s+([X\d]+)/i,

      // "card no. XXXX" or "card number XXXX"
      /card\s+(?:no\.|number)\s+([X\d]+)/i,

      // Generic account pattern
      /account\s+(?:no\.|number)?\s*([X\d]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Mashreq balance patterns
    // Note: Mashreq uses 'X' for masking thousands, e.g., "AED X,480.15"
    const balancePatterns: RegExp[] = [
      // "Available Balance is AED X,480.15" or "Available Balance is AED 1,480.15"
      /Available Balance is\s+([A-Z]{3})\s+([X0-9,]+(?:\.\d{2})?)/i,

      // "Avl. Bal. AED X,480.15"
      /Avl\.?\s*Bal\.?\s+([A-Z]{3})\s+([X0-9,]+(?:\.\d{2})?)/i,

      // "Balance: AED X,480.15"
      /Balance:?\s+([A-Z]{3})\s+([X0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        let balanceStr = match[2].replace(/,/g, '');

        // Handle 'X' masking - replace X with 0 for parsing
        // "X480.15" becomes "0480.15" which is valid
        balanceStr = balanceStr.replace(/X/gi, '0');

        const amount = parseFloat(balanceStr);
        if (!isNaN(amount)) {
          return amount;
        }
      }
    }

    return super.extractBalance(message);
  }

  protected extractReference(message: string): string | null {
    // Mashreq date/time patterns
    const referencePatterns: RegExp[] = [
      // "on 26-AUG-2025 10:25 PM" - Mashreq's standard format
      /on\s+(\d{1,2}-[A-Z]{3}-\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/i,

      // Fallback: any date-time pattern
      /(\d{1,2}-[A-Z]{3}-\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/i,
    ];

    for (const pattern of referencePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return super.extractReference(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Debit card purchases are expenses (any currency)
    if (
      lowerMessage.includes('debit card') &&
      /for\s+[A-Z]{3}\s+[0-9,]+/i.test(message)
    ) {
      return TransactionType.EXPENSE;
    }

    // Credit card purchases are credit transactions (any currency)
    if (
      lowerMessage.includes('credit card') &&
      /for\s+[A-Z]{3}\s+[0-9,]+/i.test(message)
    ) {
      return TransactionType.CREDIT;
    }

    // ATM withdrawals are expenses
    if (lowerMessage.includes('atm') && lowerMessage.includes('withdrawn')) {
      return TransactionType.EXPENSE;
    }

    // ATM deposits are income
    if (lowerMessage.includes('atm') && lowerMessage.includes('deposited')) {
      return TransactionType.INCOME;
    }

    // Transfers
    if (lowerMessage.includes('transfer')) {
      return TransactionType.TRANSFER;
    }

    // Credits are income
    if (lowerMessage.includes('credited')) {
      return TransactionType.INCOME;
    }

    // Debits are expenses
    if (lowerMessage.includes('debited')) {
      return TransactionType.EXPENSE;
    }

    // Fallback to base class logic
    return super.extractTransactionType(message);
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Mashreq-specific card indicators
    const mashreqCardPatterns = [
      'neo visa debit card',
      'neo debit card',
      'debit card card ending',
      'credit card card ending',
      'card ending',
      'mashreq card',
    ];

    return mashreqCardPatterns.some(pattern => lowerMessage.includes(pattern)) ||
      super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip non-transaction messages specific to Mashreq
    const nonTransactionKeywords = [
      'otp',
      'one time password',
      'verification code',
      'do not share',
      'activation',
      'has been blocked',
      'has been activated',
      'card request',
      'card application',
      'limit change',
      'pin change',
      'failed transaction',
      'transaction declined',
      'insufficient balance',
    ];

    if (nonTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return false;
    }

    // Mashreq-specific transaction indicators
    const mashreqTransactionKeywords = [
      'thank you for using',
      'neo visa debit card',
      'neo debit card',
      'debit card card ending',
      'credit card card ending',
      'available balance is',
    ];

    if (mashreqTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Fallback to base class transaction detection
    return super.isTransactionMessage(message);
  }

  protected extractCurrency(message: string): string | null {
    // Extract currency from the transaction context
    const currencyPatterns: RegExp[] = [
      // "for AED 5.99"
      /for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,

      // "of AED 5.99"
      /of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,

      // Generic pattern
      /\b([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
    ];

    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;

    for (const pattern of currencyPatterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();

        // Validate it's a 3-letter code (standard ISO currency format) but not month names
        if (/^[A-Z]{3}$/.test(currencyCode) && !MONTH_RE.test(currencyCode)) {
          return currencyCode;
        }
      }
    }

    // Default to AED for Mashreq (UAE Dirham)
    return 'AED';
  }
}

export default new MashreqBankParser();
