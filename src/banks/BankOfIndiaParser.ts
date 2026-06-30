import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Bank of India (BOI) SMS messages.
 *
 * Handles formats like:
 * - "Rs.200.00 debited A/cXX5468 and credited to SAI MISAL via UPI Ref No 315439383341 on 23Aug25. Call 18001031906, if not done by you. -BOI"
 * - Other BOI transaction formats
 */
export class BankOfIndiaParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Bank of India';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();

    // Direct sender IDs
    const boiSenders = new Set([
      'BOIIND',
      'BOIBNK',
    ]);

    if (boiSenders.has(normalizedSender)) return true;

    // DLT patterns (XX-BOIIND-S/T or XX-BOIBNK-S/T format)
    return /^[A-Z]{2}-BOIIND-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOIBNK-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOI-[ST]$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOIIND$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOIBNK$/.test(normalizedSender) ||
      /^[A-Z]{2}-BOI$/.test(normalizedSender) ||
      /^BK-BOIIND.*$/.test(normalizedSender) ||
      /^JD-BOIIND.*$/.test(normalizedSender);
  }

  extractAmount(message: string): number | null {
    // Pattern 1: Rs.200.00 debited/credited
    const rsPattern = /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:debited|credited)/i;
    const rsMatch = message.match(rsPattern);
    if (rsMatch) {
      const amountStr = rsMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: INR format
    const inrPattern = /INR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:debited|credited)/i;
    const inrMatch = message.match(inrPattern);
    if (inrMatch) {
      const amountStr = inrMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) return amount;
    }

    // Pattern 3: withdrawn Rs 500
    const withdrawnPattern = /withdrawn\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const withdrawnMatch = message.match(withdrawnPattern);
    if (withdrawnMatch) {
      const amountStr = withdrawnMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // BOI specific: Cash deposits should be INCOME (not investment)
    if (lowerMessage.includes('deposited in your account') ||
      (lowerMessage.includes('cash') && lowerMessage.includes('deposited'))) {
      return TransactionType.INCOME;
    }

    // Check for investment transactions (including UPI Mandate for mutual funds)
    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    // UPI Mandate for mutual funds/investments
    if (lowerMessage.includes('mandate') &&
      (lowerMessage.includes('mutual fund') ||
        lowerMessage.includes('iccl') ||
        lowerMessage.includes('groww') ||
        lowerMessage.includes('zerodha') ||
        lowerMessage.includes('kuvera') ||
        lowerMessage.includes('paytm money'))) {
      return TransactionType.INVESTMENT;
    }

    // BOI specific: "debited A/c... and credited to" pattern indicates expense
    if (lowerMessage.includes('debited') && lowerMessage.includes('and credited to')) {
      return TransactionType.EXPENSE;
    }

    // BOI specific: "credited A/c... and debited from" pattern indicates income
    if (lowerMessage.includes('credited') && lowerMessage.includes('and debited from')) {
      return TransactionType.INCOME;
    }

    // Standard patterns
    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern for cash deposit via Cash Acceptor Machine
    if (/Cash Acceptor Machine/i.test(message) ||
      (/cash/i.test(message) && /deposited/i.test(message))) {
      return 'Cash Deposit';
    }

    // Pattern for UPI Mandate execution: "towards MERCHANT for Mandate Created via PLATFORM"
    if (/Mandate/i.test(message) && /towards/i.test(message)) {
      // Try to extract platform first (e.g., "via GROWW")
      const viaPattern = /via\s+([A-Za-z0-9]+)/i;
      const viaMatch = message.match(viaPattern);
      if (viaMatch) {
        const platform = this.cleanMerchantName(viaMatch[1].trim());
        if (this.isValidMerchantName(platform)) {
          return platform;
        }
      }

      // If no platform found, extract merchant from "towards MERCHANT for"
      const towardsPattern = /towards\s+([^,\n]+?)(?:\s+for|\s*,|$)/i;
      const towardsMatch = message.match(towardsPattern);
      if (towardsMatch) {
        const merchantInfo = towardsMatch[1].trim();
        // Clean up the merchant name (e.g., "ICCL - Mutual Funds - Autopa" -> "ICCL - Mutual Funds")
        const cleanedMerchant = merchantInfo
          .replace(/\s*-\s*Autopa.*$/i, '')
          .trim();
        if (this.isValidMerchantName(cleanedMerchant)) {
          return this.cleanMerchantName(cleanedMerchant);
        }
      }
    }

    // Pattern for NEFT inward: "By NEFTINWARD ref/MERCHANT_NAME"
    const neftInwardPattern = /By\s+NEFTINWARD\s+[^/]+\/(.+?)(?:\s*\.Avl|\s*\.|-BOI|$)/i;
    const neftInwardMatch = message.match(neftInwardPattern);
    if (neftInwardMatch) {
      const merchant = this.cleanMerchantName(neftInwardMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1: "credited to MERCHANT via UPI" (for debits)
    const creditedToPattern = /credited\s+to\s+([^.\n]+?)(?:\s+via|\s+Ref|\s+on|$)/i;
    const creditedToMatch = message.match(creditedToPattern);
    if (creditedToMatch) {
      const merchant = this.cleanMerchantName(creditedToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "debited from MERCHANT via UPI" (for credits)
    const debitedFromPattern = /debited\s+from\s+([^.\n]+?)(?:\s+via|\s+Ref|\s+on|$)/i;
    const debitedFromMatch = message.match(debitedFromPattern);
    if (debitedFromMatch) {
      const merchant = this.cleanMerchantName(debitedFromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: ATM withdrawal
    if (/ATM/i.test(message) || /withdrawn/i.test(message)) {
      const atmPattern = /(?:ATM|withdrawn)\s+(?:at\s+)?([^.\n]+?)(?:\s+on|\s+Ref|$)/i;
      const atmMatch = message.match(atmPattern);
      if (atmMatch) {
        const location = this.cleanMerchantName(atmMatch[1].trim());
        if (this.isValidMerchantName(location)) {
          return `ATM - ${location}`;
        }
      }
      return 'ATM';
    }

    // Pattern 4: "towards MERCHANT" (generic, but not for Mandate messages which are handled above)
    if (!/Mandate/i.test(message)) {
      const towardsPattern = /towards\s+([^.\n]+?)(?:\s+via|\s+Ref|\s+on|$)/i;
      const towardsMatch = message.match(towardsPattern);
      if (towardsMatch) {
        const merchant = this.cleanMerchantName(towardsMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 5: "to MERCHANT" (generic)
    const toPattern = /to\s+([^.\n]+?)(?:\s+via|\s+Ref|\s+on|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 6: "from MERCHANT" (generic)
    const fromPattern = /from\s+([^.\n]+?)(?:\s+via|\s+Ref|\s+on|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: A/cXX5468 or A/c XX5468 (BOI format)
    const accountSlashPattern = /A\/c\s*([X*\d]+)/i;
    const accountSlashMatch = message.match(accountSlashPattern);
    if (accountSlashMatch) {
      return this.extractLast4Digits(accountSlashMatch[1]);
    }

    // Pattern 2: "your account XX5468" (BOI cash deposit format)
    const accountWordPattern = /account\s+([X*\d]+)/i;
    const accountWordMatch = message.match(accountWordPattern);
    if (accountWordMatch) {
      return this.extractLast4Digits(accountWordMatch[1]);
    }

    // Pattern 3: Account ending 1234
    const endingPattern = /(?:Account|A\/c)\s+ending\s+(\d{4})/i;
    const endingMatch = message.match(endingPattern);
    if (endingMatch) {
      return endingMatch[1];
    }

    // Pattern 4: A/c No. XX1234
    const accountNoPattern = /A\/c\s+No\.?\s*([X*\d]+)/i;
    const accountNoMatch = message.match(accountNoPattern);
    if (accountNoMatch) {
      return this.extractLast4Digits(accountNoMatch[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: Ref No 315439383341 (BOI format)
    const refNoPattern = /Ref\s+No\.?\s*(\d+)/i;
    const refNoMatch = message.match(refNoPattern);
    if (refNoMatch) {
      return refNoMatch[1];
    }

    // Pattern 2: Reference: 123456
    const referencePattern = /Reference[:\s]+(\w+)/i;
    const referenceMatch = message.match(referencePattern);
    if (referenceMatch) {
      return referenceMatch[1];
    }

    // Pattern 3: Txn ID/Txn#
    const txnPattern = /Txn\s*(?:ID|#)[:\s]*(\w+)/i;
    const txnMatch = message.match(txnPattern);
    if (txnMatch) {
      return txnMatch[1];
    }

    // Pattern 4: UPI reference
    const upiPattern = /UPI[:\s]+(\d+)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      return upiMatch[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  extractBalance(message: string): number | null {
    // Pattern 1: Bal: Rs 1000.00
    const balRsPattern = /Bal[:\s]+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const balRsMatch = message.match(balRsPattern);
    if (balRsMatch) {
      const balanceStr = balRsMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) return balance;
    }

    // Pattern 2: Available Balance: Rs 1000.00
    const availableBalPattern = /Available\s+Balance[:\s]+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const availableBalMatch = message.match(availableBalPattern);
    if (availableBalMatch) {
      const balanceStr = availableBalMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) return balance;
    }

    // Pattern 3: Avl Bal Rs 1000.00
    const avlBalPattern = /Avl\s+Bal[:\s]+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const avlBalMatch = message.match(avlBalPattern);
    if (avlBalMatch) {
      const balanceStr = avlBalMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) return balance;
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip future debit notifications
    if (lowerMessage.includes('will be')) {
      return false;
    }

    // Skip if it contains the customer care message but ensure it's a transaction
    if (lowerMessage.includes('call') && lowerMessage.includes('if not done by you')) {
      // This is likely a transaction message with a security notice
      // Check if it contains transaction keywords
      if (lowerMessage.includes('debited') || lowerMessage.includes('credited') ||
        lowerMessage.includes('withdrawn') || lowerMessage.includes('transferred')) {
        return true;
      }
    }

    // Skip OTP and verification messages
    if (lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')) {
      return false;
    }

    // Skip promotional messages
    if (lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('win ')) {
      return false;
    }

    // Fall back to base class for standard checks
    return super.isTransactionMessage(message);
  }
}

export default new BankOfIndiaParser();
