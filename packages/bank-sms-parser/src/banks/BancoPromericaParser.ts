// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseElSalvadorBankParser } from '../core/BaseElSalvadorBankParser';

export class BancoPromericaParser extends BaseElSalvadorBankParser {
  getBankName(): string {
    return 'Banco Promerica';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('PROMERICA');
  }

  protected accountPatterns: RegExp[] = [/TTA\s*\*?(\d{4})/i];
}

export default new BancoPromericaParser();
