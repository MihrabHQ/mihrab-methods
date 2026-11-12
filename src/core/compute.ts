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
import { takvimTimes } from '../methods/turkiyeTakvimi.js';
import { kazakhstanTimes } from '../methods/kazakhstan.js';
import { egyptTimes } from '../methods/egypt.js';
import { bruneiTimes } from '../methods/brunei.js';
import { qatarTimes } from '../methods/qatar.js';
import { kuwaitTimes } from '../methods/kuwait.js';
import { jordanTimes } from '../methods/jordan.js';
import { tatarstanTimes } from '../methods/tatarstan.js';
import { cdumTimes } from '../methods/cdum.js';
import { albaniaTimes } from '../methods/albania.js';
import { bulgariaTimes } from '../methods/bulgaria.js';
import { banuriTimes } from '../methods/banuri.js';
import { uaeTimes } from '../methods/uae.js';
import { tehranTimes } from '../methods/tehran.js';
import { wifaqTimes } from '../methods/wifaq.js';
import { tunisiaTimes } from '../methods/tunisia.js';
import { authorityData } from './registry.js';
import { placeClockAt } from './clock.js';
import type { AsrChoice, Authority, Instants, Place, PrayerKey } from './types.js';

export type ComputeOptions = {
  corrections?: boolean;
  /** Which Asr: the one the timetable prints (the default), or one by name. Overrides the `asrShadow` argument. */
  asr?: AsrChoice;
};

/** The Asr an authority's timetable prints: 2 (two shadow lengths, the Hanafi one) for these, 1 for the rest. */
/**
 * The times an authority's timetable does not print at all: its method
 * gives them, and no column was ever held to them. Iran's sheets print no
 * Asr and no Isha; Tunisia's Institute gives no sunrise.
 */
export const NOT_PRINTED: Partial<Record<Authority, readonly string[]>> = { tehran: ['asr', 'isha'], tunisia: ['sunrise'] };

const PRINTS_HANAFI: ReadonlySet<Authority> = new Set<Authority>(['tatarstan', 'cdum', 'banuri', 'wifaq']);
/** Methods that have only the Asr their timetable prints. */
const ONE_ASR: ReadonlySet<Authority> = new Set<Authority>(['tatarstan', 'cdum']);

export function printedAsrShadow(authority: Authority): 1 | 2 {
  return PRINTS_HANAFI.has(authority) ? 2 : 1;
}

/**
 * The Asr a request comes to: its shadow length, and whether it is the one
 * the timetable prints (the only one a correction list holds). `asrShadow`
 * is the older way to ask: 1 for the printed Asr, 2 for the Hanafi one.
 * A method with one Asr answers with that, whatever is asked.
 */
export function asrFor(authority: Authority, asrShadow: 1 | 2 = 1, asr?: AsrChoice): { shadow: 1 | 2; printed: boolean } {
  const printed = printedAsrShadow(authority);
  const want = asr ?? (asrShadow === 2 ? 'hanafi' : 'printed');
  const shadow = want === 'printed' || ONE_ASR.has(authority) ? printed : want === 'shafii' ? 1 : 2;
  return { shadow, printed: shadow === printed };
}

/** What the correction list moves on a day at a place: minutes by prayer, or undefined. Asr is the printed one's. */
export function correctionAt(place: Place, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return authorityData(place.authority).corrections.correction(place.lat, place.lon, year, month, day) ?? undefined;
}

/**
 * The method as it stands, certified or not, for a civil date with the
 * month 0-based. Null where the method gives no times for the day. Not for
 * showing anyone their prayer times: `timesFor` is.
 */
