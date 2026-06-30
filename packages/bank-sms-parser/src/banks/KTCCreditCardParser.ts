import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * KTC Credit Card parser for Thai banking SMS messages.
 * Handles credit card spending with available limit extraction.
 */
export class KTCCreditCardParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'KTC';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'KTC' || upperSender.includes('KRUNGTHAI CARD');
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const parsed = super.parse(smsBody, sender, timestamp);
    if (parsed === null) return null;

    const creditLimit = this.extractAvailableLimit(smsBody);

    return {
      ...parsed,
      type: parsed.type ?? TransactionType.CREDIT,
      isFromCard: true,
      creditLimit: creditLimit,
    };
  }
}

export default new KTCCreditCardParser();
