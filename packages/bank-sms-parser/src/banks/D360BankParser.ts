// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { FinancialMessageFields } from '../core/FinancialMessageFields';
import { FinancialMessageSafety } from '../core/FinancialMessageSafety';
import { SaudiTransactionMessageGuards } from '../core/SaudiTransactionMessageGuards';
import { TransactionType } from '../core/types';

const DATE_LIKE = /\d{4}-\d{2}-\d{2}/;
const PROMO_WORDS = /\b(?:offer|discount|sale|win|promo|click)\b/;

/** Parser for D360 Bank (Saudi Arabia) English SMS; foreign-currency rows record the SAR settlement. */
export class D360BankParser extends BankParser {

  getBankName(): string {
    return 'D360 Bank';
  }

  getCurrency(): string {
    return 'SAR';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('D360');
  }

  protected extractAmount(message: string): number | null {
    return FinancialMessageFields.sarSettlementOrAmount(message, ['Amount']);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('incoming')) return TransactionType.INCOME;
    if (lower.includes('refund')) return TransactionType.INCOME;
    if (lower.includes('purchase')) return TransactionType.EXPENSE;
    if (lower.includes('withdrawal') || lower.includes('withdraw')) return TransactionType.EXPENSE;
    if (lower.includes('outgoing')) return TransactionType.EXPENSE;
    if (lower.includes('payment')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Date-shaped captures are skipped so the transfer "at: <datetime>" line is not a merchant
    for (const match of message.matchAll(/At\s*:\s*([^\n]+)/gi)) {
      const candidate = match[1].trim();
      if (DATE_LIKE.test(candidate)) continue;
      const merchant = this.cleanMerchantName(candidate);
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const transfer = message.match(/(?:Incoming|Outgoing) Transfer\s*:\s*([^\n]+)/i);
    if (transfer) {
      const merchant = this.cleanMerchantName(transfer[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/\*+(\d{4})\b/);
    if (match) return this.extractLast4Digits(match[1]);
    return super.extractAccountLast4(message);
  }

  protected detectIsCard(message: string): boolean {
    if (/Card\s*:/i.test(message)) return true;
    return super.detectIsCard(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (
      SaudiTransactionMessageGuards.isDeclinedOrFailed(message) ||
      SaudiTransactionMessageGuards.isPromotionalOrOperationalNotice(message) ||
      FinancialMessageSafety.isSecurityCode(message)
    ) return false;

    // Short promo words use word boundaries so "WHOLESALE MARKET"/"DARWIN BANK" are not rejected
    const promoExact = ['% off', 'congratulations', 'reward points', 'unsubscribe'];
    if (promoExact.some((p) => lower.includes(p)) || PROMO_WORDS.test(lower)) return false;

    const keywords = [
      'purchase', 'withdrawal', 'transfer', 'incoming', 'outgoing',
      'account funding', 'apple pay', 'amount', 'sar',
    ];
    return keywords.some((kw) => lower.includes(kw));
  }
}

export default new D360BankParser();
