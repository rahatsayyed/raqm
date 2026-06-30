import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Standard Chartered Bank SMS messages (India and Pakistan)
 *
 * Supported formats:
 * - UPI Debit: "Your a/c XX3421 is debited for Rs. 302.00 on 03-12-2025 15:49 and credited to a/c XX1465 (UPI Ref no 487597904232)"
 * - NEFT Credit: "Dear Customer, there is an NEFT credit of INR 48,796.00 in your account 123xxxx7655 on 1/11/2025.Available Balance:INR 97,885.05"
 * - PKR RAAST: "Dear Customer, PKR 55,000.00 sent to SCB PK A/C ****9901 for FUNDSTRANSFER 001 on 06-Feb-26 14:22 via RAAST"
 * - PKR IBFT: "Dear Client, an electronic funds transfer of PKR 5,000.00 has been made into your Account No. 0101xxx9901"
 *
 * Common senders: VM-SCBANK-S, VD-SCBANK-S, JK-SCBANK-S, SCBANK, StanChart, 9220 (Pakistan)
 */
export class StandardCharteredBankParser extends BankParser {
  getBankName(): string {
    return 'Standard Chartered Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender.includes('SCBANK') ||
      upperSender.includes('STANCHART') ||
      upperSender.includes('STANDARDCHARTERED') ||
      upperSender.includes('STANDARD CHARTERED') ||
      upperSender === '9220' ||
      /^[A-Z]{2}-SCBANK-[A-Z]$/.test(upperSender)
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const parsed = super.parse(smsBody, sender, timestamp);
    if (parsed === null) return null;

    let currency: string;
    if (smsBody.toLowerCase().includes('pkr')) {
      currency = 'PKR';
    } else if (smsBody.toLowerCase().includes('usd')) {
      currency = 'USD';
    } else {
      currency = parsed.currency ?? 'INR';
    }

    return { ...parsed, currency };
  }

