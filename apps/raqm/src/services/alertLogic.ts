export const DEFAULT_ALERT_STEPS: readonly number[] = [80, 100];
export const ALERT_STEP_CHOICES: readonly number[] = [50, 80, 100];

export function parseAlertSteps(raw: string | null | undefined): number[] {
  if (raw == null) return [...DEFAULT_ALERT_STEPS];
  const steps = raw
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 1000);
  return [...new Set(steps)].sort((a, b) => a - b);
}

export function serializeAlertSteps(steps: number[]): string {
  return [...new Set(steps)].sort((a, b) => a - b).join(',');
}

/** Fires only the highest newly-crossed step; every crossed unsent step is marked sent. */
export function stepsToFire(
  pct: number,
  steps: number[],
  isSent: (step: number) => boolean,
): { fire: number | null; markSent: number[] } {
  const unsent = steps.filter((s) => pct >= s && !isSent(s));
  if (unsent.length === 0) return { fire: null, markSent: [] };
  return { fire: Math.max(...unsent), markSent: unsent };
}

export type LowBalanceAction = 'fire' | 'rearm' | 'none';

export function lowBalanceDecision(
  balance: number | null,
  threshold: number | null,
  alerted: boolean,
): LowBalanceAction {
  if (balance == null || threshold == null) return 'none';
  if (balance < threshold) return alerted ? 'none' : 'fire';
  return alerted ? 'rearm' : 'none';
}
