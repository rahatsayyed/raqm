---
name: add-bank-parser
description: Scaffold a new bank/PSP SMS parser for @rahatsayyed/bank-sms-parser (packages/bank-sms-parser) from one or more sample SMS messages — the parser class, its BankParserFactory registration, and a jest test file. User-invoked only.
disable-model-invocation: true
---

# Add a bank SMS parser

Scaffolds a new parser in `packages/bank-sms-parser` following the package's
existing conventions. This package has 120+ parsers already — the fastest, most
consistent way to add one is to copy the shape of an existing sibling, not to
design from scratch.

## Inputs needed from the user

Before writing anything, get:
1. One or more **real (or realistic) sample SMS messages** for the bank/PSP,
   covering at least a debit and a credit if both exist. Ask for these if not
   already provided — patterns cannot be written correctly by guessing format.
2. The bank/PSP **name** and its known **sender IDs** (e.g. `HDFCBK`, `VM-HDFCBK`,
   DLT header patterns) — ask if unclear from the sample.
3. Which **country/style** it's closest to, to pick the right base class and a
   sibling to model after (see below).

## Steps

1. **Pick a base class** from `packages/bank-sms-parser/src/core/`:
   - `BaseIndianBankParser` — Indian banks/PSPs (the vast majority; handles
     `Rs.`/`INR`/`₹`, DD-MM-YY dates, VPA/UPI patterns).
   - `BaseThailandBankParser` — Thai banks (see `BangkokBankParser.ts`,
     `KasikornBankParser.ts` for the format).
   - `BaseIranianBankParser` — Iranian banks (see `MelliBankParser.ts`,
     `MellatBankParser.ts`).
   - Plain `BankParser` (from `core/BankParser.ts`) directly for anything that
     doesn't fit an existing regional base — check `GreaterBankParser.ts` or
     `CBEBankParser.ts` for examples of parsers extending `BankParser` directly.

2. **Find the closest sibling parser** in `src/banks/` — same country, similar
   message style (e.g. another Indian PSP like `CredParser.ts` or `SliceParser.ts`
   for app-based UPI wrappers, vs. a traditional bank like `AxisBankParser.ts`).
   Read it fully. Model the new parser's structure on it: same method set,
   same style of pattern matching, same fallback-to-`super()` behavior.

3. **Write the parser class** at `src/banks/<Name>Parser.ts`. At minimum implement:
   - `getBankName(): string`
   - `canHandle(sender: string): boolean` — match against the real sender IDs
     from step 1, not guesses.
   - Override `extractMerchant`, `extractTransactionType`, `isTransactionMessage`
     only where the base class's generic patterns don't already handle the
     sample messages — check the base class first; don't reimplement what it
     already does generically (`extractAmount`, `extractBalance`,
     `extractAccountLast4`, `extractReference` often need no override).
   - `export default new <Name>Parser();` at the bottom, matching sibling files.

4. **Register it** in `packages/bank-sms-parser/src/BankParserFactory.ts`:
   add the import alongside the alphabetically/regionally-grouped existing
   imports, and add `new <Name>Parser(),` to the `parsers` array in the same
   grouping the sibling you modeled from lives in.

5. **Write the test file** at `src/__tests__/<Name>Parser.test.ts`, modeled on
   an existing test file's shape (see `HDFCBankParser.test.ts` or
   `GreaterBankParser.test.ts`): a `canHandle` true/false pair, one test per
   sample SMS asserting `type`, `amount`, and `balance` where present, and a
   false-positive test (OTP or promo message) asserting `parse()` returns `null`.
   Use the actual sample messages from step 1 as test fixtures — don't invent
   synthetic ones that don't match the real format.

6. **Run the test suite**: `cd packages/bank-sms-parser && npx jest src/__tests__/<Name>Parser.test.ts`.
   Iterate on the regex patterns until it's green, then run the full suite
   (`npm test`) to confirm no existing parser's `canHandle` now collides with
   the new sender IDs.

## Comment discipline

This repo's CLAUDE.md hard rule applies here too: no comment longer than one
line, ever. JSDoc-style block comments exist on some older files in this
package (e.g. `BankParser.ts`) — don't copy that style into new code; match the
one-line-max rule instead.
