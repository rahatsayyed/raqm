import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Central Bank of India (CBoI) SMS messages
 */
export class CentralBankOfIndiaParser extends BankParser {
  getBankName(): string {
    return 'Central Bank of India';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('CENTBK') ||
      normalizedSender.includes('CBOI') ||
      normalizedSender.includes('CENTRALBANK') ||
      normalizedSender.includes('CENTRAL') ||
      // DLT patterns
      /^[A-Z]{2}-CENTBK-[A-Z]$/.test(normalizedSender) ||
      /^[A-Z]{2}-CBOI-[A-Z]$/.test(normalizedSender)
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!this.canHandle(sender)) return null;
    if (!this.isTransactionMessage(smsBody)) return null;

    const amount = this.extractAmount(smsBody);
    if (amount === null) return null;

    const transactionType = this.extractTransactionType(smsBody);
    if (transactionType === null) return null;

    const merchant = this.extractMerchant(smsBody, sender) ?? 'Unknown';

    return {
      amount,
      type: transactionType,
      merchant,
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      reference: this.extractReference(smsBody),
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
    };
  }

  extractAmount(message: string): number | null {
    // Pattern 1: Credited by Rs.50.00 / Debited by Rs.100.50
    const pattern1 = /(?:Credited|Debited)\s+by\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)/i;
    const match1 = message.match(pattern1);
    if (match1) {
      const amount = parseFloat(match1[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: Rs.XXX credited/debited
    const pattern2 = /Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+(?:credited|debited)/i;
    const match2 = message.match(pattern2);
    if (match2) {
      const amount = parseFloat(match2[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "By.NAME" or "By NAME" for NEFT/transfer credits (before bank suffix like -CBoI)
    const byPattern = /By[.\s]+(.+?)(?:-CBoI|-CBOI|-CENTBK|$)/i;
    const byMatch = message.match(byPattern);
    if (byMatch) {
      const merchant = this.cleanMerchantName(byMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "from [NAME]" for credits
    const fromPattern = /from\s+([A-Z0-9]+|[^\s]+?)(?:\s+via|\s+Ref|\s+\.|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = fromMatch[1].trim();
      // Handle masked UPI IDs
      if (merchant.includes('X')) {
        return 'UPI Transfer';
      }
      return this.cleanMerchantName(merchant);
    }

    // Pattern 3: "to [NAME]" for debits
    const toPattern = /to\s+([^\s]+?)(?:\s+via|\s+Ref|\s+\.|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: via UPI
    if (/via UPI/i.test(message)) {
      if (/Credited/i.test(message)) {
        return 'UPI Credit';
      } else if (/Debited/i.test(message)) {
        return 'UPI Payment';
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) return superResult;

    // Pattern 1: A/c xxxxxx1234 (CBoI NEFT format)
    const acSlashPattern = /A\/c\s+([xX*\d]+)/i;
    const acSlashMatch = message.match(acSlashPattern);
    if (acSlashMatch) {
      return this.extractLast4Digits(acSlashMatch[1]);
    }

    // Pattern 2: account XX3113
    const pattern1 = /account\s+([xX*\d]+)/i;
    const match1 = message.match(pattern1);
    if (match1) {
      return this.extractLast4Digits(match1[1]);
    }

    // Pattern 3: A/C ending XXXX
    const pattern2 = /A\/C\s+ending\s+([xX*\d]+)/i;
    const match2 = message.match(pattern2);
    if (match2) {
      return this.extractLast4Digits(match2[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern 1: Total Bal Rs.0000.99 CR
    const totalBalPattern = /Total\s+Bal\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+(CR|DR)/i;
    const totalBalMatch = message.match(totalBalPattern);
    if (totalBalMatch) {
      const balanceStr = totalBalMatch[1].replace(/,/g, '');
      const type = totalBalMatch[2].toUpperCase();
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) {
        return type === 'DR' ? -balance : balance;
      }
    }

    // Pattern 2: Clear Bal Rs.XXX CR
    const clearBalPattern = /Clear\s+Bal\s+Rs\.?\s*([\d,]+(?:\.\d{2})?)\s+(CR|DR)/i;
    const clearBalMatch = message.match(clearBalPattern);
    if (clearBalMatch) {
      const balanceStr = clearBalMatch[1].replace(/,/g, '');
      const type = clearBalMatch[2].toUpperCase();
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) {
        return type === 'DR' ? -balance : balance;
      }
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern: Ref No.541986000003
    const pattern = /Ref\s+No\.?\s*(\w+)/i;
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for CBoI-specific transaction keywords
    if (
      (lowerMessage.includes('credited by') || lowerMessage.includes('debited by')) &&
      lowerMessage.includes('bal')
    ) {
      return true;
    }

    // Check for signature
    if (lowerMessage.includes('-cboi')) {
      return lowerMessage.includes('credited') || lowerMessage.includes('debited');
    }

    return super.isTransactionMessage(message);
  }
}

export default new CentralBankOfIndiaParser();
