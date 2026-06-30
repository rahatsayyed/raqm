import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for JioPay wallet transactions.
 * Handles messages from JA-JioPay-S and similar senders.
 *
 * Note: Wallet transactions are marked as CREDIT to avoid double-counting
 * (money already counted when loading wallet from bank account)
 */
export class JioPayParser extends BankParser {
  getBankName(): string {
    return 'JioPay';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('JIOPAY') ||
      normalizedSender.endsWith('-JIOPAY-S') ||
      normalizedSender.endsWith('-JIOPAY-T') ||
      normalizedSender === 'JM-JIOPAY'
    );
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "Plan Name : 249.00"
    const planPattern = /Plan\s+Name\s*:\s*([0-9,]+(?:\.\d{2})?)/i;
    const planMatch = message.match(planPattern);
    if (planMatch) {
      const amount = planMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Pattern 2: "Rs. 249.00" or "Rs 249"
    const rsPattern = /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const rsMatch = message.match(rsPattern);
    if (rsMatch) {
      const amount = rsMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Jio Recharge
    if (lowerMessage.includes('recharge successful') && lowerMessage.includes('jio number')) {
      const numberPattern = /Jio\s+Number\s*:\s*(\d{10})/i;
      const numberMatch = message.match(numberPattern);
      const number = numberMatch?.[1] ?? '';
      if (number.length > 0) {
        return `Jio Recharge - ${number.substring(0, 4)}****`;
      } else {
        return 'Jio Recharge';
      }
    }

    // Bill payment patterns
    if (lowerMessage.includes('bill payment')) {
      if (lowerMessage.includes('electricity')) return 'Electricity Bill';
      if (lowerMessage.includes('water')) return 'Water Bill';
      if (lowerMessage.includes('gas')) return 'Gas Bill';
      if (lowerMessage.includes('broadband')) return 'Broadband Bill';
      if (lowerMessage.includes('dth')) return 'DTH Recharge';
      return 'Bill Payment';
    }

    // Other recharges
    if (lowerMessage.includes('recharge')) {
      if (lowerMessage.includes('mobile')) return 'Mobile Recharge';
      if (lowerMessage.includes('dth')) return 'DTH Recharge';
      if (lowerMessage.includes('data')) return 'Data Recharge';
      return 'Recharge';
    }

    // Payment to merchant
    if (lowerMessage.includes('payment successful to')) {
      const toPattern = /payment\s+successful\s+to\s+([^.\n]+)/i;
      const toMatch = message.match(toPattern);
      if (toMatch) {
        return this.cleanMerchantName(toMatch[1].trim());
      }
      return 'JioPay Payment';
    }

    return super.extractMerchant(message, sender) ?? 'JioPay Transaction';
  }

  extractReference(message: string): string | null {
    // Pattern: "Transaction ID : BR000CAUBYON"
    const txnPattern = /Transaction\s+ID\s*:\s*([A-Z0-9]+)/i;
    const txnMatch = message.match(txnPattern);
    if (txnMatch) {
      return txnMatch[1];
    }

    return super.extractReference(message);
  }

  extractTransactionType(message: string): TransactionType {
    const lowerMessage = message.toLowerCase();
    // Bill payment confirmations ("Payment of Rs... has been received") are expenses
    if (lowerMessage.includes('payment of') && lowerMessage.includes('has been received')) {
      return TransactionType.EXPENSE;
    }
    // All JioPay wallet transactions are marked as CREDIT
    // to avoid double-counting (money was already debited when loading wallet)
    return TransactionType.CREDIT;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Reject bill notifications and reminders (not actual transactions)
    if (
      lowerMessage.includes('e-bill') ||
      lowerMessage.includes('bill has been sent') ||
      lowerMessage.includes('bill summary') ||
      lowerMessage.includes('payment due date') ||
      lowerMessage.includes('amount payable')
    ) {
      return false;
    }

    // JioPay messages don't use standard transaction keywords
    // but "recharge successful" indicates a transaction
    return lowerMessage.includes('recharge successful') || super.isTransactionMessage(message);
  }
}

export default new JioPayParser();
