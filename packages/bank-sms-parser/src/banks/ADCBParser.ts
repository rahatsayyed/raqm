import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';
import { CompiledPatterns } from '../core/CompiledPatterns';

/**
 * Parser for Abu Dhabi Commercial Bank (ADCB) - UAE's largest bank by assets
 * Inherits from FABParser since ADCB follows similar UAE banking patterns
 * Handles AED currency and multi-currency international transactions
 */
export class ADCBParser extends BankParser {

  private static readonly MONTH_ABBREVIATIONS = new Set([
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]);

  getBankName(): string {
    return 'Abu Dhabi Commercial Bank';
  }

  getCurrency(): string {
    return 'AED';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'ADCBALERT' ||
      upperSender.includes('ADCB') ||
      upperSender.includes('ADCBANK') ||
      /^[A-Z]{2}-ADCB-[A-Z]$/.test(upperSender);
  }

  // ─── UAEBankParser helpers ─────────────────────────────────────────────────

  private isMonthAbbreviation(code: string): boolean {
    return ADCBParser.MONTH_ABBREVIATIONS.has(code.toUpperCase());
  }

  /**
   * Checks if the message contains a credit/debit card purchase pattern.
   * Overridden from UAEBankParser base behaviour.
   */
  protected containsCardPurchase(message: string): boolean {
    return message.toLowerCase().includes('was used for') ||
      message.toLowerCase().includes('used for');
  }

  // ─── FABParser: transfer helpers ──────────────────────────────────────────

