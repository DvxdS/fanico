import { BadRequestException } from '@nestjs/common';

export interface DateWindow {
  from: Date;
  to: Date; // half-open: [from, to)
}

// NOTE: windows are computed in UTC, which equals local time for the pilot
// shops (Abidjan = GMT+0). TODO: per-shop timezone once we operate in UTC+1
// zones (e.g. Benin/Niger).

function parseYmd(value: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException(`Expected a YYYY-MM-DD date, got "${value}"`);
  }
  return { y: +match[1], m: +match[2], d: +match[3] };
}

/** [00:00 UTC of date, 00:00 UTC of the next day). */
export function dayWindow(date: string): DateWindow {
  const { y, m, d } = parseYmd(date);
  const from = new Date(Date.UTC(y, m - 1, d));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from, to };
}

/** [weekStart 00:00 UTC, +7 days). */
export function weekWindow(weekStart: string): DateWindow {
  const { y, m, d } = parseYmd(weekStart);
  const from = new Date(Date.UTC(y, m - 1, d));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);
  return { from, to };
}

/** The 7 half-open day windows that make up a week starting at weekStart. */
export function weekDayWindows(weekStart: string): DateWindow[] {
  const { y, m, d } = parseYmd(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const from = new Date(Date.UTC(y, m - 1, d + i));
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from, to };
  });
}

/** [first of month 00:00 UTC, first of next month). */
export function monthWindow(month: string): DateWindow {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new BadRequestException(`Expected a YYYY-MM month, got "${month}"`);
  }
  const y = +match[1];
  const m = +match[2];
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  return { from, to };
}

/** Percent change of cur vs prev, rounded to 1 decimal. Handles prev === 0. */
export function percentDelta(cur: number, prev: number): number {
  if (prev === 0) {
    return cur === 0 ? 0 : 100;
  }
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
