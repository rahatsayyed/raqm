import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for T-Bank (formerly Tinkoff) SMS messages (Russia)
 *
 * Supported formats:
 * - Deposit: "Пополнение, счет RUB. 5000 ₽. Банкомат. Доступно 10028,05 ₽"
 * - Purchase: "Покупка, счет карты *1023. 3267 ₽. AZS 09117. Доступно 30672,14 ₽"
 * - Transfer: "Перевод. Счет RUB. 250 ₽. Милана Н. Баланс 0 ₽"
 *
 * Notes:
 * - Russian uses comma as decimal separator (10028,05)
 * - Currency symbol: ₽ (Russian Ruble)
 */
export class TBankParser extends BankParser {

  getBankName(): string {
    return 'T-Bank';
  }

  getCurrency(): string {
    return 'RUB';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    return normalized.includes('TBANK') ||
      normalized.includes('T-BANK') ||
      normalized.includes('TINKOFF');
  }

  protected extractAmount(message: string): number | null {
    // Pattern: "5000 ₽" or "10028,05 ₽" (amount before ₽, but NOT after Доступно/Баланс)
    // We need the FIRST amount that appears before the balance
    const amountPattern = /(?:^|[.\s])(\d[\d\s]*(?:,\d{1,2})?)\s*₽/i;
    const match = message.match(amountPattern);
    if (match) {
      const amountStr = match[1]
        .replace(/ /g, '')
        .replace(/,/g, '.');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();

    // Income
    if (lower.includes('пополнение')) return TransactionType.INCOME;     // deposit/top-up
    if (lower.includes('зачисление')) return TransactionType.INCOME;     // crediting
    if (lower.includes('возврат')) return TransactionType.INCOME;        // refund
    if (lower.includes('кэшбэк')) return TransactionType.INCOME;        // cashback
    if (lower.includes('входящий перевод')) return TransactionType.INCOME; // incoming transfer

    // Expense
    if (lower.includes('покупка')) return TransactionType.EXPENSE;       // purchase
    if (lower.includes('списание')) return TransactionType.EXPENSE;      // charge/debit
    if (lower.includes('снятие')) return TransactionType.EXPENSE;        // withdrawal
    if (lower.includes('перевод')) return TransactionType.EXPENSE;       // transfer (outgoing by default)
    if (lower.includes('оплата')) return TransactionType.EXPENSE;        // payment
    if (lower.includes('платёж')) return TransactionType.EXPENSE;        // payment
    if (lower.includes('платеж')) return TransactionType.EXPENSE;        // payment (without ё)

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // T-Bank format: "TYPE, ACCOUNT. AMOUNT ₽. MERCHANT. BALANCE ₽"
    // The merchant is between the amount (₽.) and the balance keyword (Доступно/Баланс)
    const merchantPattern = /₽\.\s+(.+?)\.\s+(?:Доступно|Баланс)/i;
    const match = message.match(merchantPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Fallback: merchant after amount ₽. and before the end or next period
    const fallbackPattern = /₽\.\s+([^.]+)/i;
    const fallbackMatch = message.match(fallbackPattern);
    if (fallbackMatch) {
      const merchant = this.cleanMerchantName(fallbackMatch[1].trim());
      const merchantLower = merchant.toLowerCase();
      if (
        this.isValidMerchantName(merchant) &&
        !merchantLower.startsWith('доступно') &&
        !merchantLower.startsWith('баланс')
      ) {
        return merchant;
      }
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null) return superResult;

    // Pattern: "счет карты *1023" or "карты *1023"
    const cardPattern = /\*(\d{4})/i;
    const match = message.match(cardPattern);
    if (match) {
      return match[1];
    }
    return null;
  }

  protected detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();
    // "счет карты" = card account, "карта" = card
    if (lower.includes('карты') || lower.includes('карта')) {
      return true;
    }
    return super.detectIsCard(message);
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "Доступно 10028,05 ₽" or "Баланс 0 ₽"
    const balancePattern = /(?:Доступно|Баланс)\s+(\d[\d\s]*(?:,\d{1,2})?)\s*₽/i;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1]
        .replace(/ /g, '')
        .replace(/,/g, '.');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    // Skip OTP / verification messages
    if (lower.includes('код') || lower.includes('пароль') || lower.includes('otp')) {
      return false;
    }

    // Must contain ₽ (ruble sign) and a transaction keyword
    if (!message.includes('₽')) return false;

    const keywords = [
      'пополнение', 'покупка', 'перевод', 'списание',
      'снятие', 'оплата', 'платёж', 'платеж',
      'возврат', 'зачисление', 'кэшбэк',
    ];
    return keywords.some((kw) => lower.includes(kw));
  }
}

export default new TBankParser();
