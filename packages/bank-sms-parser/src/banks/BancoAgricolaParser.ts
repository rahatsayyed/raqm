// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseElSalvadorBankParser } from '../core/BaseElSalvadorBankParser';
import { ParsedTransaction } from '../core/types';

export class BancoAgricolaParser extends BaseElSalvadorBankParser {
  getBankName(): string {
    return 'Banco Agricola';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();
    return s.includes('AGRICOLA') || s.includes('TRANSFER365');
  }

  // Transfer365 is a shared rail, so only claim it when the body names Banco Agricola.
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!sender.toUpperCase().includes('AGRICOLA') && !smsBody.toUpperCase().includes('AGRICOLA')) {
      return null;
    }
    return super.parse(smsBody, sender, timestamp);
  }
}

export default new BancoAgricolaParser();
