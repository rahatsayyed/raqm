import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Laxmi Sunrise Bank (Nepal) - handles NPR currency transactions
 */
export class LaxmiBankParser extends BankParser {

  getBankName(): string {
    return 'Laxmi Sunrise Bank';
  }

  getCurrency(): string {
    return 'NPR'; // Nepalese Rupee
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'LAXMI_ALERT' ||
      upperSender.includes('LAXMI') ||
      upperSender.includes('LAXMISUNRISE') ||
      // DLT patterns for Nepal might be different
      /^[A-Z]{2}-LAXMI-[A-Z]$/.test(upperSender)
    );
  }

  extractAmount(message: string): number | null {
    // Laxmi patterns: "NPR 720.00", "NPR 60,892.00"
    const patterns = [
      /NPR\s+([0-9,]+(?:\.[0-9]{2})?)\s/i,
      /NPR\s+([0-9,]+(?:\.[0-9]{2})?)(?:\s|$)/i,
      /(?:debited|credited)\s+by\s+NPR\s+([0-9,]+(?:\.[0-9]{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('has been debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited by')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited by')) return TransactionType.INCOME;

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: Extract from Remarks field
    // "Remarks:ESEWA LOAD/9763698550,127847587"
    // "Remarks:(STIPEND PMT DM/MCH-SHRAWAN82)"
    const remarksPattern = /Remarks:\s*\(?([^)]+)\)?/i;
    const remarksMatch = message.match(remarksPattern);
    if (remarksMatch) {
      const remarks = remarksMatch[1].trim();
      if (remarks.length > 0) {
        // Clean up the remarks to extract merchant info
        let cleanedRemarks: string;
        if (remarks.includes('ESEWA LOAD')) {
          cleanedRemarks = 'ESEWA';
        } else if (remarks.includes('STIPEND PMT')) {
          cleanedRemarks = 'Stipend Payment';
        } else if (remarks.includes('/')) {
          cleanedRemarks = remarks.split('/')[0].trim();
        } else {
          cleanedRemarks = remarks;
        }
        return this.cleanMerchantName(cleanedRemarks);
      }
    }

    // Fallback: if no specific remarks pattern, try to extract meaningful info
    if (/ESEWA/i.test(message)) {
      return 'ESEWA';
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) {
      return parentResult;
    }

    // Pattern: "Your #12344560 has been"
    const accountPattern = /Your\s+#(\d+)\s+has\s+been/i;
    const match = message.match(accountPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Look for date in DD/MM/YY format: "on 05/09/25"
    const datePattern = /on\s+(\d{2}\/\d{2}\/\d{2})/i;
    const dateMatch = message.match(datePattern);
    if (dateMatch) {
      return dateMatch[1];
    }

    // Look for transaction references in remarks
    const remarksRefPattern = /Remarks:.*?([0-9]{6,})/i;
    const remarksRefMatch = message.match(remarksRefPattern);
    if (remarksRefMatch) {
      return remarksRefMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Laxmi specific transaction keywords
    const laxmiTransactionKeywords = [
      'dear customer',
      'has been debited',
      'has been credited',
      'laxmi sunrise',
      'remarks:',
      'npr',
    ];

    if (laxmiTransactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new LaxmiBankParser();