export function candidateInstants(place: Place, year: number, month: number, day: number, asrShadow: 1 | 2 = 1, opts: ComputeOptions = {}): Instants | null {
  const fix = opts.corrections === false ? null : authorityData(place.authority).corrections;
  const { shadow, printed: printedAsr } = asrFor(place.authority, asrShadow, opts.asr);
  switch (place.authority) {
    case 'sweden':
    case 'diyanet': {
      // The Congress method's own rounding is inside it; its instants land on the minute (rounded, as the app does).
      const clock = placeClockAt(place, year, month, day);
      const t = place.prayerPoints ? perPrayer(place, place.prayerPoints, year, month, day, shadow) : congressTimes(place.lat, place.lon, year, month, day, shadow, place.ishaDeg, clock);
      // then the correction list: the few times Diyanet's program rounds the other way (the standard Asr only)
      const c = fix?.correction(place.lat, place.lon, year, month, day);
      const min = (d: Date, k: PrayerKey) =>
        new Date((Math.round(d.getTime() / 60_000) + (k === 'asr' && !printedAsr ? 0 : (c?.[k] ?? 0))) * 60_000);
      return { fajr: min(t.fajr, 'fajr'), sunrise: min(t.sunrise, 'sunrise'), dhuhr: min(t.dhuhr, 'dhuhr'), asr: min(t.asr, 'asr'), maghrib: min(t.maghrib, 'maghrib'), isha: min(t.isha, 'isha') };
    }
    case 'morocco':
    case 'algeria':
    case 'indonesia':
    case 'turkiyetakvimi':
    case 'kazakhstan':
    case 'egypt':
    case 'brunei':
    case 'qatar':
    case 'kuwait':
    case 'jordan':
    case 'tatarstan':
    case 'cdum':
    case 'albania':
    case 'bulgaria':
    case 'banuri':
    case 'uae':
    case 'tehran':
    case 'wifaq':
    case 'tunisia': {
      const t =
        place.authority === 'tunisia'
          ? tunisiaTimes(place.lat, place.lon, year, month, day, shadow, place.dipDeg, place.dipMaghribDeg)
          : place.authority === 'morocco'
          ? moroccoTimes(place.lat, place.lon, year, month, day, place.dipDeg, shadow, place.dipMaghribDeg)
          : place.authority === 'algeria'
            ? algeriaTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'kazakhstan'
              ? kazakhstanTimes(place.lat, place.lon, year, month, day)
            : place.authority === 'egypt'
              ? egyptTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'brunei'
              ? bruneiTimes(place.lon, year, month, day, shadow)
            : place.authority === 'qatar'
              ? qatarTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'kuwait'
              ? kuwaitTimes(place.lon, year, month, day, shadow)
            : place.authority === 'jordan'
              ? jordanTimes(place.lat, place.lon, year, month, day, place.dipDeg, shadow, place.dipMaghribDeg, place.fajrMinutes)
            : place.authority === 'tatarstan'
              ? tatarstanTimes(place.lat, place.lon, year, month, day, place.dipDeg)
            : place.authority === 'cdum'
              ? cdumTimes(place.lat, place.lon, year, month, day)
            : place.authority === 'albania'
              ? albaniaTimes(place.lon, year, month, day, shadow)
            : place.authority === 'bulgaria'
              ? bulgariaTimes(place.lon, year, month, day, shadow)
            : place.authority === 'banuri'
              ? banuriTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'wifaq'
              ? wifaqTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'tehran'
              ? tehranTimes(place.lat, place.lon, year, month, day, shadow)
            : place.authority === 'uae'
              ? uaeTimes(place.lat, place.lon, year, month, day, place.dipDeg, shadow, place.dipMaghribDeg, place.fajrMinutes)
            : place.authority === 'turkiyetakvimi'
              ? takvimTimes(place.lat, place.lon, year, month, day, place.temkin, shadow)
              : kemenagTimes(place.lat, place.lon, year, month, day, { highland: place.highland, twilightDip: place.twilightDip, asrShadow: shadow, afternoon: place.afternoon });
      // the correction list: the authority's few times on the other side of a minute (the standard Asr only)
      const c = !t || !fix ? undefined : fix.correction(place.lat, place.lon, year, month, day);
      if (!t || !c) return t;
      const mv = (d: Date, k: PrayerKey) => new Date(d.getTime() + (k === 'asr' && !printedAsr ? 0 : (c[k] ?? 0)) * 60_000);
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
