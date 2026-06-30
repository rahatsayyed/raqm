import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Faysal Bank (Pakistan) app notifications and SMS.
 *
 * Handles formats like:
 * "PKR 55.000.00 sent to RECIPIENT A/C *9901 via IBFT from FBL A/C *4647 on 06-FEB-2026 02:22 PM Ref # 960855."
 */
export class FaysalBankParser extends BankParser {

  getBankName(): string {
    return 'Faysal Bank';
  }

  getCurrency(): string {
    return 'PKR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().replace(/ /g, '');
    return (
      normalized.includes('FAYSAL') ||
      normalized.includes('FBL') ||
      normalized.includes('AVANZA.AMBITWIZFBL') ||
      normalized === '8756'
    );
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const hasCurrency = lowerMessage.includes('pkr');
    const hasTransferKeyword =
      lowerMessage.includes('sent to') ||
      lowerMessage.includes('transfer') ||
      lowerMessage.includes('ibft') ||
      lowerMessage.includes('received') ||
      lowerMessage.includes('debit card purchase') ||
      lowerMessage.includes('atm cash withdrawal');
    return hasCurrency && hasTransferKeyword;
  }

  protected extractAmount(message: string): number | null {
    const amountPattern = /PKR\s*([0-9.,]+)/i;
    const match = message.match(amountPattern);
    if (match) {
      const rawAmount = match[1].replace(/,/g, '');
      const dotCount = (rawAmount.match(/\./g) ?? []).length;
      const normalizedAmount = dotCount > 1
        ? (() => {
            const lastDot = rawAmount.lastIndexOf('.');
            const wholePart = rawAmount.substring(0, lastDot).replace(/\./g, '');
            const fractionalPart = rawAmount.substring(lastDot + 1);
            return `${wholePart}.${fractionalPart}`;
          })()
        : rawAmount;
      const parsed = parseFloat(normalizedAmount);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('debit card purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm cash withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('sent to')) return TransactionType.TRANSFER;
    if (lowerMessage.includes('received') || lowerMessage.includes('credited')) return TransactionType.INCOME;
    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const cardPattern = /debit card purchase at\s+(.+?)\s+from/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return this.cleanMerchantName(
        cardMatch[1]
          .replace(/\*/g, '')
          .replace(/,/g, '')
          .trim()
      );
    }

    const receivedFromPattern = /received\s+(?:pkr\s+[0-9.,]+\s+)?(?:via\s+\w+\s+)?from\s+([A-Za-z\s.]+?)\s+(?:A\/C|IBAN)/i;
    const receivedFromMatch = message.match(receivedFromPattern);
    if (receivedFromMatch) {
      const merchant = this.cleanMerchantName(receivedFromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const beneficiaryPattern = /sent to\s+([A-Za-z.\s]+?)\s+A\/C/i;
    const beneficiaryMatch = message.match(beneficiaryPattern);
    if (beneficiaryMatch) {
      return beneficiaryMatch[1].trim().replace(/\s+/g, ' ');
    }

    if (message.toLowerCase().includes('atm cash withdrawal')) {
      return 'ATM Cash Withdrawal';
    }

    if (message.toLowerCase().includes('received from')) {
      const fallbackPattern = /received from\s+([A-Za-z\s.]+)/i;
      const fallbackMatch = message.match(fallbackPattern);
      if (fallbackMatch) {
        const merchant = this.cleanMerchantName(fallbackMatch[1].trim());
        if (this.isValidMerchantName(merchant)) return merchant;
      }
    }

    return 'IBFT Transfer';
  }

  protected extractAccountLast4(message: string): string | null {
    const patterns = [
      /FBL\s+A\/C\s*[*#Xx]+(\d{4})/i,
      /A\/c\s*#?\s*[*#Xx]+(\d{4})/i,
      /A\/C\s*[*#Xx]+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const matches = [...message.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))];
      if (matches.length > 0) {
        return matches[matches.length - 1][1];
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    const referencePattern = /Ref\s*#?:?\s*([A-Za-z0-9-]+)/i;
    const match = message.match(referencePattern);
    if (match) {
      return match[1];
    }
    return super.extractReference(message);
  }

  protected detectIsCard(message: string): boolean {
    if (message.toLowerCase().includes('debit card purchase')) {
      return true;
    }
    return super.detectIsCard(message);
  }
}

export default new FaysalBankParser();
