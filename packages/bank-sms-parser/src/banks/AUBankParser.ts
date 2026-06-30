import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

// Hoisted so the regex isn't recompiled on every extractTransactionType call.
const DR_INR_REGEX = /\bdr\s+inr\b/;
const CR_INR_REGEX = /\bcr\s+inr\b/;

export class AUBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'AU Small Finance Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('AUBANK');
  }

  extractAmount(message: string): number | null {
    // Pattern 1: Credited INR XXX
    const creditedMatch = message.match(/Credited\s+INR\s+([0-9,]+(?:\.\d{2})?)\s+to/i);
    if (creditedMatch) {
      const amount = parseFloat(creditedMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: Debited INR XXX
    const debitedMatch = message.match(/Debited\s+INR\s+([0-9,]+(?:\.\d{2})?)\s+from/i);
    if (debitedMatch) {
      const amount = parseFloat(debitedMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2b: Short-form "Dr INR XXX" / "Cr INR XXX" (AU's newer SMS format)
    const shortFormMatch = message.match(/\b(?:Dr|Cr)\s+INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (shortFormMatch) {
      const amount = parseFloat(shortFormMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 3: INR XXX spent (credit card format)
    const spentMatch = message.match(/INR\s+([0-9,]+(?:\.\d{2})?)\s+spent/i);
    if (spentMatch) {
      const amount = parseFloat(spentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 4: withdrawn INR XXX
    const withdrawnMatch = message.match(/withdrawn\s+INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (withdrawnMatch) {
      const amount = parseFloat(withdrawnMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 0: Credit card format - "spent at MERCHANT on"
    const spentAtMatch = message.match(/spent\s+at\s+(.+?)\s+on\s+(?:AU\s+Bank|$)/i);
    if (spentAtMatch) {
      const merchant = this.cleanMerchantName(spentAtMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1: UPI/DR or UPI/CR format without Ref prefix: UPI/DR/ref/MERCHANT/IFSC/acct
    const upiDrCrMatch = message.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\/[A-Z]{4}\d*\/\d+/i);
    if (upiDrCrMatch) {
      const merchant = this.cleanMerchantName(upiDrCrMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1b: Short SMS form `UPI/DR/<ref>/<merchant>` with no IFSC follow-up
    // (e.g. AU's newer messages end the segment at a slash + letter or newline).
    // Reject the all-X "Bank Account XXXXX" placeholder AU uses when no merchant
    // name is available, then fall through to remaining patterns.
    const upiShortMatch = message.match(/UPI\/(?:DR|CR)\/\d+\/([^/\n]+?)(?:\/[A-Z]|\/\s|\n|$)/i);
    if (upiShortMatch) {
      const candidate = upiShortMatch[1].trim();
      if (!/Bank\s+Account\s+X+/i.test(candidate)) {
        const merchant = this.cleanMerchantName(candidate);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 2: UPI transactions - extract name from Ref UPI/.../.../.../name(account)
    const upiMatch = message.match(/Ref\s+UPI\/[^/]+\/[^/]+\/[^/]+\s+([^(]+)\([^)]+\)/i);
    if (upiMatch) {
      const merchant = this.cleanMerchantName(upiMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: Alternative UPI format - name in parentheses
    const upiParenMatch = message.match(/UPI\/[^/]+\/[^/]+\/[^/]+\s+[^(]*\(([^)]+)\)/i);
    if (upiParenMatch) {
      const merchant = this.cleanMerchantName(upiParenMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: ATM transactions
    if (message.toLowerCase().includes('atm') || message.toLowerCase().includes('withdrawn')) {
      return 'ATM Withdrawal';
    }

    // Pattern 5: General "to/from" patterns
    const toMatch = message.match(/(?:to|from)\s+([^.\n]+?)(?:\.\s*|$)/i);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant) && !merchant.toLowerCase().includes('a/c')) {
        return merchant;
      }
    }

    // Fall back to base class extraction
    return super.extractMerchant(message, sender);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credit card')) return TransactionType.CREDIT;

    // Short-form Dr/Cr (AU's newer SMS format) — checked before the long-form
    // keywords below so we don't false-match on substrings.
    if (DR_INR_REGEX.test(lowerMessage)) return TransactionType.EXPENSE;
    if (CR_INR_REGEX.test(lowerMessage)) return TransactionType.INCOME;

    // Income keywords
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;

    // Expense keywords
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  extractAccountLast4(message: string): string | null {
    const base = super.extractAccountLast4(message);
    if (base !== null && base !== undefined) return base;

    // Pattern for account number: "A/c XXXXX" or "A/c X7013" (with mask characters)
    const accountMatch = message.match(/A\/c\s+[A-Za-z]*(\d+)/i);
    if (accountMatch) {
      return this.extractLast4Digits(accountMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern for balance: "Bal INR XXX"
    const balanceMatch = message.match(/Bal\s+INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (balanceMatch) {
      const balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(balance)) return balance;
    }

    // Fall back to base class patterns
    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Check for AU Bank specific transaction keywords
    const auBankKeywords = [
      'credited inr',
      'debited inr',
      'withdrawn inr',
      'dr inr',
      'cr inr',
      'bal inr',
      'ref upi',
      'spent',
    ];

    // If any AU Bank specific pattern is found, it's likely a transaction
    if (auBankKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    // Fall back to base class for standard checks
    return super.isTransactionMessage(message);
  }
}

export default new AUBankParser();
