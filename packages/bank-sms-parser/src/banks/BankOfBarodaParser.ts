import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Bank of Baroda (BOB) SMS messages
 */
export class BankOfBarodaParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Bank of Baroda';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('BOB') ||
      normalizedSender.includes('BARODA') ||
      normalizedSender.includes('BOBSMS') ||
      normalizedSender.includes('BOBTXN') ||
      normalizedSender.includes('BOBCRD') || // Credit card messages
      // DLT patterns
      /^[A-Z]{2}-BOBSMS-[A-Z]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOBTXN-[A-Z]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOB-[A-Z]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOBCRD-[A-Z]$/.test(normalizedSender) || // Credit card DLT pattern
      // Direct sender IDs
      normalizedSender === 'BOB' ||
      normalizedSender === 'BANKOFBARODA'
    );
  }

  extractAmount(message: string): number | null {
    // Pattern 0: ALERT: INR XXX.XX is spent (Credit card pattern - check first)
    const alertSpentPattern = /ALERT:\s*INR\s*([\d,]+(?:\.\d{2})?)\s+is\s+spent/i;
    const alertSpentMatch = message.match(alertSpentPattern);
    if (alertSpentMatch) {
      const amount = alertSpentMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 1: Rs.XX transferred from A/c (Transfer pattern)
    const transferPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+transferred\s+from/i;
    const transferMatch = message.match(transferPattern);
    if (transferMatch) {
      const amount = transferMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 2: Rs.80.00 Dr. from
    const drPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+Dr\.?\s+from/i;
    const drMatch = message.match(drPattern);
    if (drMatch) {
      const amount = drMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 3: credited with INR 70.00
    const creditPattern = /credited\s+with\s+INR\s+([\d,]+(?:\.\d{2})?)/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      const amount = creditMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 4: Rs.xxxxxx Credited to
    const creditPattern2 = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+Credited\s+to/i;
    const creditMatch2 = message.match(creditPattern2);
    if (creditMatch2) {
      const amount = creditMatch2[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 5: Cr. to redacted@ybl (UPI)
    const crPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+.*?Cr\.?\s+to/i;
    const crMatch = message.match(crPattern);
    if (crMatch) {
      const amount = crMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 6: Rs.xxxxx deposited in cash
    const cashDepositPattern = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+deposited\s+in\s+cash/i;
    const cashDepositMatch = message.match(cashDepositPattern);
    if (cashDepositMatch) {
      const amount = cashDepositMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: transferred from A/c to:Merchant Name (Transfer pattern)
    const transferToPattern = /transferred\s+from\s+A\/c\s+[^\s]+\s+to:\s*([^.]+?)(?:\.|$)/i;
    const transferToMatch = message.match(transferToPattern);
    if (transferToMatch) {
      const merchantRaw = transferToMatch[1].trim();
      // Clean up the merchant name (remove "Total Bal" and everything after if present)
      const merchant = merchantRaw.split(/\s+Total\s+Bal/i)[0].trim();
      if (this.isValidMerchantName(merchant)) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 2: Cr. to redacted@ybl (UPI VPA)
    const upiPattern = /Cr\.?\s+to\s+([^\s]+@[^\s.]+)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      const vpa = upiMatch[1];
      // Extract name from VPA if possible
      const name = vpa.split('@')[0];
      if (name === 'redacted') {
        return 'UPI Payment';
      } else {
        return this.cleanMerchantName(name);
      }
    }

    // Pattern 3: IMPS by Name of Person
    const impsPattern = /IMPS\/[\d]+\s+by\s+([^.]+?)(?:\s*\.|$)/i;
    const impsMatch = message.match(impsPattern);
    if (impsMatch) {
      const merchant = this.cleanMerchantName(impsMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: For UPI credits, extract from context
    if (message.toLowerCase().includes('upi')) {
      if (message.toLowerCase().includes('credited')) {
        return 'UPI Credit';
      } else if (message.toLowerCase().includes('dr.')) {
        return 'UPI Payment';
      }
    }

    // Pattern 5: For IMPS without clear merchant
    if (message.toLowerCase().includes('imps')) {
      return 'IMPS Transfer';
    }

    // Pattern 6: Cash deposit
    if (message.toLowerCase().includes('deposited in cash')) {
      return 'Cash Deposit';
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 0: BOBCARD ending 1234 (Credit card format)
    const bobCardPattern = /BOBCARD\s+ending\s+(\d{4})/i;
    const bobCardMatch = message.match(bobCardPattern);
    if (bobCardMatch) {
      return bobCardMatch[1];
    }

    // Pattern 1: A/C or A/c with masked account number
    const acPattern = /A\/[Cc]\s+([X.*\d]+)/i;
    const acMatch = message.match(acPattern);
    if (acMatch) {
      return this.extractLast4Digits(acMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern 1: AvlBal:Rsxxxxxcx or AvlBal: Rsxxxxxxx
    const avlBalPattern = /AvlBal:\s*Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const avlBalMatch = message.match(avlBalPattern);
    if (avlBalMatch) {
      const balanceStr = avlBalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 2: Total Bal:Rs.xxxxxxx
    const totalBalPattern = /Total\s+Bal:\s*Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const totalBalMatch = message.match(totalBalPattern);
    if (totalBalMatch) {
      const balanceStr = totalBalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }

    // Pattern 3: Avlbl Amt:Rs.xxxxxxxx
    const avlAmtPattern = /Avlbl\s+Amt:\s*Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const avlAmtMatch = message.match(avlAmtPattern);
    if (avlAmtMatch) {
      const balanceStr = avlAmtMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern 1: Ref:52211xxxxxx
    const refPattern1 = /Ref:\s*(\d+)/i;
    const refMatch1 = message.match(refPattern1);
    if (refMatch1) {
      return refMatch1[1];
    }

    // Pattern 2: UPI Ref No 510xxxxxxxxxx
    const upiRefPattern = /UPI\s+Ref\s+No\s+(\d+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Pattern 3: IMPS/5182xxxxxxx
    const impsRefPattern = /IMPS\/(\d+)/i;
    const impsRefMatch = message.match(impsRefPattern);
    if (impsRefMatch) {
      return impsRefMatch[1];
    }

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('spent on your bobcard')) return TransactionType.CREDIT;
    if (lowerMessage.includes('bobcard') && lowerMessage.includes('spent')) return TransactionType.CREDIT;
    if (lowerMessage.includes('bobcard') && lowerMessage.includes('is spent')) return TransactionType.CREDIT;

    // Debit/Expense patterns
    if (lowerMessage.includes('transferred from')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('dr.') || lowerMessage.includes('debited')) return TransactionType.EXPENSE;

    // Credit/Income patterns
    if (lowerMessage.includes('cr.') || lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  extractAvailableLimit(message: string): number | null {
    // Pattern for "Available credit limit is Rs 42,981.46"
    const creditLimitPattern = /Available\s+credit\s+limit\s+is\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const creditLimitMatch = message.match(creditLimitPattern);
    if (creditLimitMatch) {
      const limitStr = creditLimitMatch[1].replace(/,/g, '');
      const parsed = parseFloat(limitStr);
      if (!isNaN(parsed)) return parsed;
    }

    // Fall back to base class patterns
    return super.extractAvailableLimit(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for BOB-specific transaction keywords
    if (
      lowerMessage.includes('dr. from') ||
      lowerMessage.includes('cr. to') ||
      lowerMessage.includes('credited to a/c') ||
      lowerMessage.includes('credited with inr') ||
      lowerMessage.includes('deposited in cash') ||
      lowerMessage.includes('transferred from') || // Transfer transactions
      lowerMessage.includes('is spent') // Credit card transactions
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new BankOfBarodaParser();
