import { md5Hex } from './hashing';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  CREDIT = 'CREDIT',
  TRANSFER = 'TRANSFER',
  INVESTMENT = 'INVESTMENT',
  BALANCE_UPDATE = 'BALANCE_UPDATE',
}

/**
 * Common interface for mandate information across all banks.
 * This allows standardized handling of subscription/mandate data
 * from different banks while maintaining bank-specific implementations.
 */
export interface MandateInfo {
  /** The amount that will be charged */
  amount: number;

  /**
   * The next deduction date in string format.
   * Date format varies by bank (e.g., "dd/MM/yy", "d-MMM-yy")
   */
  nextDeductionDate: string | null;

  /** The merchant/service name */
  merchant: string;

  /**
   * Unique Mandate Number (if available).
   * May be null for some banks or mandate types.
   */
  umn: string | null;

  /**
   * The date format used by this bank for parsing nextDeductionDate.
   * Default is "dd/MM/yy" but can be overridden per bank.
   */
  dateFormat: string;
}

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  merchant: string | null;
  reference: string | null;
  accountLast4: string | null;
  balance: number | null;
  smsBody: string;
  sender: string;
  timestamp: number;
  bankName: string;
  // Optional fields — default values applied by createParsedTransaction()
  creditLimit?: number | null;
  transactionHash?: string | null;
  isFromCard?: boolean;
  currency?: string;
  fromAccount?: string | null;
  toAccount?: string | null;
}

/**
 * Creates a new ParsedTransaction with all required fields and sensible defaults.
 */
export function createParsedTransaction(
  fields: Omit<ParsedTransaction, 'creditLimit' | 'transactionHash' | 'isFromCard' | 'currency' | 'fromAccount' | 'toAccount'> &
    Partial<Pick<ParsedTransaction, 'creditLimit' | 'transactionHash' | 'isFromCard' | 'currency' | 'fromAccount' | 'toAccount'>>
): ParsedTransaction {
  return {
    creditLimit: null,
    transactionHash: null,
    isFromCard: false,
    currency: 'INR',
    fromAccount: null,
    toAccount: null,
    ...fields,
  };
}

/**
 * Generates a stable, deduplicated transaction ID from a ParsedTransaction.
 * Mirrors ParsedTransaction.generateTransactionId() in Kotlin.
 */
export function generateTransactionId(tx: ParsedTransaction): string {
  const normalizedAmount = Math.round(tx.amount * 100) / 100;
  const smsBodyHash = md5Hex(tx.smsBody).slice(0, 16);
  const data = `${tx.sender}|${normalizedAmount.toFixed(2)}|${smsBodyHash}`;
  return md5Hex(data);
}
