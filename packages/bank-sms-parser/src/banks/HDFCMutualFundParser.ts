import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * HDFC Mutual Fund parser for SIP purchase and redemption messages.
 * Handles senders like "AD-HDFCMF-AC", "VM-HDFCMF".
 */
export class HDFCMutualFundParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'HDFC Mutual Fund';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('HDFCMF');
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const keywords = [
      'sip purchase',
      'has been processed',
      'folio',
      'nav',
      'redemption',
    ];
    return keywords.some(kw => lowerMessage.includes(kw));
  }

  extractAmount(message: string): number | null {
    const pattern = /Rs\.?\s*([\d,]+\.?\d*)/;
    const match = message.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    const pattern = /under\s+(.+?)\s+for/i;
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('sip purchase') || lowerMessage.includes('purchase')) {
      return TransactionType.INVESTMENT;
    }
    if (lowerMessage.includes('redemption')) {
      return TransactionType.INCOME;
    }
    return null;
  }

  extractBalance(message: string): number | null {
    return null;
  }

  extractAccountLast4(message: string): string | null {
    return null;
  }
}

export default new HDFCMutualFundParser();
