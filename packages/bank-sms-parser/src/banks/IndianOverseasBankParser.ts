import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class IndianOverseasBankParser extends BankParser {

  getBankName(): string {
    return 'Indian Overseas Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('IOB') ||
      normalizedSender.includes('IOBCHN');
  }

  extractAmount(message: string): number | null {
    const amountPatterns = [
      // "credited by Rs.906.00"
      /credited\s+by\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "debited by Rs.906.00"
      /debited\s+by\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "credited with Rs.906.00"
      /credited\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // "debited for Rs.906.00"
      /debited\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = match[1].replace(/,/g, '');
        const parsed = parseFloat(amount);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('credited by')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;

    if (lowerMessage.includes('debited by')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited for')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // UPI transaction with payer details
    // Pattern: "from SIDDHANT SIN-7737219900@su(UPI Ref"
    const upiPayerPattern = /from\s+([^(]+?)(?:\(UPI|$)/i;
    const upiPayerMatch = message.match(upiPayerPattern);
    if (upiPayerMatch) {
      const payer = upiPayerMatch[1].trim();

      // Check if it contains UPI ID
      if (payer.includes('@')) {
        // Extract name and UPI ID
        const parts = payer.split('-');
        if (parts.length >= 2) {
          const name = this.cleanMerchantName(parts[0].trim());
          const upiId = parts[1].trim();
          return `UPI - ${name} (${upiId})`;
        } else {
          return `UPI - ${this.cleanMerchantName(payer)}`;
        }
      } else {
        const cleanedPayer = this.cleanMerchantName(payer);
        if (this.isValidMerchantName(cleanedPayer)) {
          return cleanedPayer;
        }
      }
    }

    // Check for payer remark
    const remarkPattern = /Payer\s+Remark\s*-\s*([^-]+)/i;
    const remarkMatch = message.match(remarkPattern);
    if (remarkMatch) {
      const remark = this.cleanMerchantName(remarkMatch[1].trim());
      if (this.isValidMerchantName(remark) && remark.toLowerCase() !== 'paid via supe') {
        return remark;
      }
    }

    // Generic patterns for debit transactions
    if (message.toLowerCase().includes('debited')) {
      // Try to extract merchant from "to" or "for" patterns
      const toPattern = /(?:to|for)\s+([^,.-]+)/i;
      const toMatch = message.match(toPattern);
      if (toMatch) {
        const merchant = this.cleanMerchantName(toMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) {
      return parentResult;
    }

    // Pattern: "Your a/c no. XXXXX92"
    const accountPattern = /a\/c\s+no\.\s+([X\d]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern: "(UPI Ref no 560699645381)"
    const upiRefPattern = /\(UPI\s+Ref\s+no\s+(\d+)\)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Alternative pattern without parentheses
    const altUpiRefPattern = /UPI\s+Ref\s+no\s+(\d+)/i;
    const altUpiRefMatch = message.match(altUpiRefPattern);
    if (altUpiRefMatch) {
      return altUpiRefMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and non-transaction messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('verification') ||
      lowerMessage.includes('request') ||
      lowerMessage.includes('failed')
    ) {
      return false;
    }

    // Check for IOB specific transaction patterns
    if (
      lowerMessage.includes('is credited by') ||
      lowerMessage.includes('is debited by') ||
      lowerMessage.includes('credited with') ||
      lowerMessage.includes('debited for')
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new IndianOverseasBankParser();
