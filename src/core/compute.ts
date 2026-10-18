/**
 * The methods, run for a place and a civil date (month 0-based, as the
 * methods count): the authority's own formula, then its correction list.
 * This is the computation `timesFor` and the checks share; the API around
 * it is in `api.ts`.
 */
import { congressTimes } from '../methods/sweden.js';
import { moroccoTimes } from '../methods/morocco.js';
import { algeriaTimes } from '../methods/algeria.js';
import { kemenagTimes } from '../methods/indonesia.js';
import { authorityData } from './registry.js';
import { placeClockAt } from './clock.js';
import type { Instants, Place, PrayerKey } from './types.js';

export type ComputeOptions = { corrections?: boolean };

/**
 * The method as it stands, certified or not, for a civil date with the
 * month 0-based. Null where the method gives no times for the day. Not for
 * showing anyone their prayer times: `timesFor` is.
 */
export function candidateInstants(place: Place, year: number, month: number, day: number, asrShadow: 1 | 2 = 1, opts: ComputeOptions = {}): Instants | null {
  const fix = opts.corrections === false ? null : authorityData(place.authority).corrections;
  switch (place.authority) {
    case 'sweden':
    case 'diyanet': {
      // The Congress method's own rounding is inside it; its instants land on the minute (rounded, as the app does).
      const clock = placeClockAt(place, year, month, day);
      const t = place.prayerPoints ? perPrayer(place, place.prayerPoints, year, month, day, asrShadow) : congressTimes(place.lat, place.lon, year, month, day, asrShadow, place.ishaDeg, clock);
      // then the correction list: the few times Diyanet's program rounds the other way (the standard Asr only)
      const c = fix?.correction(place.lat, place.lon, year, month, day);
      const min = (d: Date, k: PrayerKey) =>
        new Date((Math.round(d.getTime() / 60_000) + (k === 'asr' && asrShadow !== 1 ? 0 : (c?.[k] ?? 0))) * 60_000);
      return { fajr: min(t.fajr, 'fajr'), sunrise: min(t.sunrise, 'sunrise'), dhuhr: min(t.dhuhr, 'dhuhr'), asr: min(t.asr, 'asr'), maghrib: min(t.maghrib, 'maghrib'), isha: min(t.isha, 'isha') };
    }
    case 'morocco':
    case 'algeria':
    case 'indonesia': {
      const t =
        place.authority === 'morocco'
          ? moroccoTimes(place.lat, place.lon, year, month, day, place.dipDeg ?? 0, asrShadow, place.dipMaghribDeg)
          : place.authority === 'algeria'
            ? algeriaTimes(place.lat, place.lon, year, month, day, asrShadow)
            : kemenagTimes(place.lat, place.lon, year, month, day, { highland: place.highland, twilightDip: place.twilightDip, asrShadow, afternoon: place.afternoon });
      // the correction list: the authority's few times on the other side of a minute (the standard Asr only)
      const c = !t || !fix ? undefined : fix.correction(place.lat, place.lon, year, month, day);
      if (!t || !c) return t;
      const mv = (d: Date, k: PrayerKey) => new Date(d.getTime() + (k === 'asr' && asrShadow !== 1 ? 0 : (c[k] ?? 0)) * 60_000);
      return { fajr: mv(t.fajr, 'fajr'), sunrise: mv(t.sunrise, 'sunrise'), dhuhr: mv(t.dhuhr, 'dhuhr'), asr: mv(t.asr, 'asr'), maghrib: mv(t.maghrib, 'maghrib'), isha: mv(t.isha, 'isha') };
    }
  }
}

/** Türkiye's districts: each prayer at its own point for the year (the nearest year's beyond the tables). */
function perPrayer(place: Place, pts: Record<string, [number, number][]>, year: number, month: number, day: number, asrShadow: 1 | 2): Instants {
  const years = Object.keys(pts).map(Number).sort((a, b) => a - b);
  const y = years.reduce((b, v) => (Math.abs(v - year) < Math.abs(b - year) ? v : b), years[0]);
  const p = pts[String(y)];
  const clock = placeClockAt(place, year, month, day);
  const at = (i: number) => congressTimes(p[i][0], p[i][1], year, month, day, asrShadow, place.ishaDeg, clock);
  return { fajr: at(0).fajr, sunrise: at(1).sunrise, dhuhr: at(2).dhuhr, asr: at(3).asr, maghrib: at(4).maghrib, isha: at(5).isha };
}
