# bank-sms-parser

A TypeScript library that parses bank SMS messages into structured transaction data. Supports 120+ Indian and international banks — extracts amount, transaction type, merchant, account number, and balance in a single call.

Works in **Node.js**, **React Native**, and any TypeScript/JavaScript project. No native dependencies.

[![npm](https://img.shields.io/npm/v/bank-sms-parser)](https://www.npmjs.com/package/@rahatsayyed/bank-sms-parser)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Tests](https://img.shields.io/badge/tests-328%20passing-brightgreen)](https://github.com/rahatsayyed/BankSMSParser/actions)

---

## Installation

```bash
npm install bank-sms-parser
```

---

## Usage

```typescript
import { BankParserFactory } from 'bank-sms-parser';

const sms = 'Rs.1,500.00 debited from a/c **4321 on 20-06-2026. Info: UPI-Swiggy. Avl Bal: Rs.24,500.00';
const sender = 'HDFCBK';
const timestamp = Date.now();

const tx = BankParserFactory.parse(sms, sender, timestamp);

if (tx) {
  console.log(tx.type);        // 'EXPENSE'
  console.log(tx.amount);      // 1500
  console.log(tx.merchant);    // 'Swiggy'
  console.log(tx.accountLast4); // '4321'
  console.log(tx.balance);     // 24500
  console.log(tx.bankName);    // 'HDFC Bank'
}
```

### Check if a sender is a known bank

```typescript
import { BankParserFactory } from 'bank-sms-parser';

BankParserFactory.isKnownBankSender('HDFCBK');  // true
BankParserFactory.isKnownBankSender('ICICIBK');  // true
BankParserFactory.isKnownBankSender('VM-AMAZON'); // false
```

### Use a specific parser directly

```typescript
import { HDFCBankParser } from 'bank-sms-parser';

const parser = new HDFCBankParser();
const tx = parser.parse(sms, sender, timestamp);
```

---

## Parsed Transaction

```typescript
interface ParsedTransaction {
  amount: number;           // Transaction amount (always positive)
  type: TransactionType;    // EXPENSE | INCOME | TRANSFER | INVESTMENT | BALANCE_UPDATE
  merchant: string | null;  // Merchant or payee name
  reference: string | null; // Bank reference / UPI transaction ID
  accountLast4: string | null; // Last 4 digits of the account
  balance: string | null;   // Available balance after transaction
  bankName: string;         // Human-readable bank name
  sender: string;           // Original SMS sender ID
  timestamp: number;        // Unix timestamp (ms)
  smsBody: string;          // Original SMS text

  // Optional
  currency?: string;        // Defaults to 'INR'
  isFromCard?: boolean;
  fromAccount?: string | null;
  toAccount?: string | null;
  creditLimit?: number | null;
}
```

### TransactionType values

| Value | Meaning |
|---|---|
| `EXPENSE` | Money debited / spent |
| `INCOME` | Money credited / received |
| `TRANSFER` | Between own accounts |
| `INVESTMENT` | Mutual fund / SIP |
| `BALANCE_UPDATE` | Balance alert, no transaction |

---

## Supported Banks

### India (60+)
| Bank | Sender examples |
|---|---|
| HDFC Bank | HDFCBK, AD-HDFCBK |
| ICICI Bank | ICICIB, AD-ICICIB |
| State Bank of India | SBIINB, AD-SBIINB |
| Axis Bank | AXISBK, AD-AXISBK |
| Kotak Mahindra Bank | KOTAKB, AD-KOTAKB |
| IDFC First Bank | IDFCBK |
| Federal Bank | FEDBK |
| Yes Bank | YESBK |
| IndusInd Bank | INDBNK |
| DBS Bank | DBSBNK |
| Punjab National Bank | PNBSMS |
| Bank of Baroda | BARBSM |
| Bank of India | BOISML |
| Union Bank | UBISMS |
| Indian Bank | INDBKS |
| Central Bank of India | CENTBK |
| South Indian Bank | SIBANK |
| Karnataka Bank | KTKBNK |
| Canara Bank | CNRBNK |
| Indian Overseas Bank | IOBSMS |
| Airtel Payments Bank | AIRBNK |
| Jio Payments Bank | JIOBKS |
| IPPB | IPPBNK |
| OneCard | ONECRD |
| Slice | SLICEP |
| LazyPay | LAZPAY |
| Jupiter | JUPBNK |
| CRED | CREDCP |
| Juspay | JUSBNK |
| HDFC Mutual Fund | HDFCMF |
| Navi Mutual Fund | NAVIMF |
| + more | — |

### Middle East
ADCB, Emirates Islamic, Emirates NBD, FAB, LivBank, Mashreq, Al Rajhi, Alinma, Saudi National Bank (SNB), STC Bank, SABB

### Africa
Access Bank, Keystone Bank, Zenith Bank, Opay, M-PESA (Kenya/Tanzania/Mozambique), Telebirr, CRDB, Dashen Bank, CBE, Selcom Pesa, Tigo Pesa, eMola, Millennium BIM, Standard Bank Mozambique, Zemen Bank

### South & Southeast Asia
NMB Bank (Nepal), Nabil Bank, Siddhartha Bank, Everest Bank, Prime Commercial Bank, Laxmi Bank, GSB Bank, Sampath Bank (Sri Lanka), Kasikorn Bank, Bangkok Bank, Krungsri, Krung Thai, CIMB Thai, SCB, TTB, UOB Thailand, BAAC

### Europe & Americas
BPCE (France), Sparkasse Rhein-Maas (Germany), mBank CZ (Czech Republic), Priorbank (Belarus), Charles Schwab, Chase Bank, Altana FCU, Navy Federal, Discover Card, Old Hickory, Citi Bank, Huntington Bank

### Iran
Mellat Bank, Melli Bank, Parsian Bank, Blue Bank, Bankino, Alec Bank, Enpar Bank

---

## Building a Personal Finance App?

This library handles **detection only** — extracting raw transaction data from SMS. For a full personal finance stack, you'll also need:

- **Categorization** — merchant name → category (Food, Transport, Shopping, etc.)
- **Self-transfer detection** — match debit + credit within a time window
- **Deduplication** — `generateTransactionId()` is provided for stable IDs

---

## Syncing with Upstream

This library is a TypeScript port of [PennyWise's parser-core](https://github.com/sarim2000/pennywiseai-tracker/tree/main/parser-core). See [SYNC.md](./SYNC.md) for the step-by-step process to replicate upstream changes.

---

## Contributing

Pull requests welcome — especially:
- New bank parsers (follow the pattern in `src/banks/`)
- Test cases with real (anonymized) SMS samples
- Indian merchant data for categorization

When adding a parser, also register it in `src/BankParserFactory.ts` and add a test in `src/__tests__/`.

---

## License

[AGPL-3.0](LICENSE) — open source, copyleft. If you use this in a product, your product must also be open source under AGPL. For a commercial license, open an issue.
