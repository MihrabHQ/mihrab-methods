/**
 * The clock a table prints a day in: the place's zone as kept at noon, or
 * the table's own clock where it keeps one no zone does (`Place.clock`). A
 * table prints the whole day in the clock kept at noon, so on the morning
 * the clocks go forward a Fajr before the change is printed in the new time.
 */
import type { Place, TableClock } from './types.js';

const offsetFormats = new Map<string, Intl.DateTimeFormat>();

/** Minutes east of UTC that a zone keeps at noon UTC of a date (month 0-based). */
export function clockOffsetAt(tz: string, year: number, month: number, day: number): number {
  let f = offsetFormats.get(tz);
  if (!f) offsetFormats.set(tz, (f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })));
  const z = f.formatToParts(new Date(Date.UTC(year, month, day, 12))).find(x => x.type === 'timeZoneName')!.value;
  const m = /GMT([+-])(\d\d):?(\d\d)?/.exec(z);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** The clock a place's table prints a date in: its own (`Place.clock`) where it has one, else its zone's. Month 0-based. */
export function placeClockAt(place: Place, year: number, month: number, day: number): number {
  if (place.clock) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let off = place.clock[0][1];
    for (const [from, o] of place.clock) if (from <= date) off = o;
    return off;
  }
  return clockOffsetAt(place.tz, year, month, day);
}

export function offsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export function tableClockAt(place: Place, year: number, month: number, day: number): TableClock {
  const offsetMinutes = placeClockAt(place, year, month, day);
  return place.clock
    ? { zone: null, offsetMinutes, label: offsetLabel(offsetMinutes) }
    : { zone: place.tz, offsetMinutes, label: place.tz };
}

/** 'HH:MM' of an instant on a clock, as a table prints it. */
export function printedAt(instant: Date, offsetMinutes: number): string {
  const local = Math.floor(instant.getTime() / 60_000) + offsetMinutes;
  const m = ((local % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
