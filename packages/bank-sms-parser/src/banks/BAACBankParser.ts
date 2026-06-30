import { BaseThailandBankParser } from '../core/BaseThailandBankParser';

/**
 * Bank for Agriculture and Agricultural Cooperatives (BAAC) parser for Thai banking SMS messages.
 */
export class BAACBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'BAAC';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'BAAC' || upperSender.includes('AGRICULTURE');
  }
}

export default new BAACBankParser();
