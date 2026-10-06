import { CrdbBankParser } from '../banks/CrdbBankParser';
import { TransactionType } from '../core/types';

const parser = new CrdbBankParser();
const ts = 1000000000000;

type Case = {
  name: string;
  msg: string;
  sender: string;
  amount: number;
  currency: string;
  type: TransactionType;
  merchant?: string | null;
  reference?: string | null;
  balance?: number | null;
  accountLast4?: string | null;
  isFromCard?: boolean;
};

const cases: Case[] = [
  {
    name: 'ATM withdrawal (English)',
    msg: 'Dear NAME, TZS 50000.00 has been withdrawn using a Card 4232***0581 On 19.01.2511:53 Balance is TZS 550070.90',
    sender: 'CRDB BANK', amount: 50000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'ATM Withdrawal', balance: 550070.9, accountLast4: '0581',
  },
  {
    name: 'card payment in USD',
    msg: 'Paid:NETFLIX.COM, NL USD 9.99 Card:4232***0581 Date:17.01.2517:39 Bal:TZS923041.06',
    sender: 'CRDB BANK', amount: 9.99, currency: 'USD', type: TransactionType.EXPENSE,
    merchant: 'NETFLIX.COM, NL', balance: 923041.06, accountLast4: '0581',
  },
  {
    name: 'mobile money send (Swahili)',
    msg: 'Muamala umefanikiwa TZS40000 AIRTEL kwenda MSHAMU MSHAMU 255686621388',
    sender: 'CRDB BANK', amount: 40000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'MSHAMU MSHAMU',
  },
  {
    name: 'bill payment',
    msg: 'Malipo yamekamilika TOTAL TZS 2000',
    sender: 'CRDB BANK', amount: 2000, currency: 'TZS', type: TransactionType.EXPENSE, merchant: 'TOTAL',
  },
  {
    name: 'incoming with umepokea and kwenda is INCOME',
    msg: 'Umepokea TZS 75000.00 kutoka JOHN DOE kwenda akaunti yako Balance is TZS 200000.00',
    sender: 'CRDB BANK', amount: 75000, currency: 'TZS', type: TransactionType.INCOME, balance: 200000,
  },
  {
    name: 'outgoing send mentioning recipient received is EXPENSE',
    msg: 'Umetuma TZS 30000.00 kwenda JANE DOE. JANE DOE has received the funds. Bal:TZS 50000.00',
    sender: 'CRDB BANK', amount: 30000, currency: 'TZS', type: TransactionType.EXPENSE, balance: 50000,
  },
  {
    name: 'LUKU token anchors on TOTAL line',
    msg: 'Malipo yamekamilika.19ec9775f682395e 9007261660708258420 TOKEN 6642 0488 4500 7039 0706 12.2KWH Cost 1229.51 VAT 18% 221.31 EWURA 1% 12.30 REA 3% 36.88 Debt Collected 1500.00 TOTAL TZS 3000.00 2026-06-15 07:08',
    sender: 'CRDB', amount: 3000, currency: 'TZS', type: TransactionType.EXPENSE, merchant: 'LUKU',
  },
  {
    name: 'SimBanking interbank transfer',
    msg: 'KUMB:19ec6ebe82c12bc7 Muamala umefanikiwa TZS35000 SELCOM BANK kwenda JANE DOE 06XXXXXXXX Risiti:003-19ec6ebe82c12bc7 2026-06-14 19:16:49  CRDB SIMBANKING APP',
    sender: 'CRDB', amount: 35000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'JANE DOE', reference: '003-19ec6ebe82c12bc7',
  },
  {
    name: 'account-to-account transfer (Umetuma)',
    msg: 'Umetuma TZS 39,600.0 kutoka AC:01522***6100 kwenda JOHN DOE AC: 11375680 REF: 19ec69444b7bba7c 2026-06-14 17:41:9. Kwa msaada piga 0755197700',
    sender: 'CRDB', amount: 39600, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'JOHN DOE', reference: '19ec69444b7bba7c',
  },
  {
    name: 'Lipa merchant payment drops LIPA prefix',
    msg: 'KUMB:19ec660b8a1c1bde Muamala umefanikiwa TZS30000 VODACOM kwenda LIPA MERCHANT NAME 51469658 Risiti:003-19ec660b8a1c1bde 2026-06-14 16:44:48  CRDB SIMBANKING APP',
    sender: 'CRDB', amount: 30000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'MERCHANT NAME', reference: '003-19ec660b8a1c1bde',
  },
  {
    name: 'inbound deposit',
    msg: 'Dear Customer, you have received TZS850,000.00 in your account number: 0152********100 2026-06-13T19:18 REF:FT2616465ZC2 . For queries call 0755197700.',
    sender: 'CRDB', amount: 850000, currency: 'TZS', type: TransactionType.INCOME, reference: 'FT2616465ZC2',
  },
  {
    name: 'ATM withdrawal with masked card is a card transaction',
    msg: 'Dear JOHN DOE, TZS150000.00 has been withdrawn using a Card 4232***XXXX On 20.04.26 11:39 Balance is TZS2237.77 Inq. Call: 0755197700',
    sender: 'CRDB', amount: 150000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'ATM Withdrawal', balance: 2237.77, isFromCard: true, accountLast4: '4232',
  },
  {
    name: 'KUMB-only reference falls back to the transaction id',
    msg: 'KUMB:19ec7af09b2d4ce1 Muamala umefanikiwa TZS12000 AIRTEL kwenda JOHN DOE 07XXXXXXXX 2026-06-15 09:10:21  CRDB SIMBANKING APP',
    sender: 'CRDB', amount: 12000, currency: 'TZS', type: TransactionType.EXPENSE,
    merchant: 'JOHN DOE', reference: '19ec7af09b2d4ce1',
  },
];

describe('CrdbBankParser', () => {
  test.each(cases)('$name', (c) => {
    const r = parser.parse(c.msg, c.sender, ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(c.amount);
    expect(r!.currency).toBe(c.currency);
    expect(r!.type).toBe(c.type);
    if (c.merchant !== undefined) expect(r!.merchant).toBe(c.merchant);
    if (c.reference !== undefined) expect(r!.reference).toBe(c.reference);
    if (c.balance !== undefined) expect(r!.balance).toBe(c.balance);
    if (c.accountLast4 !== undefined) expect(r!.accountLast4).toBe(c.accountLast4);
    if (c.isFromCard !== undefined) expect(r!.isFromCard).toBe(c.isFromCard);
  });

  test('OTP is not a transaction', () => {
    expect(parser.parse('Your OTP is 123456 for TZS 5000 paid:', 'CRDB', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('CRDB BANK')).toBe(true);
    expect(parser.canHandle('crdb')).toBe(true);
    expect(parser.canHandle('MPESA')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
