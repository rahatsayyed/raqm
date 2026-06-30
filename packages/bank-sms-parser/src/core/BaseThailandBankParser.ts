import { BankParser } from './BankParser';
import { TransactionType } from './types';

/**
 * Base class for Thai bank parsers to share common logic.
 * Handles both Thai and English language transaction patterns with THB currency.
 */
export abstract class BaseThailandBankParser extends BankParser {

  getCurrency(): string {
    return 'THB';
  }

  protected extractAmount(message: string): number | null {
    const patterns = [
      // Pattern 1: "1,250.00 THB" or "1,250.00 บาท"
      /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:THB|บาท)/,
      // Pattern 2: "THB 1,250.00" or "฿ 1,250.00"
      /(?:THB|฿)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/,
      // Pattern 3: "1,250.00 USD" for international transactions
      /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*USD/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const cleanAmount = match[1].replace(/,/g, '');
        const parsed = parseFloat(cleanAmount);
        if (!isNaN(parsed)) {
          return parsed;
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

    // Credit card spending (check before expense — "ยอดใช้จ่าย" contains "ใช้จ่าย")
    if (
      lowerMessage.includes('credit card spending') ||
      lowerMessage.includes('ยอดใช้จ่ายต่างประเทศ') ||
      lowerMessage.includes('ยอดใช้จ่าย')
    ) {
      return TransactionType.CREDIT;
    }

    // Thai and English expense keywords
    if (
      lowerMessage.includes('เงินออก') ||
      lowerMessage.includes('ถอนเงิน') ||
      lowerMessage.includes('ถอนเงินสด') ||
      lowerMessage.includes('โอนเงินออก') ||
      lowerMessage.includes('โอนเงินผ่าน') ||
      lowerMessage.includes('ใช้จ่ายบัตร') ||
      lowerMessage.includes('ใช้จ่าย') ||
      lowerMessage.includes('withdrawal') ||
      lowerMessage.includes('payment') ||
      lowerMessage.includes('you spent') ||
      lowerMessage.includes('transfer out') ||
      lowerMessage.includes('card payment') ||
      lowerMessage.includes('card transaction') ||
      lowerMessage.includes('atm withdrawal')
    ) {
      return TransactionType.EXPENSE;
    }

    // Thai and English income keywords
    if (
      lowerMessage.includes('เงินเข้า') ||
      lowerMessage.includes('เงินฝาก') ||
      lowerMessage.includes('รับเงิน') ||
      lowerMessage.includes('โอนเงินเข้า') ||
      lowerMessage.includes('รับเงินพร้อมเพย์') ||
      lowerMessage.includes('รับเงินโอน') ||
      lowerMessage.includes('เงินฝากเข้า') ||
      lowerMessage.includes('deposit') ||
      lowerMessage.includes('receive') ||
      lowerMessage.includes('transfer in') ||
      lowerMessage.includes('transfer received')
    ) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    const patterns = [
      /(?:Bal|คงเหลือ)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:THB|บาท)/i,
      /(?:Bal|คงเหลือ)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const cleanAmount = match[1].replace(/,/g, '');
        const parsed = parseFloat(cleanAmount);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const fromBase = super.extractAccountLast4(message);
    if (fromBase !== null) {
      return fromBase;
    }
    // Pattern: "A/C xNNNN" or "บช xNNNN"
    const pattern = /(?:A\/C|บช)\s*x(\d{4})/i;
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const patterns = [
      /(?:at|ร้าน)\s+([A-Za-z0-9\s&._-]+?)(?:\s+(?:A\/C|บช|Bal|คงเหลือ|Available|on|$))/i,
      /(?:at|ร้าน)\s+([A-Za-z0-9\s&._-]+)$/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    return null;
  }

  protected extractAvailableLimit(message: string): number | null {
    const pattern = /(?:Available limit|วงเงินคงเหลือ)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:THB|บาท)/i;
    const match = message.match(pattern);
    if (match) {
      const cleanAmount = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanAmount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  isCreditCardMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const cardKeywords = [
      'credit card', 'บัตรเครดิต',
      'card spending', 'card payment', 'card transaction',
      'ใช้จ่ายบัตร', 'ยอดใช้จ่าย',
    ];
    return cardKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('รหัส') ||
      lowerMessage.includes('ยืนยัน')
    ) {
      return false;
    }

    // Skip promotional messages
    if (
      lowerMessage.includes('สมัคร') ||
      lowerMessage.includes('โปรโมชั่น') ||
      lowerMessage.includes('promotion') ||
      lowerMessage.includes('cashback offer')
    ) {
      return false;
    }

    const transactionKeywords = [
      // Thai
      'เงินเข้า', 'เงินออก', 'ถอนเงิน', 'โอนเงิน', 'ใช้จ่าย',
      'เงินฝาก', 'รับเงิน', 'คงเหลือ', 'บาท', 'ยอดใช้จ่าย',
      // English
      'withdrawal', 'deposit', 'transfer', 'payment', 'spent',
      'receive', 'bal', 'thb', 'card transaction', 'card payment',
      'credit card spending', 'available limit',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant.trim();
  }

  protected isValidMerchantName(name: string): boolean {
    const commonWords = new Set([
      'USING', 'VIA', 'THROUGH', 'BY', 'WITH', 'FOR', 'TO', 'FROM', 'AT', 'THE',
      'ผ่าน', 'โดย', 'จาก', 'ที่', 'ไปยัง', 'ถึง',
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
