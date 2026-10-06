// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

const CARD_PATTERN = new RegExp(
  'تم\\s*خصم\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:جم|EGP)\\s*من\\s*بطاقة\\s*(الائتمان|الخصم\\s*المباشر)\\s*' +
    'رقم\\s*(\\d+)\\s*عند\\s*(.+?)\\s*يوم.*?المتاح\\s*([\\d,]+(?:\\.\\d+)?)',
  's'
);

const TRANSFER_PATTERN = new RegExp(
  'تم\\s*[إا]ضافة\\s*تحويل\\s*لحظي\\s*لحسابكم\\s*رقم\\s*(\\d+)\\s*بمبلغ\\s*([\\d,]+(?:\\.\\d+)?)\\s*' +
    '(?:جم|EGP)\\s*من\\s*(.+?)\\s*رقم\\s*مرجعي\\s*(\\d+)',
  's'
);

function toAmount(raw: string): number | null {
  const parsed = parseFloat(raw.replace(/,/g, ''));
  return isNaN(parsed) ? null : parsed;
}

export class NationalBankOfEgyptParser extends BankParser {
  getBankName(): string {
    return 'National Bank of Egypt';
  }

  getCurrency(): string {
    return 'EGP';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().replace(/[\s\-_]/g, '').includes('ALAHLY');
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const card = smsBody.match(CARD_PATTERN);
    if (card) {
      const isCreditCard = card[2].startsWith('الائتمان');
      const amount = toAmount(card[1]);
      if (amount === null) return null;
      const available = toAmount(card[5]);
      return createParsedTransaction({
        amount,
        type: TransactionType.EXPENSE,
        merchant: card[4].trim(),
        reference: null,
        accountLast4: card[3].slice(-4),
        balance: isCreditCard ? null : available,
        creditLimit: isCreditCard ? available : null,
        smsBody,
        sender,
        timestamp,
        bankName: this.getBankName(),
        isFromCard: true,
        currency: this.getCurrency(),
      });
    }

    const transfer = smsBody.match(TRANSFER_PATTERN);
    if (transfer) {
      const amount = toAmount(transfer[2]);
      if (amount === null) return null;
      return createParsedTransaction({
        amount,
        type: TransactionType.INCOME,
        merchant: transfer[3].trim(),
        reference: transfer[4],
        accountLast4: transfer[1].slice(-4),
        balance: null,
        smsBody,
        sender,
        timestamp,
        bankName: this.getBankName(),
        currency: this.getCurrency(),
      });
    }

    return null;
  }
}

export default new NationalBankOfEgyptParser();
