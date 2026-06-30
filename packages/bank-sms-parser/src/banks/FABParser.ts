import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';
import { CompiledPatterns } from '../core/CompiledPatterns';

/**
 * Parser for First Abu Dhabi Bank (FAB) - UAE's largest bank
 * Handles AED currency transactions and global currencies for international transactions
 * This class is designed to be inheritable by other UAE bank parsers like ADCB
 */
export class FABParser extends BankParser {

  private static readonly MONTH_ABBREVIATIONS = new Set([
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]);

  getBankName(): string {
    return 'First Abu Dhabi Bank';
  }

  getCurrency(): string {
    return 'AED';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'FAB' ||
      upperSender.includes('FABBANK') ||
      upperSender.includes('ADFAB') ||
      /^[A-Z]{2}-FAB-[A-Z]$/.test(upperSender);
  }

  // ─── UAEBankParser helpers ─────────────────────────────────────────────────

  private isMonthAbbreviation(code: string): boolean {
    return FABParser.MONTH_ABBREVIATIONS.has(code.toUpperCase());
  }

  protected containsCardPurchase(message: string): boolean {
    return message.toLowerCase().includes('credit card purchase') ||
      message.toLowerCase().includes('debit card purchase');
  }

  // ─── extractCurrency (UAEBankParser logic) ────────────────────────────────

  protected extractCurrency(message: string): string | null {
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
    const simpleMatch = message.match(/\b([A-Z]{3})\s+\d/i);
    if (simpleMatch) {
      const code = simpleMatch[1].toUpperCase();
      if (!this.isMonthAbbreviation(code)) return code;
    }

    return null;
  }

  // ─── extractTransactionType (UAEBankParser logic) ─────────────────────────

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credit card purchase')) return TransactionType.CREDIT;
    if (this.containsCardPurchase(message)) return TransactionType.EXPENSE;
    if (lowerMessage.includes('cheque credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('cheque returned')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm cash withdrawal') ||
      (lowerMessage.includes('atm') && lowerMessage.includes('withdrawn'))) return TransactionType.EXPENSE;
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

  // ─── parse ────────────────────────────────────────────────────────────────

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
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

    const [fromAccount, toAccount] = type === TransactionType.TRANSFER
      ? this.extractTransferAccounts(smsBody)
      : [null, null];

