import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Utkarsh Small Finance Bank (SFBL) SuperCard credit card transactions.
 * Handles messages from UTKSPR and similar senders.
 */
export class UtkarshBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Utkarsh Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('UTKSPR') ||
      normalizedSender.includes('UTKARSH') ||
      normalizedSender.includes('UTKSFB')
    );
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "for UPI - merchant/reference"
    const upiMatch = message.match(/for\s+UPI\s*[-–]\s*([^\s.]+)/i);
    if (upiMatch) {
      const merchant = upiMatch[1].trim();
      if (!/^[x0-9]+$/i.test(merchant)) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 2: "for merchant on date"
    const forMatch = message.match(/for\s+([^0-9][^\s]+?)(?:\s+on\s+|\s+at\s+|$)/i);
    if (forMatch) {
      const merchant = forMatch[1].trim();
      if (
        !merchant.toUpperCase().startsWith('UPI') &&
        !merchant.toUpperCase().startsWith('INR')
      ) {
        return this.cleanMerchantName(merchant);
      }
    }

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('supercard') && lowerMessage.includes('upi')) {
      return 'UPI Payment';
    }

    return super.extractMerchant(message, sender) ?? 'Utkarsh SuperCard';
  }

  protected extractTransactionType(_message: string): TransactionType {
    return TransactionType.CREDIT;
  }

  protected extractAccountLast4(message: string): string | null {
    const parent = super.extractAccountLast4(message);
    if (parent !== null) return parent;

    const cardMatch = message.match(/SuperCard\s+([xX*\d]+)/i);
    if (cardMatch) return this.extractLast4Digits(cardMatch[1]);

    const accountMatch = message.match(/(?:account|a\/c)\s+([xX*\d]+)/i);
    if (accountMatch) return this.extractLast4Digits(accountMatch[1]);

    return null;
  }
}

export default new UtkarshBankParser();
