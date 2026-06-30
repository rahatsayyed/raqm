import { BankParser } from './BankParser';
import { TransactionType } from './types';

/**
 * Base class for Iranian bank parsers to share common logic.
 * Handles common Persian language transaction patterns and IRR currency.
 */
export abstract class BaseIranianBankParser extends BankParser {

  getCurrency(): string {
    return 'IRR';
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "مبلغ 1,500,000 ریال" or "مبلغ 1,500,000 تومان"
    const patterns = [
      /مبلغ\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:ریال|تومان)/,
      // Pattern 2: amount followed directly by keyword
      /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:ریال|تومان)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const cleanAmount = match[1].replace(/,/g, '');
        const amountValue = parseFloat(cleanAmount);
        if (!isNaN(amountValue) && amountValue >= 1000) {
          return amountValue;
        }
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    if (
      lowerMessage.includes('برداشت') ||
      lowerMessage.includes('پرداخت') ||
      lowerMessage.includes('خرید') ||
      lowerMessage.includes('انتقال') ||
      lowerMessage.includes('مصرف')
    ) {
      return TransactionType.EXPENSE;
    }

    if (
      lowerMessage.includes('واریز') ||
      (lowerMessage.includes('credited') && !lowerMessage.includes('block'))
    ) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const cardPattern = /(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})/;
    const match = message.match(cardPattern);
    if (match) {
      return `Card ${match[1]}`;
    }
    return null;
  }

  protected extractReference(_message: string): string | null {
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const fromBase = super.extractAccountLast4(message);
    if (fromBase !== null) {
      return fromBase;
    }
    const cardPattern = /\d{4}[-\s]?(\d{4})/;
    const match = message.match(cardPattern);
    if (match) {
      return match[1];
    }
    return null;
  }

  protected extractBalance(message: string): number | null {
    const balancePattern = /مانده\s*:?\s*(\d{1,3}(?:,\d{3})*)/;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const cardKeywords = [
      'کارت', 'card', 'debit card', 'credit card', 'کارت بدهی', 'کارت اعتباری',
    ];
    return cardKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('رمز یکبار مصرف') ||
      lowerMessage.includes('کد تایید')
    ) {
      return false;
    }

    if (
      lowerMessage.includes('تبلیغ') ||
      lowerMessage.includes('پیشنهاد') ||
      lowerMessage.includes('تخفیف') ||
      lowerMessage.includes('cashback offer')
    ) {
      return false;
    }

    if (lowerMessage.includes('درخواست') && lowerMessage.includes('پرداخت')) {
      return false;
    }

    const transactionKeywords = [
      'مبلغ', 'ریال', 'تومان', 'irr', 'toman',
      'برداشت', 'واریز', 'پرداخت', 'خرید', 'انتقال',
      'debit', 'credit', 'spent', 'received', 'transferred', 'paid',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant.trim();
  }

  protected isValidMerchantName(name: string): boolean {
    const commonWords = new Set([
      'USING', 'VIA', 'THROUGH', 'BY', 'WITH', 'FOR', 'TO', 'FROM', 'AT', 'THE',
      'استفاده', 'از', 'توسط', 'از طریق', 'برای', 'به', 'در', 'و', 'با',
    ]);

    return (
      name.length >= 2 &&
      /\p{L}/u.test(name) &&
      !commonWords.has(name.toUpperCase()) &&
      !/^\d+$/.test(name) &&
      !name.includes('@')
    );
  }
}
