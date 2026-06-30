import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for HSBC Bank SMS messages
 */
export class HSBCBankParser extends BankParser {

  getBankName(): string {
    return 'HSBC Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('HSBC') ||
      normalizedSender.includes('HSBCIN') ||
      // DLT patterns
      /^[A-Z]{2}-HSBCIN-[A-Z]$/.test(normalizedSender) ||
      /^[A-Z]{2}-HSBC-[A-Z]$/.test(normalizedSender)
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!this.canHandle(sender)) return null;
    if (!this.isTransactionMessage(smsBody)) return null;

    const amount = this.extractAmount(smsBody);
    if (amount === null) return null;
    const transactionType = this.extractTransactionType(smsBody);
    if (transactionType === null) return null;
    const merchant = this.extractMerchant(smsBody, sender) ?? 'Unknown';
    const currency = this.detectCurrency(smsBody);

    return {
      amount,
      type: transactionType,
      merchant,
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      creditLimit: this.extractAvailableLimit(smsBody),
      reference: this.extractReference(smsBody),
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency,
    };
  }

  private detectCurrency(message: string): string {
    const currencyPattern = /(EGP|INR|USD|GBP|EUR|AED|SAR|OMR|BHD|KWD|QAR)\s+[\d,]+/i;
    return message.match(currencyPattern)?.[1]?.toUpperCase() ?? 'INR';
  }

  extractAmount(message: string): number | null {
    const cur = '(?:INR|EGP|USD|GBP|EUR|AED|SAR|OMR|BHD|KWD|QAR)';

    // Pattern 1: "INR 49.00 is paid from" / "EGP 123.99 is debited"
    const pattern1 = new RegExp(`${cur}\\s+([\\d,]+(?:\\.\\d+)?)\\s+is\\s+(?:paid|credited|debited)`, 'i');
    const match1 = message.match(pattern1);
    if (match1) {
      const val = parseFloat(match1[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 2: "for EGP 123.99 on" / "for INR 305.00 on" (card transactions)
    const forCurrencyPattern = new RegExp(`for\\s+${cur}\\s+([\\d,]+(?:\\.\\d+)?)\\s+on`, 'i');
    const match2 = message.match(forCurrencyPattern);
    if (match2) {
      const val = parseFloat(match2[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 3: "has been used for EGP 123.99 on" (Egypt credit card)
    const usedForPattern = new RegExp(`used\\s+for\\s+${cur}\\s+([\\d,]+(?:\\.\\d+)?)\\s+on`, 'i');
    const match3 = message.match(usedForPattern);
    if (match3) {
      const val = parseFloat(match3[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 4: "for INR 305.00" at end (credit card, no trailing "on")
    const forCurrencyEnd = new RegExp(`for\\s+${cur}\\s+([\\d,]+(?:\\.\\d+)?)(?:\\s|$|\\.)`, 'i');
    const match4 = message.match(forCurrencyEnd);
    if (match4) {
      const val = parseFloat(match4[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 0: Outgoing NEFT/RTGS/IMPS - "credited to the [BANK] A/c XXX of [NAME]"
    // Extract the beneficiary name (the person receiving the money)
    const outgoingNeftPattern = /credited\s+to\s+the\s+\w+\s+A\/c\s+[X\d]+\s+of\s+(.+?)\s+on\s+/i;
    const match0 = message.match(outgoingNeftPattern);
    if (match0) {
      const beneficiaryName = this.cleanMerchantName(match0[1].trim());
      if (this.isValidMerchantName(beneficiaryName)) {
        return beneficiaryName;
      }
    }

    // Pattern 1: "from CHAS A/c ***6983 of John Doe" (Issue #118 - NEFT/Credit transactions)
    // Extract everything after "from" until " ." or end of sentence
    const neftCreditPattern = /as\s+(?:NEFT|RTGS|IMPS)\s+from\s+(.+?)\s+\./i;
    const match1 = message.match(neftCreditPattern);
    if (match1) {
      const merchant = this.cleanMerchantName(match1[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "at IKEA INDIA ." (debit card format with space before period)
    const atMerchantPattern = /at\s+([^.]+?)\s*\./i;
    const match2 = message.match(atMerchantPattern);
    if (match2) {
      const merchant = this.cleanMerchantName(match2[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: "used at [Merchant] for" (credit card)
    const creditCardPattern = /used\s+at\s+([^\s]+)\s+for\s+INR/i;
    const match3 = message.match(creditCardPattern);
    if (match3) {
      const merchant = this.cleanMerchantName(match3[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "to [Merchant] on" for payments
    const paymentPattern = /to\s+([^.]+?)\s+on\s+\d/i;
    const match4 = message.match(paymentPattern);
    if (match4) {
      const merchant = this.cleanMerchantName(match4[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 5: "from [Merchant]" for generic credits
    const creditPattern = /from\s+([^.]+?)(?:\s+on\s+|\s+with\s+|$)/i;
    const match5 = message.match(creditPattern);
    if (match5) {
      const merchant = this.cleanMerchantName(match5[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  cleanMerchantName(merchant: string): string {
    let cleaned = super.cleanMerchantName(merchant);

    // Remove "for INR xxx" suffix that may appear in credit card transactions
    cleaned = cleaned.replace(/\s+for\s+INR\s+[\d,]+(?:\.\d{2})?$/i, '');

    return cleaned.trim();
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;

    // Pattern 0: "Credit Card ending with ***6" (Egypt format)
    const endingWithPattern = /(?:Credit\s+Card|Debit\s+Card|Card)\s+ending\s+with\s+([*\d]+)/i;
    const match0 = message.match(endingWithPattern);
    if (match0) {
      return this.extractLast4Digits(match0[1]);
    }

    // Pattern 1: "A/c 074-260***-006" format (Issue #118)
    // Capture everything after A/c keyword, filter to digits, take last 4
    const acNoPattern = /A\/c\s+([\d\-*]+)/i;
    const match1 = message.match(acNoPattern);
    if (match1) {
      return this.extractLast4Digits(match1[1]);
    }

    // Pattern 2: "Debit Card XXXXX71xx" format
    // Handle mixed digits and 'x' characters - extract digits only, take last 4
    const debitCardPattern = /Debit\s+Card\s+([X*\d]+)/i;
    const match2 = message.match(debitCardPattern);
    if (match2) {
      return this.extractLast4Digits(match2[1]);
    }

    // Pattern 3: "creditcard xxxxx1234" or "credit card xxxxx1234"
    const creditCardPattern = /credit\s*card\s+([xX*\d]+)/i;
    const match3 = message.match(creditCardPattern);
    if (match3) {
      return this.extractLast4Digits(match3[1]);
    }

    // Pattern 4: account XXXXXX1234
    const accountPattern = /account\s+([X*\d]+)/i;
    const match4 = message.match(accountPattern);
    if (match4) {
      return this.extractLast4Digits(match4[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: "with UTR CHASH00007392391" (Issue #118 - NEFT/RTGS/IMPS transactions)
    const utrPattern = /with\s+UTR\s+(\w+)/i;
    const match1 = message.match(utrPattern);
    if (match1) {
      return match1[1];
    }

    // Pattern 2: "with ref 222222222222"
    const refPattern = /with\s+ref\s+(\w+)/i;
    const match2 = message.match(refPattern);
    if (match2) {
      return match2[1];
    }

    return super.extractReference(message);
  }

  extractBalance(message: string): number | null {
    const cur = '(?:INR|EGP|USD|GBP|EUR|AED|SAR|OMR|BHD|KWD|QAR)';

    // Pattern 1: "Your Avl Bal is INR xyz"
    const avlBalPattern = new RegExp(`(?:Your\\s+)?Avl\\s+Bal\\s+is\\s+${cur}\\s+([\\d,]+(?:\\.\\d+)?)`, 'i');
    const match1 = message.match(avlBalPattern);
    if (match1) {
      const val = parseFloat(match1[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    // Pattern 2: "available bal is INR/EGP xyz"
    const availableBalPattern = new RegExp(`available\\s+bal\\s+is\\s+${cur}\\s+([\\d,]+(?:\\.\\d+)?)`, 'i');
    const match2 = message.match(availableBalPattern);
    if (match2) {
      const val = parseFloat(match2[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }

    return super.extractBalance(message);
  }

  extractAvailableLimit(message: string): number | null {
    // "Your available limit is EGP 1234.29"
    const limitPattern = /available\s+limit\s+is\s+(?:INR|EGP|USD|GBP|EUR|AED|SAR|OMR|BHD|KWD|QAR)\s+([\d,]+(?:\.\d+)?)/i;
    const match = message.match(limitPattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }
    return super.extractAvailableLimit(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debit card') && lowerMessage.includes('thank you for using')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('debit card') && lowerMessage.includes('for inr')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('creditcard') || lowerMessage.includes('credit card')) {
      return TransactionType.CREDIT;
    }
    if (this.isOutgoingNeftTransfer(message)) {
      return TransactionType.TRANSFER;
    }
    if (lowerMessage.includes('is paid from')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('is debited')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('is credited to')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('is credited with')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('deposited')) {
      return TransactionType.INCOME;
    }

    return super.extractTransactionType(message);
  }

  /**
   * Detects outgoing NEFT/RTGS/IMPS transfers where the SMS confirms
   * that money has been credited to someone else's account at another bank.
   * Pattern: "your NEFT transaction... has been credited to the [BANK] A/c... of [NAME]"
   */
  private isOutgoingNeftTransfer(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Must be a NEFT/RTGS/IMPS transaction
    if (
      !lowerMessage.includes('neft') &&
      !lowerMessage.includes('rtgs') &&
      !lowerMessage.includes('imps')
    ) {
      return false;
    }

    // Check for pattern: "credited to the [BANK] A/c" where BANK is not HSBC
    const creditedToOtherBankPattern = /credited\s+to\s+the\s+(\w+)\s+A\/c/i;
    const bankMatch = message.match(creditedToOtherBankPattern);
    if (bankMatch) {
      const bankName = bankMatch[1].toUpperCase();
      // If credited to a non-HSBC account, it's an outgoing transfer
      if (bankName !== 'HSBC') {
        return true;
      }
    }

    // Check for pattern: "credited to... of [PERSON NAME]" (beneficiary name)
    if (
      lowerMessage.includes('credited to') &&
      /A\/c\s+[X\d]+\s+of\s+\w+/i.test(message)
    ) {
      return true;
    }

    return false;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP messages
    if (lowerMessage.includes('otp is') || lowerMessage.includes('otp valid for')) {
      return false;
    }

    // Check for HSBC-specific transaction keywords
    if (
      lowerMessage.includes('is paid from') ||
      lowerMessage.includes('is credited to') ||
      lowerMessage.includes('is debited') ||
      lowerMessage.includes('has been used for') ||
      (lowerMessage.includes('creditcard') && lowerMessage.includes('used at')) ||
      (lowerMessage.includes('credit card') && lowerMessage.includes('used at')) ||
      (lowerMessage.includes('credit card') && lowerMessage.includes('used for')) ||
      (lowerMessage.includes('thank you for using') && lowerMessage.includes('card')) ||
      (lowerMessage.includes('debit card') && lowerMessage.includes('for inr')) ||
      (lowerMessage.includes('inr') && lowerMessage.includes('account')) ||
      (lowerMessage.includes('egp') && lowerMessage.includes('card'))
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new HSBCBankParser();
