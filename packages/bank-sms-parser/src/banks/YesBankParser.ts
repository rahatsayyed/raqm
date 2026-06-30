import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Yes Bank SMS messages.
 *
 * Supported formats:
 * - Credit Card UPI: "INR XXX.XX spent on YES BANK Card XXXXX @UPI_MERCHANT DATE TIME. Avl Lmt INR XXX,XXX.XX"
 *
 * Common senders: CP-YESBNK-S, VM-YESBNK-S, JX-YESBNK-S
 */
export class YesBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Yes Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      /^[A-Z]{2}-YESBNK-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-YESBNK$/.test(normalizedSender) ||
      normalizedSender === 'YESBNK' ||
      normalizedSender === 'YESBANK'
    );
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/INR\s+([0-9,]+(?:\.\d{2})?)\s+spent/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return super.extractAmount(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const upiMatch = message.match(/@UPI_([^0-9]+?)(?:\s+\d{2}-\d{2}-\d{4})/i);
    if (upiMatch) {
      const merchant = upiMatch[1].replace(/\s+/g, ' ').trim();
      if (merchant.length > 0) return merchant;
    }

    const upiAltMatch = message.match(/@UPI_([A-Z\s]+)/i);
    if (upiAltMatch) {
      const merchant = upiAltMatch[1].replace(/\s+/g, ' ').trim();
      if (merchant.length > 0 && this.isValidMerchantName(merchant)) return merchant;
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const parent = super.extractAccountLast4(message);
    if (parent !== null) return parent;

    const cardMatch = message.match(/YES\s+BANK\s+Card\s+([X\d]+)/i);
    if (cardMatch) return this.extractLast4Digits(cardMatch[1]);

    const blkccMatch = message.match(/SMS\s+BLKCC\s+(\d{4})/i);
    if (blkccMatch) return blkccMatch[1] ?? null;

    return null;
  }

  protected extractAvailableLimit(message: string): number | null {
    const match = message.match(/Avl\s+Lmt\s+INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return super.extractAvailableLimit(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isInvestmentTransaction(lowerMessage)) return TransactionType.INVESTMENT;

    if (
      lowerMessage.includes('spent') &&
      lowerMessage.includes('yes bank card') &&
      lowerMessage.includes('avl lmt')
    ) {
      return TransactionType.CREDIT;
    }

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('verification') ||
      lowerMessage.includes('one time password')
    ) {
      return false;
    }

    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('discount')
    ) {
      return false;
    }

    const yesBankKeywords = [
      'spent on yes bank card',
      'debited',
      'credited',
      'withdrawn',
      'deposited',
      'avl lmt',
    ];

    if (yesBankKeywords.some(kw => lowerMessage.includes(kw))) return true;

    return super.isTransactionMessage(message);
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('yes bank card')) return true;
    if (lowerMessage.includes('sms blkcc')) return true;
    return super.detectIsCard(message);
  }
}

export default new YesBankParser();
