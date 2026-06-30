import { BaseThailandBankParser } from '../core/BaseThailandBankParser';

/**
 * Kasikorn Bank (KBank) parser for Thai banking SMS messages.
 */
export class KasikornBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'Kasikorn Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'KBANK' ||
      upperSender.includes('KASIKORN') ||
      upperSender.includes('KASIKORNBANK')
    );
  }
}

export default new KasikornBankParser();