    return createParsedTransaction({
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      creditLimit: availableLimit,  // TODO: This is actually available limit, will be fixed in SmsReaderWorker
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.containsCardPurchase(smsBody),
      currency,
      fromAccount,
      toAccount,
    });
  }

  // ─── extractAmount ────────────────────────────────────────────────────────

  protected extractAmount(message: string): number | null {
    // FAB patterns: Support global currencies - "AED 8.00", "THB ###.##", "USD 10.00", etc.
    const isoCode = CompiledPatterns.Currency.ISO_CODE.source;
    const patterns: RegExp[] = [
      new RegExp(`funds transfer request of\\s+(${isoCode})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`for\\s+(${isoCode})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCode})\\s+\\*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCode})\\s+([0-9*,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Amount\\s*(${isoCode})\\s+\\*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`Amount\\s*(${isoCode})\\s+([0-9*,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`payment.*?(${isoCode})\\s+\\*([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`payment.*?(${isoCode})\\s+([0-9*,]+(?:\\.\\d{2})?)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let amountStr = match[2].replace(/,/g, '');

        // Handle asterisks as placeholders - replace with 0s or treat as missing amount
        if (amountStr.includes('*')) {
          // If it's a pattern like *0.00 or *50.00, extract the numeric part
          if (/^\*\d+(?:\.\d{2})?$/.test(amountStr)) {
            amountStr = amountStr.substring(1); // Remove the asterisk
          } else if (/^\*+\.\d{2}$/.test(amountStr)) {
            // If it's all asterisks before decimal, treat as 0
            amountStr = '0' + amountStr.substring(amountStr.indexOf('.'));
          } else {
            // Try to extract any numeric pattern from the asterisk string
            const numericMatch = amountStr.match(/(\d+(?:\.\d{2})?)/);
            if (numericMatch) {
              amountStr = numericMatch[1];
            } else {
              // If it's all asterisks or other patterns, fall back to UAE base logic
              return this.uaeExtractAmount(message);
            }
          }
        }

        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return this.uaeExtractAmount(message);
  }

  /**
   * UAEBankParser extractAmount logic used as super-fallback.
   */
  private uaeExtractAmount(message: string): number | null {
    const isoCode = CompiledPatterns.Currency.ISO_CODE.source;
    const patterns: RegExp[] = [
      new RegExp(`(?:purchase of|transfer of|amount|for|of)\\s+(${isoCode})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCode})\\s+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
      new RegExp(`(${isoCode})\\s+\\*+([0-9,]+(?:\\.\\d{2})?)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();
        if (this.isMonthAbbreviation(currencyCode)) continue;

        let amountStr = match[2].replace(/,/g, '');
        if (amountStr.includes('*')) {
          amountStr = amountStr.replace(/\*/g, '');
          if (!amountStr || amountStr === '.') continue;
        }

        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return super.extractAmount(message);
  }

  // ─── extractMerchant ──────────────────────────────────────────────────────

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: Credit/Debit card - merchant extraction for both single-line and multi-line formats
    if (this.containsCardPurchase(message)) {
      // First try single-line format: Card Purchase with inline merchant after amount
      const singleLinePattern = /(?:Credit|Debit)\s+Card\s+Purchase\s+Card\s+No\s+[X\d]+\s+[A-Z]{3}\s+[\d,.]+\s+([^0-9]+?)(?:\s+\d{2}\/\d{2}\/\d{2})/i;
      const singleMatch = message.match(singleLinePattern);
      if (singleMatch) {
        const merchant = singleMatch[1].trim();
        if (merchant.length > 0) {
          const cleanedMerchant = merchant.replace(/\*/g, '').trim();
          return this.cleanMerchantName(cleanedMerchant);
        }
      }

      // Then try multi-line format
      const lines = message.split('\n');

      // Find the line with currency amount (AED, THB, USD, etc.)
      const isoCode = CompiledPatterns.Currency.ISO_CODE.source;
      const currencyLineIndex = lines.findIndex(line =>
        new RegExp(`.*${isoCode}\\s+[0-9,]+(?:\\.\\d{2})?.*`, 'i').test(line)
      );
      if (currencyLineIndex !== -1 && currencyLineIndex + 1 < lines.length) {
        const merchantLine = lines[currencyLineIndex + 1].trim();
        const cleanedMerchant = merchantLine.replace(/\*/g, '').trim();
        if (cleanedMerchant.length > 0 && !cleanedMerchant.includes('/')) {
          return this.cleanMerchantName(cleanedMerchant);
        }
      }

      // Fallback: Look for merchant after card line
      // Format: "Card XXXX2865" -> next line "THB 283.00" -> next line "WWW.GRAB.COM..."
      const cardPattern = /Card\s+[X*]+(\d{4})/i;
      const cardMatch = message.match(cardPattern);
      if (cardMatch) {
        const cardLineIndex = lines.findIndex(l => l.includes(cardMatch[0]));
        if (cardLineIndex !== -1 && cardLineIndex + 2 < lines.length) {
          const merchantLine = lines[cardLineIndex + 2].trim();
          if (
            merchantLine.length > 0 &&
            !merchantLine.includes('Available Balance') &&
            !/\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(merchantLine)
          ) {
            const cleanedMerchant = merchantLine.replace(/\*/g, '').trim();
            return this.cleanMerchantName(cleanedMerchant);
          }
        }
      }

      // Fallback: Look for merchant pattern directly (website names, etc.)
      const merchantPattern = /([A-Z]+\.(?:COM|NET|ORG|IN)[^\n]*)/i;
      const webMatch = message.match(merchantPattern);
      if (webMatch) {
        const merchant = webMatch[1].trim();
        if (merchant.length > 0) {
          const cleanedMerchant = merchant.replace(/\*/g, '').trim();
          return this.cleanMerchantName(cleanedMerchant);
        }
      }
    }

    // Pattern 2: Payment instructions and funds transfer - extract recipient account
    if (
      /payment instructions/i.test(message) ||
      /funds transfer request/i.test(message)
    ) {
      // For funds transfer messages, use the same logic as extractTransferAccounts to ensure consistency
      if (/funds transfer request/i.test(message)) {
        return this.formatTransferMerchant(this.extractTransferAccounts(message));
      }

      // Pattern: Extract anything after "to" for payment instructions
      const toPattern = /to\s+(\S+)/i;
      const toMatch = message.match(toPattern);
      if (toMatch) {
        const recipient = toMatch[1];

        // If it contains asterisks (masked format), extract last visible digits
        if (recipient.includes('*')) {
          const visibleDigits = recipient.split('').filter(c => /\d/.test(c)).join('');
          if (visibleDigits.length > 0) {
            const displayDigits = visibleDigits.length >= 4
              ? visibleDigits.slice(-4)
              : visibleDigits;
            return `Transfer to ${displayDigits}`;
          }
        }

        // For unmasked accounts, take last 4 digits
        const digits = recipient.split('').filter(c => /[\dX]/.test(c)).join('');
        if (digits.length > 0) {
          return `Transfer to ${digits.slice(-4)}`;
        }
      }
    }

    if (
      /has been credited to your fab account/i.test(message) &&
      !/unsuccessful transaction/i.test(message)
    ) {
      return 'Account Credited';
    }

    // Patterns for specific transaction types that act as merchants
    const transactionTypeMerchants: Record<string, string> = {
      'ATM Cash withdrawal': 'ATM Withdrawal',
      'Inward Remittance': 'Inward Remittance',
      'Outward Remittance': 'Outward Remittance',
      'Cash Deposit': 'Cash Deposit',
      'Cheque Credited': 'Cheque Credited',
      'Cheque Returned': 'Cheque Returned',
      'Cash withdrawal': 'Cash Withdrawal',
      'unsuccessful transaction': 'Refund', // unsuccessful transaction of AED xx.xx has been credited to your account XXXX, this only happens during a refund of a failed transaction
    };

    for (const [keyword, merchantName] of Object.entries(transactionTypeMerchants)) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        return merchantName;
      }
    }

    return super.extractMerchant(message, sender);
  }

  // ─── extractAccountLast4 ─────────────────────────────────────────────────

  protected extractAccountLast4(message: string): string | null {
    // For funds transfer messages, extract the source account (from account)
    if (/funds transfer request/i.test(message)) {
      const [fromAccount] = this.extractTransferAccounts(message);
      if (fromAccount !== null) {
        return fromAccount;
      }
    }

    // Use standard account extraction for non-transfer transactions
    return this.extractStandardAccountLast4(message);
  }

  // ─── extractBalance ──────────────────────────────────────────────────────

  protected extractBalance(message: string): number | null {
    // Pattern: "Available Balance [CURRENCY] **30.16" or "Available Balance AED ***0.00"
    const balancePattern = /(?:Available|available)\s+[Bb]alance\s+(?:is\s+)?([A-Z]{3})\s*\*{0,}([0-9*,]+(?:\.\d{2})?)/i;
    const match = message.match(balancePattern);
    if (match) {
      let balanceStr = match[2].replace(/,/g, '');

      // Handle masked balances like ***0.00
      if (balanceStr.includes('*')) {
        if (/^\*+\d+(?:\.\d{2})?$/.test(balanceStr)) {
          // Pattern like ***0.00 - extract the numeric part
          balanceStr = balanceStr.replace(/\*/g, '');
        } else if (/^\*+\.\d{2}$/.test(balanceStr)) {
          // Pattern like ***.00 - treat as 0
          balanceStr = '0' + balanceStr.substring(balanceStr.indexOf('.'));
        } else {
          // Other masked patterns - return null
          return null;
        }
      }

      const parsed = parseFloat(balanceStr);
      return isNaN(parsed) ? null : parsed;
    }

    return super.extractBalance(message);
  }

  // ─── extractReference ────────────────────────────────────────────────────

  protected extractReference(message: string): string | null {
    // Look for date/time as reference (23/09/25 16:17)
    const dateTimeMatch = message.match(/(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/);
    if (dateTimeMatch) {
      return dateTimeMatch[1];
    }

    // Value Date for remittances
    const valueDateMatch = message.match(/Value\s+Date\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (valueDateMatch) {
      return valueDateMatch[1];
    }

    return super.extractReference(message);
  }

  // ─── isTransactionMessage ─────────────────────────────────────────────────

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip administrative and non-transaction messages
    const nonTransactionKeywords = [
      'declined due to insufficient balance',
      'transaction has been declined',
      'address update request',
      'statement request',
      'stamped statement',
      'cannot process your',
      'amazing rate',
      'request has been logged',
      'reference number',
      'beneficiary creation/modification request',
      'funds transfer request is under process',
      'has been resolved',
      'funds transfer request has failed',
      'card has been successfully activated',
      'temporarily blocked',
      'never share credit/debit card',
      'debit card.*replacement request',  // Card replacement requests
      'card will be ready for dispatch',  // Card delivery notifications
      'replacement request has been registered',  // Card replacement confirmations
      'otp',
      'activation',
      'thank you for activating',
      'do not disclose your otp',
      'atyourservice@bankfab.com',
      'has been blocked on',  // Email-only messages
    ];

    if (nonTransactionKeywords.some(keyword =>
      new RegExp(keyword, 'i').test(lowerMessage)
    )) {
      return false;
    }

    // Skip promotional messages
    if (
      lowerMessage.includes('bit.ly') ||
      lowerMessage.includes('conditions apply') ||
      lowerMessage.includes('instalments at 0% interest')
    ) {
      // But still process if it has transaction info
      if (
        !lowerMessage.includes('purchase') &&
        !lowerMessage.includes('payment instructions') &&
        !lowerMessage.includes('remittance')
      ) {
        return false;
      }
    }

    // FAB specific transaction keywords - only actual completed transactions
    const fabTransactionKeywords = [
      'credit card purchase',
      'debit card purchase',
      'inward remittance',
      'outward remittance',
      'atm cash withdrawal',
      'payment instructions',
      'has been processed',
      'has been credited to your fab account',
      'cash deposit',
      'cheque credited',
      'cheque returned',
    ];

    // Special handling for funds transfer - only completed ones
    if (lowerMessage.includes('funds transfer request of')) {
      if (lowerMessage.includes('has been processed')) {
        return true;
      }
    }

    if (fabTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Only check for these if they contain actual transaction amounts
    if (
      (lowerMessage.includes('credit') && !lowerMessage.includes('credit card')) ||
      lowerMessage.includes('debit') ||
      lowerMessage.includes('remittance') ||
      lowerMessage.includes('available balance')
    ) {
      // Only return true if there's a currency amount pattern
      const amountPattern = /[A-Z]{3}\s+[0-9,]+(?:\.\d{2})?/i;
      return amountPattern.test(message);
    }

    return super.isTransactionMessage(message);
  }

  // ─── Public helper for test cases ─────────────────────────────────────────

  shouldParseTransactionMessage(message: string): boolean {
    return this.isTransactionMessage(message);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  // Format transfer merchant information based on extracted accounts
  private formatTransferMerchant(accounts: [string | null, string | null]): string {
    const [fromAccount, toAccount] = accounts;

    if (fromAccount !== null && toAccount !== null) {
      return `Transfer: ${fromAccount.slice(-3)} → ${toAccount.slice(-3)}`;
    } else if (fromAccount !== null) {
      return `Transfer from ${fromAccount.slice(-3)}`;
    } else if (toAccount !== null) {
      return `Transfer to ${toAccount.slice(-3)}`;
    }

    return 'Transfer';
  }

  // Extract standard account patterns (for non-transfer transactions)
  private extractStandardAccountLast4(message: string): string | null {
    const patterns: RegExp[] = [
      /Card\s+No\s+([X\d]+)/i,
      /Account\s+([X\d*]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  // Extract from and to accounts for transfer transactions
  protected extractTransferAccounts(message: string): [string | null, string | null] {
    const fromPatterns: RegExp[] = [
      /from\s+account\s+([X\d]{4,})/i,
      /from\s+account\/card\s+([X\d]{4,})/i,
      /from your account\/card\s+([X\d]{4,})/i,
      /from\s+([X\d]{4,})\s+to\s+account/i,
    ];

    const toPatterns: RegExp[] = [
      /to\s+account\s+([X\d]{4,})/i,
      /to\s+IBAN\/Account\/Card\s+([X\d]{4,})/i,
      /to\s+IBAN\/Account\/Card\s+([X\d]{4,})\s+has been processed successfully from/i,
      /to\s+([X\d]{4,})\s+from\s+account/i,
    ];

    const extractAccount = (patterns: RegExp[]): string | null => {
      return patterns.reduce<string | null>((acc, pattern) => {
        if (acc !== null) return acc;
        const m = message.match(pattern);
        if (m) return this.extractLast4Digits(m[1]);
        return null;
      }, null);
    };

    const fromAccount = extractAccount(fromPatterns);
    const toAccount = extractAccount(toPatterns);

    return [fromAccount, toAccount];
  }
}

export default new FABParser();
