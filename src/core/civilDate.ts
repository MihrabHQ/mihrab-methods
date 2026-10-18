/**
 * Civil dates as the library takes them: 'YYYY-MM-DD', or { year, month,
 * day } with January = 1. The methods themselves count months from 0, as
 * JavaScript's Date does; that habit stops at this file.
 */
import type { CivilDate } from './types.js';

export type Ymd = { year: number; month0: number; day: number; iso: string };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCivilDate(date: CivilDate): Ymd {
  let year: number, month: number, day: number;
  if (typeof date === 'string') {
    const m = ISO.exec(date);
    if (!m) throw new TypeError(`Not a date: ${JSON.stringify(date)} — expected 'YYYY-MM-DD' or { year, month, day }.`);
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if (date && typeof date === 'object' && typeof date.year === 'number' && typeof date.month === 'number' && typeof date.day === 'number') {
    ({ year, month, day } = date);
  } else {
    throw new TypeError(
      typeof date === 'number'
        ? 'timesFor(place, year, month, day) is no longer the call: pass one date, as \'YYYY-MM-DD\' or { year, month, day } with January = 1.'
        : `Not a date: ${JSON.stringify(date)} — expected 'YYYY-MM-DD' or { year, month, day }.`,
    );
  }
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`Not a calendar date: ${isoOf(year, month - 1, day)} (months run 1–12).`);
  }
  // 31 April, 30 February: a Date would roll these over without a word.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new RangeError(`Not a calendar date: ${isoOf(year, month - 1, day)}.`);
  }
  return { year, month0: month - 1, day, iso: isoOf(year, month - 1, day) };
}

/** 'YYYY-MM-DD' from a year, a 0-based month and a day. */
export function isoOf(year: number, month0: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The day after, as a civil date (UTC arithmetic: no zone, no summer time). */
export function nextDay(d: Ymd): Ymd {
  const n = new Date(Date.UTC(d.year, d.month0, d.day + 1));
  return { year: n.getUTCFullYear(), month0: n.getUTCMonth(), day: n.getUTCDate(), iso: isoOf(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) };
}
