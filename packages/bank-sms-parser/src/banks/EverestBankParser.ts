import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Everest Bank (Nepal) - handles NPR currency transactions
 */
export class EverestBankParser extends BankParser {

  getBankName(): string {
    return 'Everest Bank';
  }

  getCurrency(): string {
    return 'NPR'; // Nepalese Rupee
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    // Numeric senders (phone numbers, short codes)
    if (/^\d{7,10}$/.test(sender)) {
      return true;
    }

    // Text-based senders
    if (
      upperSender === 'EVEREST' ||
      upperSender.includes('EVERESTBANK') ||
      upperSender.includes('EBL') ||
      upperSender === 'UJJ SH' ||
      upperSender === 'CWRD' || // ATM withdrawal code

      // DLT patterns for Nepal
      /^[A-Z]{2}-EVEREST-[A-Z]$/.test(upperSender)
    ) {
      return true;
    }

    return false;
  }

  protected extractAmount(message: string): number | null {
    // Everest Bank patterns: "NPR 520.00", "NPR 15,000.00"
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

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Debit transactions are expenses
    if (lowerMessage.includes('is debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited by')) return TransactionType.EXPENSE;

    // Credit transactions are income
    if (lowerMessage.includes('is credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited by')) return TransactionType.INCOME;

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern: "For: 9843368/{Payment type},{Receiver}"
    // Pattern: "For: {Receiver}/{Payment type},UJJ SH"
    // Pattern: "For: CWDR/521708008016/202508050854" (ATM)

    const forPattern = /For:\s*([^.]+?)(?:\.\s|$)/i;
    const forMatch = message.match(forPattern);
    if (forMatch) {
      const forContent = forMatch[1].trim();

      // ATM withdrawal pattern: "CWDR/521708008016/202508050854"
      if (forContent.toLowerCase().startsWith('cwdr/')) {
        return 'ATM Withdrawal';
      }

      // Fonepay/IBFT pattern: "FPY:IBFT:ref:id:BANKCODE"
      if (forContent.toLowerCase().startsWith('fpy:')) {
        const parts = forContent.split(':');
        const type = parts[1] !== undefined ? parts[1].toUpperCase() : 'Transfer';
        return `Fonepay ${type}`;
      }

      // Transfer pattern: "9843368/{Payment type},{Receiver}" or "{Receiver}/{Payment type},UJJ SH"
      if (forContent.includes('/') && forContent.includes(',')) {
        const parts = forContent.split(',');
        if (parts.length >= 2) {
          const beforeComma = parts[0].trim();
          const afterComma = parts[1].trim();

          // If before comma contains slash, take the part after slash
          if (beforeComma.includes('/')) {
            const slashParts = beforeComma.split('/');
            if (slashParts.length >= 2) {
              const paymentType = slashParts[1].trim();
              if (paymentType.length > 0 && !/^\d+$/.test(paymentType)) {
                return this.cleanMerchantName(paymentType);
              }
            }
          }

          // Otherwise use the part after comma if it's not just a code
          if (afterComma.length > 0 && afterComma !== 'UJJ SH') {
            return this.cleanMerchantName(afterComma);
          }
        }

        // Fallback to first meaningful part
        const allParts = forContent.replace(/,/g, '/').split('/');
        for (const part of allParts) {
          const cleanPart = part.trim();
          if (
            cleanPart.length > 0 &&
            !/^\d+$/.test(cleanPart) &&
            cleanPart !== 'UJJ SH'
          ) {
            return this.cleanMerchantName(cleanPart);
          }
        }
        return null;
      }

      // Simple pattern without slashes/commas
      if (forContent.length > 0) {
        return this.cleanMerchantName(forContent);
      }
      return null;
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null) {
      return superResult;
    }

    const accountPattern = /A\/c\s+([^\s]+)/i;
    const match = message.match(accountPattern);
    if (match) {
      const account = match[1].trim();
      if (account !== '{Account}') {
        return this.extractLast4Digits(account);
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Look for reference numbers in "For:" section
    // Pattern: "For: CWDR/521708008016/202508050854" - extract the reference numbers
    const forPattern = /For:\s*([^.]+?)(?:\.\s|$)/i;
    const forMatch = message.match(forPattern);
    if (forMatch) {
      const forContent = forMatch[1].trim();

      // For ATM withdrawals, extract the reference numbers
      if (forContent.includes('CWDR/')) {
        const parts = forContent.split('/');
        if (parts.length >= 3) {
          // Return the transaction reference (middle part) and timestamp
          return `${parts[1]}/${parts[2]}`;
        }
      }

      // For transfers, extract any numeric references
      const refPattern = /(\d{6,})/;
      const refMatch = forContent.match(refPattern);
      if (refMatch) {
        return refMatch[1];
      }
    }

    return super.extractReference(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Everest Bank specific transaction keywords
    const everestTransactionKeywords = [
      'dear customer',
      'your a/c',
      'is debited',
      'is credited',
      'debited by',
      'credited by',
      'for:',
      'never share password',
      'npr',
    ];

    if (everestTransactionKeywords.some((kw) => lowerMessage.includes(kw))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new EverestBankParser();
