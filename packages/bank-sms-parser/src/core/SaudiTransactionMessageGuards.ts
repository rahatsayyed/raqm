// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { FinancialMessageSafety } from './FinancialMessageSafety';

const OPERATIONAL = [
  'successfully added to apple pay', 'wallet limit', 'your limit has gone up',
  'cashback offer', 'exclusive offer', 'special offer', 'promotional message', 'unsubscribe',
];

const ARABIC_FAILURES = [
  'رصيد غير كافي', 'عملية مرفوضة', 'تم رفض العملية', 'فشل العملية',
  'عملية فاشلة', 'تعذر إتمام العملية', 'لم تتم العملية', 'عملية غير ناجحة',
];

const ENGLISH_FAILURES = [
  'insufficient balance', 'insufficient funds', 'transaction declined',
  'transaction failed', 'transaction rejected', 'purchase declined',
  'purchase failed', 'purchase rejected', 'payment declined', 'payment failed',
  'payment rejected', 'transfer declined', 'transfer failed', 'transfer rejected',
];

const EN_CREDIT_NOUNS = ['refund', 'reversal'];
const EN_FAILURE_WORDS = ['declined', 'failed', 'rejected', 'unsuccessful'];
const ARABIC_CREDIT_NOUNS = ['استرجاع', 'مرتجع', 'إرجاع', 'تصحيح'];
const ARABIC_FAILURE_WORDS = ['مرفوضة', 'مرفوض', 'فاشلة'];

const ARABIC_TRANSACTION_FAILURE = /(?:شراء|حوالة|سداد|خصم|سحب|إيداع)(?:\s+دولي)?\s+مرفوض(?:ة)?/;
const STATUS_BEFORE_TRANSACTION = /\b(?:declined|failed|rejected)\s+(?:card\s+)?(?:transaction|purchase|payment|transfer)\b/;
const TRANSACTION_BEFORE_STATUS = /\b(?:card\s+)?(?:transaction|purchase|payment|transfer)\s+(?:was\s+|has\s+been\s+)?(?:declined|failed|rejected)\b/;

export const SaudiTransactionMessageGuards = {
  // A failure word anywhere drops the message, even a refund that merely mentions a failed payment
  isDeclinedOrFailed(message: string): boolean {
    if (FinancialMessageSafety.isSecurityCode(message)) return true;

    const lower = message.toLowerCase();
    if (FinancialMessageSafety.hasExplicitFailure(message, ARABIC_FAILURES)) return true;
    if (ENGLISH_FAILURES.some((p) => lower.includes(p))) return true;

    if (EN_CREDIT_NOUNS.some((p) => lower.includes(p)) &&
      EN_FAILURE_WORDS.some((p) => lower.includes(p))) return true;
    if (ARABIC_CREDIT_NOUNS.some((p) => message.includes(p)) &&
      ARABIC_FAILURE_WORDS.some((p) => message.includes(p))) return true;

    return STATUS_BEFORE_TRANSACTION.test(lower) ||
      TRANSACTION_BEFORE_STATUS.test(lower) ||
      ARABIC_TRANSACTION_FAILURE.test(message);
  },

  isPromotionalOrOperationalNotice(message: string): boolean {
    const lower = message.toLowerCase();
    return FinancialMessageSafety.isOperationalOrPromotionalNotice(message) ||
      OPERATIONAL.some((p) => lower.includes(p));
  },
};
