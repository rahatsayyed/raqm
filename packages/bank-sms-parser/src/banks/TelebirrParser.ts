import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Telebirr - handles ETB currency transactions
 */
export class TelebirrParser extends BankParser {

  getBankName(): string {
    return 'Telebirr';
  }

  getCurrency(): string {
    return 'ETB'; // Ethiopian Birr
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase().trim();
    return (
      upperSender === '127' ||
      upperSender.includes('127') ||
      // DLT patterns for Ethiopia: "XX-127-X" format
      /^[A-Z]{2}-127-[A-Z]$/.test(upperSender) ||
      // Alternative patterns: "127-XXX" or "XXX-127"
      /^127-[A-Z0-9]+$/.test(upperSender) ||
      /^[A-Z0-9]+-127$/.test(upperSender)
    );
  }

  extractAmount(message: string): number | null {
    // CBE patterns: "ETB 3,000.00", "ETB 25.00", "ETB250"
    const patterns = [
      /ETB\s+([0-9,]+(?:\.[0-9]{2})?)\s/gi,
      /ETB\s*([0-9,]+(?:\.[0-9]{2})?)(?:\s|$|\.)/gi,
      /(?:Credited|debited|transfered)\s+(?:with\s+)?ETB\s+([0-9,]+(?:\.[0-9]{2})?)/gi,
    ];

    for (const pattern of patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          return amount;
        }
        return null;
      }
    }

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Savings flows have reversed direction relative to the saving account:
    // - Deposit TO saving account => money leaves telebirr wallet => EXPENSE
    // - Withdraw FROM saving account => money enters telebirr wallet => INCOME
    if (
      lowerMessage.includes('deposited etb') &&
      lowerMessage.includes('to your saving account')
    ) {
      return TransactionType.EXPENSE;
    }

    if (
      (lowerMessage.includes(' withdraw etb') || lowerMessage.includes('withdraw etb')) &&
      lowerMessage.includes('from your saving account')
    ) {
      return TransactionType.INCOME;
    }

    // Credit transactions are income
    if (lowerMessage.includes('you have received')) {
      return TransactionType.INCOME;
    }

    // Debit transactions are expenses
    if (lowerMessage.includes('you have paid')) {
      return TransactionType.EXPENSE;
    }

    // Transfer transactions are expenses (money going out)
    if (lowerMessage.includes('you have transferred')) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 0: Savings deposit - "deposited ETB ... to your Saving Account on ..."
    const savingsDepositPattern = /deposited\s+ETB\s+[0-9,]+(?:\.[0-9]{2})?\s+to\s+your\s+(.+?)\s+on\s+\d{2}\/\d{2}\/\d{4}/i;
    const savingsDepositMatch = message.match(savingsDepositPattern);
    if (savingsDepositMatch) {
      const merchant = savingsDepositMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    // Pattern 0b: Savings withdraw - "Withdraw ETB ... from your saving account on ..."
    const savingsWithdrawPattern = /withdraw(?:n)?\s+ETB\s+[0-9,]+(?:\.[0-9]{2})?\s+from\s+your\s+(.+?)\s+on\s+\d{2}\/\d{2}\/\d{4}/i;
    const savingsWithdrawMatch = message.match(savingsWithdrawPattern);
    if (savingsWithdrawMatch) {
      const merchant = savingsWithdrawMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    // Pattern 1: "from Zemen Bank to your telebirr Account" (bank transfer income) - check this first
    const bankFromPattern = /from\s+([A-Za-z\s]+Bank)\s+to\s+your/i;
    const bankFromMatch = message.match(bankFromPattern);
    if (bankFromMatch) {
      const merchant = bankFromMatch[1].trim();
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "paid ETB X to 519680 - City Government..." (government payment)
    // Capture everything until "on DATE" or "Your transaction number"
    // Use a lookahead to capture the space before "on" if it exists
    const paidToPattern = /paid\s+ETB\s+[0-9,]+(?:\.[0-9]{2})?\s+to\s+([^,\n]+?)(?=\s+on\s+\d{2}\/\d{2}\/\d{4}|\.\s+Your\s+transaction|$)/i;
    const paidToMatch = message.match(paidToPattern);
    if (paidToMatch) {
      let merchant = paidToMatch[1];
      // Check if there's a space before "on" - look at the text right after the match
      const matchEnd = (paidToMatch.index ?? 0) + paidToMatch[0].length;
      if (matchEnd < message.length) {
        const textAfterMatch = message.substring(matchEnd);
        if (
          textAfterMatch.trimStart().toLowerCase().startsWith('on ') &&
          textAfterMatch[0] === ' '
        ) {
          merchant += ' ';
        }
      }
      if (merchant.length > 0) {
        return merchant;
      }
    }

    // Pattern 3a: "paid ETB X for fuel purchased from ... on ..." (keep full phrase)
    const fuelPurchasedFromPattern = /(for\s+fuel\s+purchased\s+from\s+[^,\n]+?)(?:\s+on\s+\d{2}\/\d{2}\/\d{4}|\.\s+Your\s+transaction|$)/i;
    const fuelPurchasedFromMatch = message.match(fuelPurchasedFromPattern);
    if (fuelPurchasedFromMatch) {
      const merchant = fuelPurchasedFromMatch[1].trim();
      if (merchant.length > 0) {
        return merchant;
      }
    }

    // Pattern 3b: "paid ETB X for goods purchased from 521902 - SAMUEL..." (merchant payment)
    const purchasedFromPattern = /for\s+goods\s+purchased\s+from\s+([^,\n]+?)(?:\s+on\s+\d{2}\/\d{2}\/\d{4}|\.\s+Your\s+transaction|$)/i;
    const purchasedFromMatch = message.match(purchasedFromPattern);
    if (purchasedFromMatch) {
      const merchant = purchasedFromMatch[1].trim();
      if (merchant.length > 0) {
        return merchant;
      }
    }

    // Pattern 4: "paid ETB X for package Monthly 240Min..." (airtime payment)
    // Need to capture "Monthly 240Min + 24GB Data purchase made for 911111119"
    const packagePattern = /for\s+package\s+([^,\n]+?)(?:\s+purchase\s+made|\s+on\s+\d{2}\/\d{2}\/\d{4}|\.\s+Your\s+transaction|$)/i;
    const packageMatch = message.match(packagePattern);
    if (packageMatch) {
      let merchant = packageMatch[1].trim();
      // Also capture "purchase made for X" part if it exists
      const purchaseMadePattern = /purchase\s+made\s+for\s+(\d+)/i;
      const purchaseMatch = message.match(purchaseMadePattern);
      if (purchaseMatch) {
        merchant += ` purchase made for ${purchaseMatch[1]}`;
        // Check if there's a space after the number before "on"
        const afterNumber = (purchaseMatch.index ?? 0) + purchaseMatch[0].length;
        if (afterNumber < message.length && message[afterNumber] === ' ') {
          const nextPart = message.substring(afterNumber + 1).trimStart();
          if (nextPart.toLowerCase().startsWith('on ')) {
            merchant += ' ';
          }
        }
      }
      if (merchant.length > 0) {
        return merchant;
      }
    }

    // Pattern 5: "transferred... to Commercial Bank of Ethiopia..." (bank transfer expense)
    // But also "to Person Name (2519****4211)" - preserve parentheses
    const transferredToPattern = /transferred\s+[^,\n]+?\s+to\s+([^,\n]+?)(?:\s+on\s+\d{2}\/\d{2}\/\d{4}|\.|$)/i;
    const transferredToMatch = message.match(transferredToPattern);
    if (transferredToMatch) {
      let merchant = transferredToMatch[1].trim();
      // Don't clean if it contains parentheses - preserve the phone number
      if (merchant.includes('(') && merchant.includes(')')) {
        return merchant;
      }
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 6: "from PERSON NME(2519****2078)" (received transaction) - but not "from your account"
    const fromPattern = /from\s+(?!your\s+account)([^,\n]+?)(?:\s+on\s+\d{2}\/\d{2}\/\d{4}|\s+to\s+your|\.|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      let merchant = fromMatch[1].trim();
      // Handle phone number in parentheses: "PERSON NME(2519****2078)" -> "PERSON NME (2519****2078)"
      merchant = merchant.replace(/([A-Za-z\s]+)\((\d+\*+\d+)\)/g, '$1 ($2)');
      // Don't clean if it contains parentheses - preserve the phone number exactly as formatted
      if (merchant.includes('(') && merchant.includes(')')) {
        return merchant;
      }
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 6: "to Person Name (2519****4211)" (transfer transaction)
    const toPattern = /to\s+([^,\n]+?)(?:\s+on\s+\d{2}\/\d{2}\/\d{4}|\.|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      let merchant = toMatch[1].trim();
      // Don't clean if it contains parentheses - preserve the phone number
      if (merchant.includes('(')) {
        return merchant;
      }
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    // Telebirr SMS formats observed:
    // - "Dear [Name] You have ..."   -> expected: "[Name]"
    // - "Dear Name You have ..."     -> expected: "Name"
    //
    // Extract "anything between 'Dear' and the next space/newline".
    // Keep bracket-wrapping when present.
    const bracketedPattern = /Dear\s+\[([^\]]+)\]/;
    const bracketedMatch = message.match(bracketedPattern);
    if (bracketedMatch) {
      return `[${bracketedMatch[1]}]`;
    }

    const tokenAfterDearPattern = /Dear\s+([^\r\n ]+)/;
    const tokenAfterDearMatch = message.match(tokenAfterDearPattern);
    if (tokenAfterDearMatch) {
      return tokenAfterDearMatch[1]
        // Be resilient to minor punctuation (e.g., "Dear Name," or "Dear [X],").
        .replace(/[,\.;:]+$/, '');
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Your current E-Money Account balance is ETB 9,719.23"
    const eMoneyBalancePattern = /E-Money Account\s+balance is ETB\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const eMoneyBalanceMatch = message.match(eMoneyBalancePattern);
    if (eMoneyBalanceMatch) {
      const balanceStr = eMoneyBalanceMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      return isNaN(balance) ? null : balance;
    }

    // Pattern: "Your current balance is ETB 334.23"
    const currentBalancePattern = /current balance is ETB\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const currentBalanceMatch = message.match(currentBalancePattern);
    if (currentBalanceMatch) {
      const balanceStr = currentBalanceMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      return isNaN(balance) ? null : balance;
    }

    // Pattern: "Your telebirr account balance is ETB 496.04"
    const telebirrBalancePattern = /telebirr account balance is\s+ETB\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const telebirrBalanceMatch = message.match(telebirrBalancePattern);
    if (telebirrBalanceMatch) {
      const balanceStr = telebirrBalanceMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      return isNaN(balance) ? null : balance;
    }

    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Look for "bank transaction number is FT2603327H99" (preferred for bank transfers)
    const bankTransactionPattern = /bank transaction number is\s+([A-Z0-9]+)/i;
    const bankTransactionMatch = message.match(bankTransactionPattern);
    if (bankTransactionMatch) {
      return bankTransactionMatch[1];
    }

    // Look for "by transaction number DAV5COORPD" (bank transfer income)
    const byTransactionPattern = /by transaction number\s+([A-Z0-9]+)/i;
    const byTransactionMatch = message.match(byTransactionPattern);
    if (byTransactionMatch) {
      return byTransactionMatch[1];
    }

    // Look for "transaction number is DAV4D0PVWS" or "Your transaction number is DAV4D0PVWS"
    const transactionPattern = /(?:your\s+)?transaction number is\s+([A-Z0-9]+)/i;
    const transactionMatch = message.match(transactionPattern);
    if (transactionMatch) {
      return transactionMatch[1];
    }

    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Telebirr specific transaction keywords
    const telebirrTransactionKeywords = [
      'dear',
      'you have received',
      'you have paid',
      'you have transferred',
      'current balance',
      'e-money account balance',
      'telebirr account balance',
      'thank you for using telebirr',
      'etb',
      'transaction number',
    ];

    if (telebirrTransactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new TelebirrParser();
