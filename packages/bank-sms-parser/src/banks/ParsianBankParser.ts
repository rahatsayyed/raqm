import { BaseIranianBankParser } from '../core/BaseIranianBankParser';

/**
 * Parsian Bank parser for Iranian banking SMS messages.
 * Handles Persian language transaction messages with amounts in Rials and Tomans.
 */
export class ParsianBankParser extends BaseIranianBankParser {

  getBankName(): string {
    return 'Parsian Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    const parsianSenders = new Set([
      'PARSIANBANK',
      'PARSIAN',
      'PARSIAN BANK',
      'PERSIANBANK',
      'PERSIAN',
    ]);

    return parsianSenders.has(upperSender);
  }
}

export default new ParsianBankParser();
