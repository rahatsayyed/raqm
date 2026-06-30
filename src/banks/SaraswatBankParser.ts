import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class SaraswatBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Saraswat Co-operative Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();

    const saraswatSenders = new Set([
      'SARBNK',
      'SARASWAT',
      'SARASWATBANK',
    ]);

    if (saraswatSenders.has(normalizedSender)) return true;

    return /^[A-Z]{2}-SARBNK-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-SARASWAT-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-SARBNK$/.test(normalizedSender) ||
      /^[A-Z]{2}-SARASWAT$/.test(normalizedSender);
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "INR 115.50" or "INR 10,000.00"
    const inrPattern = /INR\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const inrMatch = message.match(inrPattern);
    if (inrMatch) {
      const amountStr = inrMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: Rs. format
    const rsPattern = /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const rsMatch = message.match(rsPattern);
    if (rsMatch) {
      const amountStr = rsMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "towards ACH Credit:GUJARAT GAS LIMITED"
    const towardsPattern = /towards\s+(.+?)(?:\.\s*Current|\s*Current|$)/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      const merchant = towardsMatch[1].trim();
      const cleanedMerchant = merchant
        .replace(/^ACH\s+Credit:\s*/i, '')
        .replace(/^ACH\s+Debit:\s*/i, '')
        .trim();
      if (this.isValidMerchantName(cleanedMerchant)) {
        return this.cleanMerchantName(cleanedMerchant);
      }
    }

    // Pattern 2: "for S.I." or "for NEFT" etc.
    const forPattern = /for\s+([A-Z.]+?)(?:\.\s+Current|\s+Current|$)/i;
    const forMatch = message.match(forPattern);
    if (forMatch) {
      const merchant = forMatch[1].trim().replace(/\.$/, '');
      switch (merchant.toUpperCase()) {
        case 'S.I': return 'Standing Instruction';
        case 'SI': return 'Standing Instruction';
        case 'NEFT': return 'NEFT Transfer';
        case 'RTGS': return 'RTGS Transfer';
        case 'IMPS': return 'IMPS Transfer';
        default: return merchant;
      }
    }

    // Pattern 3: ATM withdrawal
    if (/ATM/i.test(message) || /withdrawn/i.test(message)) {
      return 'ATM Withdrawal';
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: "A/c no. 013460" or "A/c no. ending with 013460"
    const accountNoPattern = /A\/c\s+no\.\s+(?:ending\s+with\s+)?(\d{4,6})/i;
    const accountNoMatch = message.match(accountNoPattern);
    if (accountNoMatch) {
      return this.extractLast4Digits(accountNoMatch[1]);
    }

    // Pattern 2: "account no. ending with 013460"
    const endingWithPattern = /account\s+no\.\s+ending\s+with\s+(\d{4,6})/i;
    const endingWithMatch = message.match(endingWithPattern);
    if (endingWithMatch) {
      return this.extractLast4Digits(endingWithMatch[1]);
    }

    // Pattern 3: "A/c *1234"
    const pattern3 = /A\/c\s+([*\d]+)/i;
    const pattern3Match = message.match(pattern3);
    if (pattern3Match) {
      return this.extractLast4Digits(pattern3Match[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern 1: "Current Bal is INR 941.23 CR" or "Current Bal is INR 8,256.97CR"
    const currentBalPattern = /Current\s+Bal\s+is\s+INR\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:CR|DR)?/i;
    const currentBalMatch = message.match(currentBalPattern);
    if (currentBalMatch) {
      const balanceStr = currentBalMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) return balance;
    }

    // Pattern 2: "Bal: Rs. 1000.00"
    const balPattern = /Bal[:\s]+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const balMatch = message.match(balPattern);
    if (balMatch) {
      const balanceStr = balMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) return balance;
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and verification messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Saraswat Bank specific transaction keywords
    const saraswatTransactionKeywords = [
      'is credited with',
      'is debited with',
      'credited with inr',
      'debited with inr',
      'current bal is',
    ];

    if (saraswatTransactionKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Fall back to base class for standard checks
    return super.isTransactionMessage(message);
  }
}

export default new SaraswatBankParser();
