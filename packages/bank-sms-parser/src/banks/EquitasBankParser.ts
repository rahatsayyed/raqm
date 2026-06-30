import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class EquitasBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Equitas Small Finance Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('EQUTAS') ||
      normalizedSender.includes('EQUITA') ||
      normalizedSender.includes('EQUITS')
    );
  }

  extractAmount(message: string): number | null {
    // Pattern: "INR XXX.00 debited" or "INR XXX.00 credited"
    const amountPattern = /INR\s+([0-9,]+(?:\.\d{2})?)\s+(?:debited|credited)/i;
    const match = message.match(amountPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    const isDebit = lowerMessage.includes('debited');
    const isCredit = lowerMessage.includes('credited');

    if (isDebit) {
      // Pattern for UPI debit: "to MERCHANT_NAME." or "to MERCHANT_NAME. Avl"
      // Look for "to" after the date pattern (on DD-MM-YY)
      const toPattern = /on\s+\d{2}-\d{2}-\d{2}\s+to\s+([^.]+?)(?:\.\s*Avl|\.\s*Not|\.Not|\.$)/i;
      const match = message.match(toPattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    if (isCredit) {
      // Pattern for UPI credit: "on DD-MM-YY from SENDER_NAME. Avl"
      const fromPattern = /on\s+\d{2}-\d{2}-\d{2}\s+from\s+([^.]+?)(?:\.\s*Avl|\.\s*Not|\.Not|\.$)/i;
      const match = message.match(fromPattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Check for UPI pattern
    if (/via UPI/i.test(message)) {
      return 'UPI Transaction';
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) return parentResult;

    // Pattern: "Equitas A/c 12XX" or "A/c XX1234"
    const acPattern = /(?:Equitas\s+)?A\/c\s+([X\d]+)/i;
    const match = message.match(acPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Avl Bal is INR XX,XXX.XX" or "Avl Bal is INR XXXXX"
    const balancePattern = /Avl\s+Bal\s+is\s+INR\s+([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern: "-Ref:57198707XXXX" or "Ref:XXXX"
    const refPattern = /-?Ref[:\s]*([A-Z0-9]+)/i;
    const match = message.match(refPattern);
    if (match) {
      return match[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Skip promotional messages
    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer')
    ) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'debited', 'credited', 'withdrawn', 'deposited',
      'transferred', 'received', 'paid',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export default new EquitasBankParser();
