import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for NMB Bank (Nabil Bank - Nepal) SMS messages
 *
 * Handles formats like:
 * - "Fund transfer of NPR 250.00 to A/C 01000000055 was successful"
 * - "A/C 0#16 withdrawn NPR 700.00 on 24/05/2025"
 * - "Your Esewa Wallet Load for 9850000007 of 300.00 is successful"
 *
 * Common sender: NMB_ALERT
 * Currency: NPR (Nepalese Rupee)
 */
export class NMBBankParser extends BankParser {

  getBankName(): string {
    return 'NMB Bank';
  }

  getCurrency(): string {
    return 'NPR';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('NMB') ||
      normalizedSender === 'NMB_ALERT' ||
      normalizedSender === 'NMBBANK' ||
      normalizedSender.includes('NABIL');
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "NPR 250.00" or "NPR 700.00"
    const nprPattern = /NPR\s+([0-9,]+(?:\.\d{2})?)/i;
    const nprMatch = message.match(nprPattern);
    if (nprMatch) {
      const amountStr = nprMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 2: "of 300.00" (for wallet loads without NPR prefix)
    const ofPattern = /of\s+([0-9,]+(?:\.\d{2})?)\s+is successful/i;
    const ofMatch = message.match(ofPattern);
    if (ofMatch) {
      const amountStr = ofMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Fund transfer = expense (money sent)
    if (lowerMessage.includes('fund transfer') ||
      (lowerMessage.includes('transfer') && lowerMessage.includes('to a/c'))
    ) {
      return TransactionType.EXPENSE;
    }

    // Withdrawn = expense
    if (lowerMessage.includes('withdrawn')) {
      return TransactionType.EXPENSE;
    }

    // Wallet load = expense (loading money into wallet)
    if (lowerMessage.includes('wallet load') || lowerMessage.includes('esewa wallet')) {
      return TransactionType.EXPENSE;
    }

    // Deposit = income
    if (lowerMessage.includes('deposited') || lowerMessage.includes('credited')) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "Fund transfer to A/C ..."
    if (message.toLowerCase().includes('fund transfer') ||
      message.toLowerCase().includes('transfer')
    ) {
      return 'Fund Transfer';
    }

    // Pattern 2: ATM/Cash withdrawal (contains "withdrawn" and account pattern)
    if (message.toLowerCase().includes('withdrawn')) {
      // Check if it mentions ATM or specific location
      const atmPattern = /at\s+([^.\n]+?)(?:\s+on|\.)/i;
      const atmMatch = message.match(atmPattern);
      if (atmMatch) {
        const location = this.cleanMerchantName(atmMatch[1].trim());
        if (this.isValidMerchantName(location)) {
          return `ATM - ${location}`;
        }
      }
      return 'ATM Withdrawal';
    }

    // Pattern 3: "Esewa Wallet Load for 9850000007"
    const esewaPattern = /Esewa Wallet Load for\s+(\d+)/i;
    if (message.match(esewaPattern)) {
      return 'Esewa Wallet Load';
    }

    // Pattern 4: Generic wallet load
    if (message.toLowerCase().includes('wallet load')) {
      return 'Wallet Load';
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) {
      return parentResult;
    }

    // Pattern 1: "A/C 01000000055" - extract last 4 digits
    const accountLongPattern = /A\/C\s+(\d{4,})/i;
    const accountLongMatch = message.match(accountLongPattern);
    if (accountLongMatch) {
      return this.extractLast4Digits(accountLongMatch[1]);
    }

    // Pattern 2: "A/C 0#16" - special format with # separator
    const accountHashPattern = /A\/C\s+(\d+)#(\d+)/i;
    const accountHashMatch = message.match(accountHashPattern);
    if (accountHashMatch) {
      const combined = accountHashMatch[1] + accountHashMatch[2];
      return this.extractLast4Digits(combined);
    }

    // Pattern 3: For transfers, extract destination account
    const toAccountPattern = /to A\/C\s+(\d+)/i;
    const toAccountMatch = message.match(toAccountPattern);
    if (toAccountMatch) {
      return this.extractLast4Digits(toAccountMatch[1]);
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: "(FBS:D:FPQR:523396049)" - transaction reference
    const fbsPattern = /\(FBS:D:FPQR:(\d+)\)/;
    const fbsMatch = message.match(fbsPattern);
    if (fbsMatch) {
      return fbsMatch[1];
    }

    // Pattern 2: Generic reference number pattern
    const refPattern = /Ref(?:erence)?[:\s]+([A-Z0-9]+)/i;
    const refMatch = message.match(refPattern);
    if (refMatch) {
      return refMatch[1];
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (lowerMessage.includes('otp') ||
      lowerMessage.includes('password') ||
      (lowerMessage.includes('click here to learn more') && !lowerMessage.includes('withdrawn'))
    ) {
      // Exception: "Enjoy the new features... A/C withdrawn" is still a transaction
      if (!lowerMessage.includes('withdrawn')) {
        return false;
      }
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'fund transfer',
      'withdrawn',
      'deposited',
      'wallet load',
      'successful',
      'credited',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }
}

export default new NMBBankParser();
