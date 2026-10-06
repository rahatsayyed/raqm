import { BankParser } from '../core/BankParser';
import { FinancialMessageFields, TransferDirection } from '../core/FinancialMessageFields';
import { FinancialMessageSafety } from '../core/FinancialMessageSafety';
import { SaudiTransactionMessageGuards } from '../core/SaudiTransactionMessageGuards';
import { ParsedTransaction, TransactionType } from '../core/types';

const INLINE_AMOUNT = /\bAmount\s*:?\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:SAR|SR)\b/i;
const RCS_PURCHASE_AMOUNT = /(?:online\s+)?purchase\s+transaction\s+amount\s+([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:SAR|SR)\b/i;

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

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (this.isGenericStcSender(sender) && this.isClearlyTelecomOnlyMessage(smsBody)) return null;
    return super.parse(smsBody, sender, timestamp);
  }

  protected extractAmount(message: string): number | null {
    const labelled = FinancialMessageFields.sarAmount(message, ['Amount']);
    if (labelled !== null) return labelled;

    const rcsMatch = message.match(RCS_PURCHASE_AMOUNT);
    if (rcsMatch) return this.toAmount(rcsMatch[1]);
    const inlineMatch = message.match(INLINE_AMOUNT);
    if (inlineMatch) return this.toAmount(inlineMatch[1]);

    // "Amount: 3 SAR" or "Amount:3 SAR" or "Amount: 3.50 SAR"
    const amountMatch = message.match(/\bAmount\s*:?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:SAR|SR)\b/i);
    if (amountMatch) return this.toAmount(amountMatch[1]);

    // "SAR 3.00" fallback
    const sarMatch = message.match(/\b(?:SAR|SR)\s+([0-9,]+(?:\.\d{1,2})?)/i);
    if (sarMatch) return this.toAmount(sarMatch[1]);

    return null;
  }

  private toAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('adding money to account') || lower.includes('wallet top') ||
      (lower.includes('apple pay') && lower.includes('funding'))) {
      return TransactionType.TRANSFER;
    }
    if (lower.includes('refund') || lower.includes('reversal') || lower.includes('reverse transaction')) {
      return TransactionType.INCOME;
    }
    if (lower.includes('internal transfer')) {
      switch (FinancialMessageFields.transferDirection(message)) {
        case TransferDirection.OUTGOING: return TransactionType.EXPENSE;
        case TransferDirection.INCOMING: return TransactionType.INCOME;
        default: return TransactionType.TRANSFER;
      }
    }
    if (lower.includes('sarie') && (lower.includes('outward') || lower.includes('outgoing'))) {
      return TransactionType.EXPENSE;
    }
    if (lower.includes('purchase')) return TransactionType.EXPENSE;
    if (lower.includes('withdrawal') || lower.includes('withdraw')) return TransactionType.EXPENSE;
    if (lower.includes('payment')) return TransactionType.EXPENSE;
    if (lower.includes('debit')) return TransactionType.EXPENSE;
    if (lower.includes('transfer out') || lower.includes('sent to')) return TransactionType.EXPENSE;
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
      SaudiTransactionMessageGuards.isDeclinedOrFailed(message) ||
      SaudiTransactionMessageGuards.isPromotionalOrOperationalNotice(message) ||
      FinancialMessageSafety.isSecurityCode(message)
    ) return false;

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
      'sar', 'sr',
    ];
    return keywords.some((kw) => lower.includes(kw));
  }

  private isGenericStcSender(sender: string): boolean {
    return sender.toUpperCase().replace(/[\s\-_]/g, '') === 'STC';
  }

  private isClearlyTelecomOnlyMessage(message: string): boolean {
    const lower = message.toLowerCase();
    const sawa = lower.includes('sawa');
    const telecomContext = lower.includes('sawa balance') ||
      lower.includes('mobile balance') || lower.includes('telecom balance') ||
      lower.includes('recharge') || lower.includes('mobile service') ||
      lower.includes('data package') || lower.includes('service credit');
    return (lower.includes('vat refund') && (sawa || telecomContext)) ||
      (sawa && telecomContext);
  }
}

export default new STCBankParser();
