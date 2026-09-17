import { getSetting, setSetting } from '../db/database';
import { getCycleBounds, type CycleConfig, type CycleMode, type PeriodBounds } from '../utils/period';

const DEFAULT_DAYS = 30;

/** The one app-wide budget cycle, read from app_settings — used by every current-period
 * spend surface (Dashboard, Analytics, CategoryDetail/Overview, budgets, export) so they
 * never disagree with each other. `month_start_day` is reused as-is for calendar mode. */
export async function getCycleConfig(): Promise<CycleConfig> {
  const [modeRaw, monthStartDayRaw, daysRaw, anchorRaw] = await Promise.all([
    getSetting('cycle_mode'),
    getSetting('month_start_day'),
    getSetting('cycle_days'),
    getSetting('cycle_anchor'),
  ]);
  return {
    mode: modeRaw === 'fixed' ? 'fixed' : 'calendar',
    monthStartDay: monthStartDayRaw ? Number(monthStartDayRaw) : 1,
    days: daysRaw ? Math.max(1, Number(daysRaw)) : DEFAULT_DAYS,
    anchor: anchorRaw ? Number(anchorRaw) : Date.now(),
  };
}

export async function currentCycleBounds(ref: Date = new Date()): Promise<PeriodBounds> {
  return getCycleBounds(ref, await getCycleConfig());
}

/** Switches the global cycle mode. When entering 'fixed' mode with no anchor set yet,
 * anchors it to today's midnight so the first period boundary is predictable. */
export async function setCycleMode(mode: CycleMode, days?: number): Promise<void> {
  await setSetting('cycle_mode', mode);
  if (mode === 'fixed') {
    if (days != null) await setSetting('cycle_days', String(Math.max(1, Math.trunc(days))));
    const existingAnchor = await getSetting('cycle_anchor');
    if (!existingAnchor) {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      await setSetting('cycle_anchor', String(midnight));
    }
  }
}

export async function setCycleDays(days: number): Promise<void> {
  await setSetting('cycle_days', String(Math.max(1, Math.trunc(days))));
}
