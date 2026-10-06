// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for the legacy NSDL Payments Bank (NSDLPB) SMS format; JIOPBS is handled by JioPaymentsBankParser.
 */
export class NSDLPaymentsBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'NSDL Payments Bank';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('NSDLPB');
  }

  extractAmount(message: string): number | null {
    const match = message.match(/Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    return super.extractAmount(message);
  }

  extractAccountLast4(message: string): string | null {
    const match = message.match(/A\/c(?:\s+no)?\s+([X\d]+)/i);
    if (match) {
      const last4 = this.extractLast4Digits(match[1]);
      if (last4) return last4;
    }

    return super.extractAccountLast4(message);
  }

  extractMerchant(message: string, _sender: string): string | null {
    // Capture the whole VPA up to ". " so dotted handles like business.name@oksbi survive
    const match = message.match(/for\s+linked\s+(.+?)(?:\.\s|$)/i);
    if (match) {
      let name = match[1].trim();
      if (name.includes('@')) name = name.substring(0, name.indexOf('@'));
      name = name.replace(/[.,;]+$/, '');
      const merchant = this.cleanMerchantName(name);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  extractReference(message: string): string | null {
    const match = message.match(/UPI\s+Ref(?:\s+No)?\s+(\d+)/i);
    if (match) return match[1];

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    return super.extractTransactionType(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('upi ref') &&
      (lowerMessage.includes('debited') || lowerMessage.includes('credited'))
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new NSDLPaymentsBankParser();
