// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker

const GENERIC_FAILURES = [
  'declined', 'decline', 'failed', 'failure', 'not successful',
  'was not completed', 'could not be completed', 'rejected',
  'cancelled', 'canceled', 'reversed due to error',
];

const SECURITY_PHRASES = [
  'your code is', 'verification code', 'one time password',
  'one-time password', 'otp', 'الرقم السري',
];

const OPERATIONAL_PHRASES = [
  'scheduled maintenance', 'service interruption', 'service is unavailable',
  'terms and conditions', 'learn more', 'exclusive offer', 'cashback offer',
];

export const FinancialMessageSafety = {
  hasExplicitFailure(message: string, additionalPhrases: readonly string[] = []): boolean {
    const lower = message.toLowerCase();
    return GENERIC_FAILURES.some((p) => lower.includes(p)) ||
      additionalPhrases.some((p) => lower.includes(p.toLowerCase()));
  },

  isSecurityCode(message: string): boolean {
    const lower = message.toLowerCase();
    return SECURITY_PHRASES.some((p) => lower.includes(p));
  },

  isOperationalOrPromotionalNotice(message: string): boolean {
    const lower = message.toLowerCase();
    return OPERATIONAL_PHRASES.some((p) => lower.includes(p));
  },
};
