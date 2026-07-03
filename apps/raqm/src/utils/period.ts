export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface PeriodBounds {
  from: number;
  to: number;
}

/** Local calendar day containing `ref`: 00:00:00.000 → 23:59:59.999. */
export function getDayBounds(ref: Date): PeriodBounds {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  return {
    from: new Date(y, m, d, 0, 0, 0, 0).getTime(),
    to: new Date(y, m, d, 23, 59, 59, 999).getTime(),
  };
}

/** Monday 00:00:00.000 → Sunday 23:59:59.999 of the week containing `ref`. */
export function getWeekBounds(ref: Date): PeriodBounds {
  const day = ref.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  return { from: monday.getTime(), to: sunday.getTime() };
}

/**
 * Custom month-start-day period containing `ref`. `startDay` is clamped to [1, 28].
 * If ref's day-of-month >= startDay: period is [startDay of ref's month, startDay-1 of next month].
 * If ref's day-of-month <  startDay: period is [startDay of prev month, startDay-1 of ref's month].
 * startDay === 1 degenerates to the ordinary calendar month.
 */
export function getMonthBounds(ref: Date, startDay: number): PeriodBounds {
  const clampedStart = Math.min(Math.max(Math.trunc(startDay), 1), 28);
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  let startY = y;
  let startM = m;
  if (d < clampedStart) {
    startM -= 1;
    if (startM < 0) {
      startM = 11;
      startY -= 1;
    }
  }

  let endY = startY;
  let endM = startM + 1;
  if (endM > 11) {
    endM = 0;
    endY += 1;
  }

  const from = new Date(startY, startM, clampedStart, 0, 0, 0, 0).getTime();
  // Date(y, m, 0) rolls back to the last day of month (m-1) — gives startDay-1 of endM correctly,
  // including the calendar-month case where clampedStart-1 === 0.
  const to = new Date(endY, endM, clampedStart - 1, 23, 59, 59, 999).getTime();
  return { from, to };
}
