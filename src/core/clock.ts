/**
 * The clock a table prints a day in: the place's zone as kept at noon, or
 * the table's own clock where it keeps one no zone does (`Place.clock`). A
 * table prints the whole day in the clock kept at noon, so on the morning
 * the clocks go forward a Fajr before the change is printed in the new time.
 */
import type { Place, TableClock } from './types.js';

const formats = new Map<string, Intl.DateTimeFormat>();

/**
 * Minutes east of UTC that a zone keeps at noon UTC of a date (month 0-based).
 *
 * Read from the zone's wall clock (year … minute, as every Intl has them),
 * not from `timeZoneName: 'longOffset'`, which not every runtime supports:
 * where it is missing the name comes back as 'GMT+1' or a zone's own
 * abbreviation, and an offset parsed from that is silently wrong.
 */
export function clockOffsetAt(tz: string, year: number, month: number, day: number): number {
  const at = Date.UTC(year, month, day, 12);
  let f = formats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formats.set(tz, f);
  }
  const parts = f.formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'));
  if (!Number.isFinite(wall)) throw new RangeError(`The zone ${tz} could not be read on this runtime.`);
  return Math.round((wall - at) / 60_000);
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
