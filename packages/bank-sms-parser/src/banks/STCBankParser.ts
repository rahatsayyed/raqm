import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for STC Bank (Saudi Arabia).
 *
 * Handles English purchase / transfer formats such as:
 *   **4561 Purchase
 *   Via:4561
 *   Amount: 3 SAR
 *   From: ABDULLAH SALEM MUEEN
 *   At: 26/07/25 21:58
 *   STC Bank
 *
 * Sender examples: STC Bank, STCBank, STC-Bank, STC
 */
export class STCBankParser extends BankParser {

  getBankName(): string {
    return 'STC Bank';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().replace(/[\s\-_]/g, '');
    return normalized.includes('STCBANK') || normalized === 'STC' || normalized === 'STCPAY';
  }

  protected extractAmount(message: string): number | null {
    // "Amount: 3 SAR" or "Amount:3 SAR" or "Amount: 3.50 SAR"
    const amountPattern = /Amount\s*:?\s*([0-9,]+(?:\.\d{1,2})?)\s*SAR/i;
    const amountMatch = message.match(amountPattern);
    if (amountMatch) {
      const parsed = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // "SAR 3.00" fallback
    const sarFirstPattern = /SAR\s+([0-9,]+(?:\.\d{1,2})?)/i;
    const sarMatch = message.match(sarFirstPattern);
    if (sarMatch) {
      const parsed = parseFloat(sarMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('purchase')) return TransactionType.EXPENSE;
    if (lower.includes('withdrawal') || lower.includes('withdraw')) return TransactionType.EXPENSE;
    if (lower.includes('payment')) return TransactionType.EXPENSE;
    if (lower.includes('debit')) return TransactionType.EXPENSE;
    if (lower.includes('transfer out') || lower.includes('sent to')) return TransactionType.EXPENSE;
    if (lower.includes('refund')) return TransactionType.INCOME;
    if (lower.includes('deposit')) return TransactionType.INCOME;
    if (lower.includes('credit') && !lower.includes('credit card')) return TransactionType.INCOME;
    if (lower.includes('received')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // "From: MERCHANT NAME" — merchant for Purchase, sender for incoming
    const fromPattern = /From\s*:\s*([^\n]+?)(?:\n|At\s*:|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // "To: RECIPIENT NAME" — recipient for outgoing transfers
    const toPattern = /To\s*:\s*([^\n]+?)(?:\n|At\s*:|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = this.cleanMerchantName(toMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "**4561 Purchase" / "*4561 Purchase"
    const starPattern = /\*+(\d{4})\b/;
    const starMatch = message.match(starPattern);
    if (starMatch) {
      return this.extractLast4Digits(starMatch[1]);
    }

    // "Via:4561" / "Via: 4561"
    const viaPattern = /Via\s*:\s*(\d{4})/i;
    const viaMatch = message.match(viaPattern);
    if (viaMatch) {
      return this.extractLast4Digits(viaMatch[1]);
    }

    return super.extractAccountLast4(message);
  }

  protected detectIsCard(message: string): boolean {
    // Presence of masked card (**XXXX) or Via:XXXX indicates card transaction
    if (/\*+\d{4}/.test(message)) return true;
    if (/Via\s*:\s*\d{4}/i.test(message)) return true;
    return super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    if (
      lower.includes('otp') ||
      lower.includes('verification code') ||
      lower.includes('one time password')
    ) {
      return false;
    }

    const keywords = [
      'purchase',
      'amount',
      'withdraw',
      'transfer',
      'payment',
      'refund',
      'deposit',
      'debit',
      'credit',
      'sar',
    ];
    return keywords.some((kw) => lower.includes(kw));
  }
}

export default new STCBankParser();
