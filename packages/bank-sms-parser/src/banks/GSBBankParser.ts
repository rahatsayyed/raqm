import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Government Savings Bank (GSB) parser for Thai banking SMS messages.
 */
export class GSBBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'Government Savings Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'GSB' ||
      upperSender.includes('GOVERNMENT SAVINGS') ||
      upperSender.includes('GOVT SAVINGS')
    );
  }
}

export default new GSBBankParser();
