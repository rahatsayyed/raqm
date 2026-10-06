import { NMBTanzaniaParser } from '../banks/NMBTanzaniaParser';
import { TransactionType } from '../core/types';

const parser = new NMBTanzaniaParser();
const ts = 1000000000000;

describe('NMBTanzaniaParser', () => {
  test('loan repayment with doubled TZS TZS', () => {
    const r = parser.parse(
      '201NDGL261360514. Kiasi cha TZS TZS 263.36 kimetolewa kwenye akaunti yako inayoishia na XXXXX kurejesha Mshiko Fasta, Salio la mkopo ni 335,556.64 15-06-2026 03:45 Rejesha kwa wakati upate kiwango cha juu zaidi. NMB karibu yako',
      'NMB', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(263.36);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Mshiko Fasta');
    expect(r!.reference).toBe('201NDGL261360514');
    expect(r!.balance).toBeNull();
  });

  test('P2P transfer out', () => {
    const r = parser.parse(
      'Kumb: GWX102237382945 Imethibitishwa. Kiasi cha TSH8,000 kimetumwa kutoka katika akaunti inayoishia na XXXX kwenda JOHN DOE 07XXXXXXXX. Tarehe:05-06-2026 19:46:00. Teleza Kidigitali na Mshiko Fasta',
      'NMB', ts
    );
    expect(r!.amount).toBe(8000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('JOHN DOE');
    expect(r!.reference).toBe('GWX102237382945');
  });

  test('merchant payment in English', () => {
    const r = parser.parse(
      'You have paid TZS 85000 with account ending XXXX to LOCAL SUPERMARKET 01 15293743 on 31-05-2026 19:28:03. NMB Karibu Yako',
      'NMB', ts
    );
    expect(r!.amount).toBe(85000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('LOCAL SUPERMARKET 01');
  });

  test('inbound voucher', () => {
    const r = parser.parse(
      'GWX_1780199859027.Umepokea Tsh 50,000 kupitia NMB Pesa Fasta 31/05/2026 06:57:39. Tumia namba ya siri XXXXX kutoa pesa NMB ATM kabla ya 2026-06-01 06:57:39.',
      'NMB', ts
    );
    expect(r!.amount).toBe(50000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('NMB Pesa Fasta');
    expect(r!.reference).toBe('GWX_1780199859027');
  });

  test('loan disbursement', () => {
    const r = parser.parse(
      '201NDGL261500637. Umepokea kiasi cha TZS 209,236.55 kupitia Mshiko Fasta Kulipwa hadi 28-AUG-26. Gharama 33,059.45 30-MAY-26, Kopa na lipa kwa wakati uweze kukopa kiwango cha juu zaidi . NMB karibu yako',
      'NMB', ts
    );
    expect(r!.amount).toBe(209236.55);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Mshiko Fasta');
    expect(r!.reference).toBe('201NDGL261500637');
  });

  test('TShs plural notation', () => {
    const r = parser.parse(
      'Kumb: GWX102237382946 Imethibitishwa. Kiasi cha TShs 8,000 kimetumwa kutoka katika akaunti inayoishia na XXXX kwenda JANE DOE 07XXXXXXXX. Tarehe:05-06-2026 19:46:00.',
      'NMB', ts
    );
    expect(r!.amount).toBe(8000);
    expect(r!.merchant).toBe('JANE DOE');
  });

  test('Nepal-format NMB message is not claimed', () => {
    expect(
      parser.parse(
        'Fund transfer of NPR 250.00 to A/C 01000000055 was successful on 19-Feb-2025 15:38:23 If you have not done this transfer please contact us immediately.',
        'NMB', ts
      )
    ).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('NMB')).toBe(true);
    expect(parser.canHandle('NMB_ALERT')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