  private extractTransferAccounts(message: string): [string | null, string | null] {
    const fromPatterns = [
      /from\s+account\s+([X\d]{4,})/i,
      /from\s+account\/card\s+([X\d]{4,})/i,
      /from your account\/card\s+([X\d]{4,})/i,
      /from\s+([X\d]{4,})\s+to\s+account/i,
    ];

    const toPatterns = [
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

    return [extractAccount(fromPatterns), extractAccount(toPatterns)];
  }

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

  private extractStandardAccountLast4(message: string): string | null {
    const patterns = [
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

  // ─── isTransactionMessage ─────────────────────────────────────────────────

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip non-transaction messages specific to ADCB
    const adcbNonTransactionKeywords = [
      'could not be completed',
      'insufficient funds',
      'transaction.*could not be completed',
      'do not share your otp',
      'otp for transaction',
      'activation key',
      'do not share with anyone',
      'has been de-activated',
      'has been activated',
      'congratulations on the first usage',
      'digital card assigned to',
      'pin change/setup was successful',
      'request for pin change/setup',
      'we have updated your emirates id',
      'confirmation recd. from',
      'sr no.',
      'for clarifications please call',
      'for assistance please call',
    ];

    if (adcbNonTransactionKeywords.some(keyword =>
      new RegExp(keyword, 'i').test(lowerMessage)
    )) {
      return false;
    }

    // ADCB-specific transaction indicators
    const adcbTransactionKeywords = [
      'your debit card',
      'your credit card',
      'was used for',
      'used for',
      'withdrawn from',
      'deposited via atm',
      'transferred via',
      'cr. transaction',
      'dr. transaction',
      'cr.transaction',
      'dr.transaction',
      'transaction.*was successful',
      'touchpoints redemption',
      'debit card.*used for',
      'touchpoints redemption request',
      'account number XXX.*was successful',
    ];

    if (adcbTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Fallback to FABParser's transaction detection
    return this.fabIsTransactionMessage(message);
  }

  /**
   * FABParser isTransactionMessage logic used as super-fallback.
   */
  private fabIsTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

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
      'debit card.*replacement request',
      'card will be ready for dispatch',
      'replacement request has been registered',
      'otp',
      'activation',
      'thank you for activating',
      'do not disclose your otp',
      'atyourservice@bankfab.com',
      'has been blocked on',
    ];

    if (nonTransactionKeywords.some(keyword =>
      new RegExp(keyword, 'i').test(lowerMessage)
    )) {
      return false;
    }

    if (
      lowerMessage.includes('bit.ly') ||
      lowerMessage.includes('conditions apply') ||
      lowerMessage.includes('instalments at 0% interest')
    ) {
      if (
        !lowerMessage.includes('purchase') &&
        !lowerMessage.includes('payment instructions') &&
        !lowerMessage.includes('remittance')
      ) {
        return false;
      }
    }

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

    if (lowerMessage.includes('funds transfer request of')) {
      if (lowerMessage.includes('has been processed')) {
        return true;
      }
    }

    if (fabTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    if (
      (lowerMessage.includes('credit') && !lowerMessage.includes('credit card')) ||
      lowerMessage.includes('debit') ||
      lowerMessage.includes('remittance') ||
      lowerMessage.includes('available balance')
    ) {
      const amountPattern = /[A-Z]{3}\s+[0-9,]+(?:\.\d{2})?/i;
      return amountPattern.test(message);
    }

    return super.isTransactionMessage(message);
  }

  // ─── extractAmount ────────────────────────────────────────────────────────

  protected extractAmount(message: string): number | null {
    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const CURRENCY_RE = /^[A-Z]{3}$/;

    const patterns: RegExp[] = [
      // 1. "was used for CURRENCYamount"
      /was used for\s+([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
      // 2. "used for CURRENCYamount"
      /used for\s+([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
      // 3. "CURRENCYamount withdrawn from"
      /\b([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)\s+withdrawn from/i,
      // 4. "CURRENCYamount has been deposited via ATM"
      /\b([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)\s+has been deposited via ATM/i,
      // 5. "CURRENCYamount transferred via"
      /\b([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)\s+transferred via/i,
      // 6. "Cr. transaction of CURRENCY amount"
      /Cr\. transaction of\s+([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
      // 7. "Dr. transaction of CURRENCY amount"
      /Dr\.?\s*transaction of\s+([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
      // 8. "Transaction of CURRENCY amount"
      /Transaction of\s+([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
      // 9. "Amount Paid: CURRENCY amount"
      /Amount Paid:\s*([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].trim();
        const amountStr = match[2].trim();

        if (
          currencyCode.length === 3 &&
          CURRENCY_RE.test(currencyCode) &&
          !MONTH_RE.test(currencyCode)
        ) {
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0.01) {
            return Math.round(amount * 100) / 100;
          }
        }
      }
    }

    // Fallback with card purchase context
    if (this.containsCardPurchase(message)) {
      const afterUsage = message.includes('was used for')
        ? message.substring(message.indexOf('was used for') + 'was used for'.length)
        : message.substring(message.indexOf('used for') + 'used for'.length);

      const currencyAmountPattern = /([A-Z]{3})\s*([0-9,]+(?:\.\d{2})?)/;
      const match = afterUsage.match(currencyAmountPattern);
      if (match) {
        const currencyCode = match[1].trim();
        const amountStr = match[2].trim();

        if (
          currencyCode.length === 3 &&
          CURRENCY_RE.test(currencyCode) &&
          !MONTH_RE.test(currencyCode)
        ) {
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0.01) {
            return Math.round(amount * 100) / 100;
          }
        }
      }
    }

    return null;
  }

  // ─── extractMerchant ──────────────────────────────────────────────────────

  protected extractMerchant(message: string, sender: string): string | null {
    // ADCB Debit Card Purchase pattern: "at MERCHANT,AE. Avl.Bal"
    if (this.containsCardPurchase(message)) {
      const merchantPattern = /at\s+([^,\n]+),\s*[A-Z]{2}/i;
      const match = message.match(merchantPattern);
      if (match) {
        return this.cleanMerchantName(match[1].trim());
      }
    }

    // TouchPoints Redemption pattern
    if (/touchpoints redemption/i.test(message)) {
      return 'TouchPoints Redemption';
    }

    // ATM location extraction
    if (/withdrawn from/i.test(message)) {
      const afterAt = message.substring(message.indexOf('at ') + 3);
      const beforeBalance = afterAt
        .split(' Avl.Bal')[0]
        .split('Available balance')[0];

      const atmInfo = beforeBalance.trim().replace(/\s+/g, ' ');

      if (atmInfo.length > 0 && (atmInfo.startsWith('ATM-') || atmInfo.startsWith('ATM '))) {
        let cleanAtmName: string;
        if (atmInfo.startsWith('ATM-')) {
          cleanAtmName = atmInfo.substring(4);
        } else {
          cleanAtmName = atmInfo.substring(4);
        }
        cleanAtmName = cleanAtmName.trim();

        const finalAtmName = cleanAtmName.replace(/^\d+/, '').replace(/\./g, '').trim();

        if (finalAtmName.length > 0) {
          return `ATM Withdrawal: ${finalAtmName}`;
        }
      }
    }

    // ATM deposit location
    if (/deposited via ATM/i.test(message)) {
      const afterDeposit = message.substring(
        message.toLowerCase().indexOf('deposited via atm') + 'deposited via atm'.length
      );
      const depositPattern = /at\s+([^.\n]+)/i;
      const match = afterDeposit.match(depositPattern);
      if (match) {
        return `ATM Deposit: ${match[1].trim()}`;
      }
    }

    // Transfer merchant
    if (/transferred via/i.test(message)) {
      return 'Transfer via ADCB Banking';
    }

    // Credit transaction
    if (/Cr\. transaction/i.test(message)) {
      return 'Account Credit';
    }

    // Debit transaction
    if (/Dr\. transaction/i.test(message)) {
      return 'Account Debit';
    }

    // Fallback to FABParser merchant extraction
    return this.fabExtractMerchant(message, sender);
  }

  /**
   * FABParser extractMerchant logic used as super-fallback.
   */
  private fabExtractMerchant(message: string, sender: string): string | null {
    if (this.containsCardPurchase(message)) {
      // Single-line format
      const singleLinePattern = /(?:Credit|Debit)\s+Card\s+Purchase\s+Card\s+No\s+[X\d]+\s+[A-Z]{3}\s+[\d,.]+\s+([^0-9]+?)(?:\s+\d{2}\/\d{2}\/\d{2})/i;
      const singleMatch = message.match(singleLinePattern);
      if (singleMatch) {
        const merchant = singleMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant.replace(/\*/g, '').trim());
        }
      }

      // Multi-line format
      const lines = message.split('\n');
      const currencyLineIndex = lines.findIndex(line =>
        /[A-Z]{3}\s+[0-9,]+(?:\.\d{2})?/i.test(line)
      );
      if (currencyLineIndex !== -1 && currencyLineIndex + 1 < lines.length) {
        const merchantLine = lines[currencyLineIndex + 1].trim();
        const cleanedMerchant = merchantLine.replace(/\*/g, '').trim();
        if (cleanedMerchant.length > 0 && !cleanedMerchant.includes('/')) {
          return this.cleanMerchantName(cleanedMerchant);
        }
      }

      // Card-line fallback
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
            return this.cleanMerchantName(merchantLine.replace(/\*/g, '').trim());
          }
        }
      }

      // Website name fallback
      const merchantPattern = /([A-Z]+\.(?:COM|NET|ORG|IN)[^\n]*)/i;
      const webMatch = message.match(merchantPattern);
      if (webMatch) {
        const merchant = webMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant.replace(/\*/g, '').trim());
        }
      }
    }

    if (
      /payment instructions/i.test(message) ||
      /funds transfer request/i.test(message)
    ) {
      if (/funds transfer request/i.test(message)) {
        return this.formatTransferMerchant(this.extractTransferAccounts(message));
      }

      const toPattern = /to\s+(\S+)/i;
      const toMatch = message.match(toPattern);
      if (toMatch) {
        const recipient = toMatch[1];
        if (recipient.includes('*')) {
          const visibleDigits = recipient.split('').filter(c => /\d/.test(c)).join('');
          if (visibleDigits.length > 0) {
            const displayDigits = visibleDigits.length >= 4
              ? visibleDigits.slice(-4)
              : visibleDigits;
            return `Transfer to ${displayDigits}`;
          }
        }
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

    const transactionTypeMerchants: Record<string, string> = {
      'ATM Cash withdrawal': 'ATM Withdrawal',
      'Inward Remittance': 'Inward Remittance',
      'Outward Remittance': 'Outward Remittance',
      'Cash Deposit': 'Cash Deposit',
      'Cheque Credited': 'Cheque Credited',
      'Cheque Returned': 'Cheque Returned',
      'Cash withdrawal': 'Cash Withdrawal',
      'unsuccessful transaction': 'Refund',
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
    const adcbPatterns: RegExp[] = [
      // Debit card + linked account (2 groups — prefer group 2)
      /debit card\s+([X*\d]+)\s+linked to acc\.?\s*([X*\d]+)/i,
      // General linked account
      /linked to acc\.?\s*([X*\d]+)/i,
      // ATM withdrawals
      /withdrawn from acc\.?\s*([X*\d]+)/i,
      // ATM deposits
      /in your account\s+([X*\d]+)/i,
      // Transfers
      /from acc\.?\s*no\.?\s*([X*\d]+)/i,
      // Account number
      /account (?:number\s*)?([X*\d]+)/i,
      // Dr/Cr transactions
      /on your account number\s+([X*\d]+)/i,
      // Standard card pattern (last resort)
      /Card\s+([X*\d]+)/i,
    ];

    for (const pattern of adcbPatterns) {
      const match = message.match(pattern);
      if (match) {
        // For patterns with 2 groups (card + account), prefer account (group 2)
        const raw = (match.length > 2 && match[2] && match[2].length > 0)
          ? match[2]
          : match[1];
        const result = this.extractLast4Digits(raw);
        if (result !== null) return result;
      }
    }

    return null;
  }

  // ─── extractBalance ──────────────────────────────────────────────────────

  protected extractBalance(message: string): number | null {
    const adcbBalancePatterns: RegExp[] = [
      // "Avl.Bal AED 131.20"
      /Avl\.Bal\s+([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i,
      // "Available balance is 173.20"
      /Available balance is\s+([A-Z]{3})?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "Avl. bal. AED 1758.97"
      /Avl\.?\s*bal\.?\s+([A-Z]{3})\s+([0-9,]+(?:\.\d{2})?)/i,
      // "Avl.Bal.AED93.48" (no space between currency and amount)
      /Avl\.Bal\.?([A-Z]{3})([0-9,]+(?:\.\d{2})?)/i,
      // "Available Balance is AED4962.77"
      /Available Balance is\s+([A-Z]{3})([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of adcbBalancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = (match.length > 2 ? match[2] : match[1]) ?? '';
        const amount = parseFloat(balanceStr.replace(/,/g, ''));
        if (!isNaN(amount)) return amount;
      }
    }

    // Fallback to FABParser balance extraction
    return this.fabExtractBalance(message);
  }

  /**
   * FABParser extractBalance logic used as super-fallback.
   */
  private fabExtractBalance(message: string): number | null {
    const balancePattern = /(?:Available|available)\s+[Bb]alance\s+(?:is\s+)?([A-Z]{3})\s*\*{0,}([0-9*,]+(?:\.\d{2})?)/i;
    const match = message.match(balancePattern);
    if (match) {
      let balanceStr = match[2].replace(/,/g, '');
      if (balanceStr.includes('*')) {
        if (/\*+\d+(?:\.\d{2})?/.test(balanceStr)) {
          balanceStr = balanceStr.replace(/\*/g, '');
        } else if (/\*+\.\d{2}/.test(balanceStr)) {
          balanceStr = '0' + balanceStr.substring(balanceStr.indexOf('.'));
        } else {
          return null;
        }
      }
      const amount = parseFloat(balanceStr);
      return isNaN(amount) ? null : amount;
    }

    return super.extractBalance(message);
  }

  // ─── extractReference ────────────────────────────────────────────────────

  protected extractReference(message: string): string | null {
    const adcbReferencePatterns: RegExp[] = [
      // Date format: "on Jul 10 2024  5:49PM"
      /on\s+(\w{3}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}[AP]M)/,
      // Date format: "on Feb  4 2025 12:49PM"
      /on\s+(\w{3}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}[AP]M)/,
      // Fallback date/time reference
      /(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/,
    ];

    for (const pattern of adcbReferencePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback to FABParser reference extraction
    return this.fabExtractReference(message);
  }

  /**
   * FABParser extractReference logic used as super-fallback.
   */
  private fabExtractReference(message: string): string | null {
    const dateTimePattern = /(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/;
    const dateTimeMatch = message.match(dateTimePattern);
    if (dateTimeMatch) return dateTimeMatch[1];

    const valueDatePattern = /Value\s+Date\s+(\d{2}\/\d{2}\/\d{4})/i;
    const valueDateMatch = message.match(valueDatePattern);
    if (valueDateMatch) return valueDateMatch[1];

    return super.extractReference(message);
  }

  // ─── extractTransactionType ──────────────────────────────────────────────

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.containsCardPurchase(message)) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn from') && lowerMessage.includes('atm')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('deposited via atm')) return TransactionType.INCOME;
    if (lowerMessage.includes('transferred via')) return TransactionType.TRANSFER;
    if (lowerMessage.includes('cr. transaction')) return TransactionType.INCOME;
    if (lowerMessage.includes('dr. transaction')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('touchpoints redemption')) return TransactionType.EXPENSE;

    // Fallback to FABParser/UAEBankParser transaction type logic
    return this.uaeExtractTransactionType(message);
  }

  /**
   * UAEBankParser extractTransactionType logic used as super-fallback.
   */
  private uaeExtractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credit card purchase')) return TransactionType.CREDIT;
    if (lowerMessage.includes('debit card purchase')) return TransactionType.EXPENSE;
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

  // ─── extractCurrency ─────────────────────────────────────────────────────

  protected extractCurrency(message: string): string {
    const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const CURRENCY_RE = /^[A-Z]{3}$/;

    const transactionCurrencyPatterns: RegExp[] = [
      // "was used for CURRENCYamount"
      /was used for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      // "used for CURRENCYamount"
      /used for\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      // "CURRENCYamount withdrawn from"
      /\b([A-Z]{3})\s*[0-9,]+(?:\.\d{2})?\s+withdrawn from/i,
      // "CURRENCYamount has been deposited via ATM"
      /\b([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?\s+has been deposited via ATM/i,
      // "CURRENCYamount transferred via"
      /\b([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?\s+transferred via/i,
      // "Cr. transaction of CURRENCY amount"
      /Cr\.?\s*transaction of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      // "Dr. transaction of CURRENCY amount"
      /Dr\.?\s*transaction of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      // "Transaction of CURRENCY amount"
      /Transaction of\s+([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
      // "Amount Paid: CURRENCY amount"
      /Amount Paid:\s*([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?/i,
    ];

    for (const pattern of transactionCurrencyPatterns) {
      const match = message.match(pattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();
        if (CURRENCY_RE.test(currencyCode) && !MONTH_RE.test(currencyCode)) {
          return currencyCode;
        }
      }
    }

    // Fallback: look for currency in card purchase context
    if (this.containsCardPurchase(message)) {
      const afterUsage = message.toLowerCase().includes('was used for')
        ? message.substring(message.toLowerCase().indexOf('was used for') + 'was used for'.length)
        : message.substring(message.toLowerCase().indexOf('used for') + 'used for'.length);

      const beforeBalance = afterUsage
        .split(' Avl.Bal')[0]
        .split(' Available balance')[0];

      const currencyPattern = /([A-Z]{3})\s*[0-9,]+(?:\.\d{2})?/;
      const match = beforeBalance.match(currencyPattern);
      if (match) {
        const currencyCode = match[1].toUpperCase();
        if (CURRENCY_RE.test(currencyCode) && !MONTH_RE.test(currencyCode)) {
          return currencyCode;
        }
      }
    }

    // Default to AED for ADCB (UAE Dirham)
    return 'AED';
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

    const currency = this.extractCurrency(smsBody);

    const availableLimit = type === TransactionType.CREDIT
      ? this.extractAvailableLimit(smsBody)
      : null;

    const [fromAccount, toAccount] = type === TransactionType.TRANSFER
      ? this.extractTransferAccounts(smsBody)
      : [null, null];

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
      isFromCard: this.containsCardPurchase(smsBody),
      currency,
      fromAccount,
      toAccount,
    });
  }
}

export default new ADCBParser();