  extractAmount(message: string): number | null {
    // Pakistan: "PKR 55,000.00"
    const pkrMatch = message.match(/PKR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (pkrMatch) {
      const amount = pkrMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // International: "USD 79.00 have been paid at ..."
    const foreignCurrencyMatch = message.match(/\b(?:USD)\s+([0-9,]+(?:\.\d{2})?)/i);
    if (foreignCurrencyMatch) {
      const amount = foreignCurrencyMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // India Pattern 1: "is debited for Rs. 302.00"
    const debitMatch = message.match(/is debited for Rs\.\s*([0-9,]+(?:\.\d{2})?)/i);
    if (debitMatch) {
      const amount = debitMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // India Pattern 2: "NEFT credit of INR 48,796.00"
    const neftCreditMatch = message.match(/(?:NEFT|RTGS|IMPS)\s+credit\s+of\s+INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (neftCreditMatch) {
      const amount = neftCreditMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    // India Pattern 3: "is credited for Rs. xxx"
    const creditMatch = message.match(/is credited for Rs\.\s*([0-9,]+(?:\.\d{2})?)/i);
    if (creditMatch) {
      const amount = creditMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) return parsed;
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    const isCreditCard = lowerMessage.includes('credit card');

    if (lowerMessage.includes('payment of') && lowerMessage.includes('financing')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('transaction of pkr') && lowerMessage.includes('using online banking')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('withdrawn from account')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('cash withdrawal transaction')) {
      return isCreditCard ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('paid at')) {
      return isCreditCard ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('transaction of pkr') && lowerMessage.includes('to')) {
      return TransactionType.TRANSFER;
    }
    if (lowerMessage.includes('sent to scb pk')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('electronic funds transfer') && lowerMessage.includes('into your account')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('has been credited')) {
      return TransactionType.INCOME;
    }
    // India-specific
    if (lowerMessage.includes('is debited for')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('neft credit')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('rtgs credit')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('imps credit')) {
      return TransactionType.INCOME;
    }
    if (lowerMessage.includes('is credited for')) {
      return TransactionType.INCOME;
    }

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pakistan-specific merchant patterns
    if (message.toLowerCase().includes('sent to scb pk')) {
      return 'RAAST Transfer';
    }

    if (message.toLowerCase().includes('financing facility')) {
      return 'Financing Payment';
    }

    if (
      message.toLowerCase().includes('withdrawn') ||
      message.toLowerCase().includes('cash withdrawal')
    ) {
      return 'ATM Cash Withdrawal';
    }

    // India Pattern 1: "credited to a/c XX1465" (for debit/UPI transfers)
    const upiTransferMatch = message.match(/and credited to a\/c ([X\*]+\d+)/i);
    if (upiTransferMatch) {
      const accountNum = upiTransferMatch[1];
      return `UPI Transfer to ${accountNum}`;
    }

    // India Pattern 2: NEFT/RTGS/IMPS credits
    if (message.toLowerCase().includes('neft credit')) {
      return 'NEFT Credit';
    }
    if (message.toLowerCase().includes('rtgs credit')) {
      return 'RTGS Credit';
    }
    if (message.toLowerCase().includes('imps credit')) {
      return 'IMPS Credit';
    }

    // Pakistan: "paid at ELITE CLUB on"
    const paidAtMatch = message.match(/paid at\s+([A-Za-z0-9\s.\-]+?)\s+on/i);
    if (paidAtMatch) {
      return this.cleanMerchantName(paidAtMatch[1]);
    }

    // Pakistan: "to TANBITS on" (online banking transfer)
    const transferToMatch = message.match(/to\s+([A-Za-z0-9*]+)(?:\s|$)/i);
    if (transferToMatch) {
      const dest = transferToMatch[1];
      if (dest && dest.trim() !== '') {
        const normalized = dest.toLowerCase();
        if (normalized !== 'your' && normalized !== 'account' && normalized !== 'iban' && normalized !== 'acct') {
          if (dest.split('').every(c => c === '*')) {
            return 'Transfer';
          } else if (dest.startsWith('****')) {
            return `Transfer to ${dest.slice(-4)}`;
          } else if (dest.length >= 3 && dest.length <= 8 && dest.split('').some(c => /[a-zA-Z]/.test(c))) {
            return this.cleanMerchantName(dest);
          } else if (dest.length >= 3 && dest.length <= 8) {
            return `Transfer to ${dest}`;
          } else {
            return 'Transfer';
          }
        }
      }
    }

    // Pakistan: "from account 18-87xxxxx-9039959 PAYONEER from IBFT"
    const fromAccountMatch = message.match(
      /from account\s+[A-Za-z0-9\-*xX]+(?:\s+([A-Z][A-Za-z0-9\s]+?))(?:\s+from\s+IBFT|\s+via|\s+on|\s*$)/i
    );
    if (fromAccountMatch) {
      const name = (fromAccountMatch[1] ?? '').trim();
      if (name !== '') {
        return this.cleanMerchantName(name);
      }
    }

    const genericFromAccountPattern = /from account\s+[A-Za-z0-9\-*xX]+/i;
    if (genericFromAccountPattern.test(message)) {
      return 'IBFT Transfer';
    }

    if (message.toLowerCase().includes('raast')) {
      return 'RAAST Transfer';
    }

    if (
      message.toLowerCase().includes('ibft') ||
      message.toLowerCase().includes('electronic funds transfer')
    ) {
      return 'IBFT Transfer';
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) return superResult;

    // India Pattern 1: "Your a/c XX3421"
    const acMatch = message.match(/Your a\/c ([X*\d]+)/i);
    if (acMatch) {
      return this.extractLast4Digits(acMatch[1]);
    }

    // India Pattern 2: "in your account 123xxxx7655"
    const accountMatch = message.match(/in your account ([0-9xX*]+)/i);
    if (accountMatch) {
      return this.extractLast4Digits(accountMatch[1]);
    }

    // Pakistan Pattern 3: "A/C ****9901" or "Account No. 0101xxx9901"
    const maskedAccountMatch = message.match(
      /(?:A\/C\s*|Account No\.\s*|Acc\. Number\s*|Iban\.\s*)([0-9Xx*]+)/i
    );
    if (maskedAccountMatch) {
      return this.extractLast4Digits(maskedAccountMatch[1]);
    }

    // Pakistan Pattern 4: "credit/debit card no 53119xxxxxxxx1640"
    const cardMatch = message.match(/card no\.?\s*([0-9Xx*\s-]+)/i);
    if (cardMatch) {
      return this.extractLast4Digits(cardMatch[1]);
    }

    // Pakistan Pattern 5: "your account 01-01***9901"
    const yourAccountMatch = message.match(/your account\s+([0-9\-*xX]+)/i);
    if (yourAccountMatch) {
      return this.extractLast4Digits(yourAccountMatch[1]);
    }

    // Pakistan Pattern 6: "account 01-70***32-01"
    const flexibleAccountMatch = message.match(/account\s+([0-9\-*xX]+)/i);
    if (flexibleAccountMatch) {
      return this.extractLast4Digits(flexibleAccountMatch[1]);
    }

    return null;
  }

  extractReference(message: string): string | null {
    // India: "UPI Ref no 487597904232"
    const upiRefMatch = message.match(/UPI Ref no (\d+)/i);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Pakistan: "TX ID FAYS2602061422..."
    const txIdMatch = message.match(/TX ID ([A-Z0-9]+)/i);
    if (txIdMatch) {
      return txIdMatch[1];
    }

    // Pakistan: "Transaction ID:PK-019-..."
    const transactionIdMatch = message.match(/Transaction ID:([A-Z0-9\-]+)/i);
    if (transactionIdMatch) {
      return transactionIdMatch[1];
    }

    return super.extractReference(message);
  }

  extractBalance(message: string): number | null {
    // India: "Available Balance:INR 97,885.05"
    const balanceMatch = message.match(/Available Balance:\s*INR\s+([0-9,]+(?:\.\d{2})?)/i);
    if (balanceMatch) {
      const balanceStr = balanceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }

    // Pakistan: "Avail Limit PKR 18062.81"
    const availLimitMatch = message.match(/Avail Limit\s*PKR\s*([0-9,]+(?:\.\d{2})?)/i);
    if (availLimitMatch) {
      const balanceStr = availLimitMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }

    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('is debited for') ||
      lowerMessage.includes('is credited for') ||
      lowerMessage.includes('neft credit') ||
      lowerMessage.includes('rtgs credit') ||
      lowerMessage.includes('imps credit') ||
      lowerMessage.includes('withdrawn from account') ||
      lowerMessage.includes('cash withdrawal transaction') ||
      lowerMessage.includes('paid at') ||
      lowerMessage.includes('payment of') ||
      lowerMessage.includes('transaction of pkr') ||
      lowerMessage.includes('sent to scb pk') ||
      lowerMessage.includes('electronic funds transfer') ||
      lowerMessage.includes('has been credited')
    ) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new StandardCharteredBankParser();
