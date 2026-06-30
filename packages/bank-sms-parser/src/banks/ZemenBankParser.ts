import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/**
 * Parser for Zemen Bank - handles ETB currency transactions.
 */
export class ZemenBankParser extends BankParser {

  getBankName(): string {
    return 'Zemen Bank';
  }

  getCurrency(): string {
    return 'ETB';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().trim();
    return (
      normalized === 'ZEMEN BANK' ||
      normalized.replace(/ /g, '') === 'ZEMENBANK' ||
      /^[A-Z]{2}-ZEMENBANK-[A-Z]$/.test(normalized)
    );
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(/(?:ETB|Birr)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const parsed = parseFloat(raw);
      return isNaN(parsed) ? null : parsed;
    }
    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('credited with')) return TransactionType.INCOME;
    if (lowerMessage.includes('has been debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited with')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('fund transfer has been made from')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('pos transaction has been made from')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm cash withdrawal has been made from')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('you have transfered')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('you have transferred')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transferred') && lowerMessage.includes('from a/c')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const telebirrFromMatch = message.match(/from\s+(telebirr wallet\s+\d+)\s+with reference/i);
    if (telebirrFromMatch) {
      const merchant = telebirrFromMatch[1];
      if (merchant.length > 0) return merchant;
    }

    const telebirrToMatch = message.match(/to\s+(telebirr wallet\s+\d+)\s+with reference/i);
    if (telebirrToMatch) {
      const merchant = telebirrToMatch[1];
      if (merchant.length > 0) return merchant;
    }

    const toAccountMatch = message.match(/to\s+A\/c\s+of\s+(\d{6,})/i);
    if (toAccountMatch) {
      const merchant = toAccountMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    const fromOtherBankMatch = message.match(/from\s+([^,.]+?)\s+with reference/i);
    if (fromOtherBankMatch) {
      const merchant = this.cleanMerchantName(fromOtherBankMatch[1]).trim();
      if (merchant.length > 0 && this.isValidMerchantName(merchant)) return merchant;
    }

    const posPurchaseMatch = message.match(/pos purchase transaction at\s+(.+?)\s+on\s+\d{1,2}-[A-Za-z]{3}-\d{4}/i);
    if (posPurchaseMatch) {
      const merchant = this.cleanMerchantName(posPurchaseMatch[1]).trim();
      if (merchant.length > 0) return merchant;
    }

    const posLocationMatch = message.match(/transaction POS location is\s+(.+?)\s*\. /i);
    if (posLocationMatch) {
      const merchant = posLocationMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    const externalBeneficiaryMatch = message.match(/to\s+(.+?)\s+with reference/i);
    if (externalBeneficiaryMatch) {
      const merchant = externalBeneficiaryMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    const atmLocationMatch = message.match(/transaction ATM location is\s+(.+?)\s*\. /i);
    if (atmLocationMatch) {
      const merchant = atmLocationMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    const parent = super.extractAccountLast4(message);
    if (parent !== null) return parent;

    const maskedMatch = message.match(/\b\d{3}x+(\d{4})\b/i);
    if (maskedMatch) return maskedMatch[1] ?? null;

    const parenMatch = message.match(/\(\d{3}x+(\d{4})\)/i);
    if (parenMatch) return parenMatch[1] ?? null;

    return null;
  }

  protected extractBalance(message: string): number | null {
    const currentBalMatch = message.match(/Your\s+Current\s+Balance\s+is\s+(?:ETB|Birr)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (currentBalMatch) {
      const parsed = parseFloat(currentBalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    const availBalMatch = message.match(/A\/c\s+Available\s+Bal\.\s+is\s+(?:ETB|Birr)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (availBalMatch) {
      const parsed = parseFloat(availBalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    const yourAvailBalMatch = message.match(/Your\s+available\s+balance\s+is\s+(?:ETB|Birr)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (yourAvailBalMatch) {
      const parsed = parseFloat(yourAvailBalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) return parsed;
    }

    return super.extractBalance(message);
  }

  protected extractReference(message: string): string | null {
    const txnRefMatch = message.match(/transaction reference number is\s+([A-Z0-9]+)/i);
    if (txnRefMatch) return txnRefMatch[1] ?? null;

    const withRefMatch = message.match(/with reference\s+([A-Z0-9]+)/i);
    if (withRefMatch) return withRefMatch[1] ?? null;

    const linkMatch = message.match(/(https:\/\/share\.zemenbank\.com\/[^\s]+?\/pdf)/i);
    if (linkMatch) return linkMatch[1] ?? null;

    return super.extractReference(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const zemenKeywords = [
      'dear customer',
      'your account',
      'has been credited',
      'has been debited',
      'fund transfer has been made from',
      'pos transaction has been made from',
      'atm cash withdrawal has been made from',
      'current balance',
      'available bal.',
      'thank you for banking with zemen bank',
      'etb',
      'birr',
    ];

    if (zemenKeywords.some(kw => lowerMessage.includes(kw))) return true;

    return super.isTransactionMessage(message);
  }
}

export default new ZemenBankParser();
