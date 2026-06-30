import { BangkokBankParser } from '../banks/BangkokBankParser';
import { KasikornBankParser } from '../banks/KasikornBankParser';
import { SiamCommercialBankParser } from '../banks/SiamCommercialBankParser';
import { KrungThaiBankParser } from '../banks/KrungThaiBankParser';
import { KrungsriBankParser } from '../banks/KrungsriBankParser';
import { TTBBankParser } from '../banks/TTBBankParser';
import { GSBBankParser } from '../banks/GSBBankParser';
import { BAACBankParser } from '../banks/BAACBankParser';
import { UOBThailandParser } from '../banks/UOBThailandParser';
import { CIMBThaiParser } from '../banks/CIMBThaiParser';
import { KTCCreditCardParser } from '../banks/KTCCreditCardParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('BangkokBankParser', () => {
  const parser = new BangkokBankParser();

  test('BBL ATM withdrawal (English)', () => {
    const result = parser.parse('BBL: Withdrawal 2,000.00 THB from A/C x1234 via ATM on 21/01/26 14:32 Bal 15,820.45 THB', 'BBL', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000);
    expect(result!.currency).toBe('THB');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(15820.45);
  });

  test('BBL deposit (English)', () => {
    const result = parser.parse('BBL: Deposit 5,000.00 THB to A/C x1234 on 21/01/26 16:01 Bal 20,820.45 THB', 'BBL', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(20820.45);
  });

  test('BBL transfer out (Thai)', () => {
    const result = parser.parse('BBL: โอนเงินออก 1,500.00 บาท บช x1234 คงเหลือ 19,320.45 บาท', 'BBL', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(19320.45);
  });

  test('canHandle', () => {
    expect(parser.canHandle('BBL')).toBe(true);
    expect(parser.canHandle('BANGKOK BANK')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('KasikornBankParser', () => {
  const parser = new KasikornBankParser();

  test('KBank spending (English)', () => {
    const result = parser.parse('KBank: You spent 1,250.00 THB at SHOPEE. A/C x5678 Bal 8,430.20 THB', 'KBank', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1250);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('5678');
    expect(result!.balance).toBe(8430.2);
  });

  test('KBank receive (English)', () => {
    const result = parser.parse('KBank: Receive 10,000.00 THB from A/C x5678 Bal 18,430.20 THB', 'KBank', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(10000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('5678');
    expect(result!.balance).toBe(18430.2);
  });

  test('KBank PromptPay transfer (Thai)', () => {
    const result = parser.parse('KBank: โอนเงินผ่านพร้อมเพย์ 500.00 บาท บช x5678 คงเหลือ 17,930.20 บาท', 'KBank', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('5678');
    expect(result!.balance).toBe(17930.2);
  });

  test('canHandle', () => {
    expect(parser.canHandle('KBank')).toBe(true);
    expect(parser.canHandle('KASIKORN')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('SiamCommercialBankParser', () => {
  const parser = new SiamCommercialBankParser();

  test('SCB transfer out (English)', () => {
    const result = parser.parse('SCB: Transfer out 3,500.00 THB to A/C x8899 Bal 6,200.00 THB', 'SCB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('8899');
    expect(result!.balance).toBe(6200);
  });

  test('SCB transfer in (English)', () => {
    const result = parser.parse('SCB: Transfer in 12,000.00 THB A/C x8899 Bal 18,200.00 THB', 'SCB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('8899');
    expect(result!.balance).toBe(18200);
  });

  test('SCB card spending (Thai)', () => {
    const result = parser.parse('SCB: ใช้จ่ายบัตร 890.00 บาท ร้าน 7-ELEVEN บช x8899', 'SCB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(890);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('8899');
    expect(result!.merchant).toBe('7-ELEVEN');
  });

  test('canHandle', () => {
    expect(parser.canHandle('SCB')).toBe(true);
    expect(parser.canHandle('SIAM COMMERCIAL')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('KrungThaiBankParser', () => {
  const parser = new KrungThaiBankParser();

  test('KTB deposit (Thai)', () => {
    const result = parser.parse('KTB: เงินเข้า 4,200.00 บาท บช x7788 คงเหลือ 12,350.75 บาท', 'KTB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(4200);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('7788');
    expect(result!.balance).toBe(12350.75);
  });

  test('KTB ATM withdrawal (Thai)', () => {
    const result = parser.parse('KTB: ถอนเงินสด 500.00 บาท บช x7788 คงเหลือ 11,850.75 บาท', 'KTB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(11850.75);
  });

  test('KTB PromptPay receive (Thai)', () => {
    const result = parser.parse('KTB: รับเงินพร้อมเพย์ 2,000.00 บาท บช x7788', 'KTB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('7788');
  });

  test('canHandle', () => {
    expect(parser.canHandle('KTB')).toBe(true);
    expect(parser.canHandle('KRUNGTHAI')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('KrungsriBankParser', () => {
  const parser = new KrungsriBankParser();

  test('Krungsri ATM withdrawal (English)', () => {
    const result = parser.parse('Krungsri: ATM withdrawal 1,000.00 THB A/C x3344 Bal 9,540.00 THB', 'BAY', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('3344');
    expect(result!.balance).toBe(9540);
  });

  test('Krungsri card payment (English)', () => {
    const result = parser.parse("Krungsri: Card payment 890.00 THB at 7-ELEVEN A/C x3344", 'BAY', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(890);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('3344');
    expect(result!.merchant).toBe('7-ELEVEN');
  });

  test('Krungsri transfer in (Thai)', () => {
    const result = parser.parse('Krungsri: โอนเงินเข้า 6,000.00 บาท บช x3344', 'BAY', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(6000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('3344');
  });

  test('canHandle', () => {
    expect(parser.canHandle('BAY')).toBe(true);
    expect(parser.canHandle('KRUNGSRI')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('TTBBankParser', () => {
  const parser = new TTBBankParser();

  test('TTB payment (English)', () => {
    const result = parser.parse('ttb: Payment 1,500.00 THB via PromptPay A/C x9012 Bal 7,200.00 THB', 'TTB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('9012');
    expect(result!.balance).toBe(7200);
  });

  test('TTB receive transfer (Thai)', () => {
    const result = parser.parse('ttb: รับเงินโอน 8,000.00 บาท บช x9012', 'TTB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(8000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('9012');
  });

  test('canHandle', () => {
    expect(parser.canHandle('TTB')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('GSBBankParser', () => {
  const parser = new GSBBankParser();

  test('GSB deposit (Thai)', () => {
    const result = parser.parse('GSB: เงินฝากเข้า 2,500.00 บาท บช x1122 คงเหลือ 9,300.00 บาท', 'GSB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1122');
    expect(result!.balance).toBe(9300);
  });

  test('GSB withdrawal (Thai)', () => {
    const result = parser.parse('GSB: ถอนเงิน 1,000.00 บาท บช x1122', 'GSB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1122');
  });

  test('canHandle', () => {
    expect(parser.canHandle('GSB')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('BAACBankParser', () => {
  const parser = new BAACBankParser();

  test('BAAC transfer out (Thai)', () => {
    const result = parser.parse('BAAC: โอนเงินออก 1,200.00 บาท บช x4455 คงเหลือ 5,640.00 บาท', 'BAAC', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1200);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('4455');
    expect(result!.balance).toBe(5640);
  });

  test('canHandle', () => {
    expect(parser.canHandle('BAAC')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('UOBThailandParser', () => {
  const parser = new UOBThailandParser();

  test('UOB card transaction (English)', () => {
    const result = parser.parse('UOB: Card transaction 3,200.00 THB at AMAZON Bal 22,400.00 THB', 'UOB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3200);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(22400);
    expect(result!.merchant).toBe('AMAZON');
  });

  test('canHandle', () => {
    expect(parser.canHandle('UOB')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('CIMBThaiParser', () => {
  const parser = new CIMBThaiParser();

  test('CIMB transfer received (English)', () => {
    const result = parser.parse('CIMB: Transfer received 6,000.00 THB A/C x5566 Bal 14,980.00 THB', 'CIMB', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(6000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('5566');
    expect(result!.balance).toBe(14980);
  });

  test('canHandle', () => {
    expect(parser.canHandle('CIMB')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('KTCCreditCardParser', () => {
  const parser = new KTCCreditCardParser();

  test('KTC credit card spending (English)', () => {
    const result = parser.parse('KTC: Credit card spending 2,999.00 THB at LAZADA Available limit 47,001.00 THB', 'KTC', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2999);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('LAZADA');
    expect(result!.isFromCard).toBe(true);
    expect(result!.creditLimit).toBe(47001);
  });

  test('KTC international spending (Thai)', () => {
    const result = parser.parse('KTC: ยอดใช้จ่ายต่างประเทศ 120.50 USD', 'KTC', ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(120.5);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.isFromCard).toBe(true);
  });

  test('canHandle', () => {
    expect(parser.canHandle('KTC')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});

describe('Thai bank factory resolution', () => {
  const cases: [string, string, number, TransactionType][] = [
    ['BBL: Withdrawal 2,000.00 THB from A/C x1234 via ATM on 21/01/26 14:32 Bal 15,820.45 THB', 'BBL', 2000, TransactionType.EXPENSE],
    ['KBank: You spent 1,250.00 THB at SHOPEE. A/C x5678 Bal 8,430.20 THB', 'KBank', 1250, TransactionType.EXPENSE],
    ['SCB: Transfer out 3,500.00 THB to A/C x8899 Bal 6,200.00 THB', 'SCB', 3500, TransactionType.EXPENSE],
    ['KTB: เงินเข้า 4,200.00 บาท บช x7788 คงเหลือ 12,350.75 บาท', 'KTB', 4200, TransactionType.INCOME],
    ['Krungsri: ATM withdrawal 1,000.00 THB A/C x3344 Bal 9,540.00 THB', 'BAY', 1000, TransactionType.EXPENSE],
    ['ttb: Payment 1,500.00 THB via PromptPay A/C x9012 Bal 7,200.00 THB', 'TTB', 1500, TransactionType.EXPENSE],
    ['GSB: เงินฝากเข้า 2,500.00 บาท บช x1122 คงเหลือ 9,300.00 บาท', 'GSB', 2500, TransactionType.INCOME],
    ['BAAC: โอนเงินออก 1,200.00 บาท บช x4455 คงเหลือ 5,640.00 บาท', 'BAAC', 1200, TransactionType.EXPENSE],
    ['UOB: Card transaction 3,200.00 THB at AMAZON Bal 22,400.00 THB', 'UOB', 3200, TransactionType.EXPENSE],
    ['CIMB: Transfer received 6,000.00 THB A/C x5566 Bal 14,980.00 THB', 'CIMB', 6000, TransactionType.INCOME],
    ['KTC: Credit card spending 2,999.00 THB at LAZADA Available limit 47,001.00 THB', 'KTC', 2999, TransactionType.CREDIT],
  ];

  test.each(cases)('factory resolves sender "%s"', (msg, sender, amount, type) => {
    const result = BankParserFactory.parse(msg, sender, ts);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(amount);
    expect(result!.type).toBe(type);
  });
});
