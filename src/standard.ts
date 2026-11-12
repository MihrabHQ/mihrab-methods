/**
 * mihrab-methods/standard — a calculated day for a point no authority here
 * publishes for.
 *
 * Everything else in this library is an authority's own method, held to
 * its published timetable. This is not that: it is the plain astronomical
 * calculation by one of the well-known conventions, for an app that must
 * show something where no method here answers. Its answers say so —
 * `status: 'calculated'`, never 'certified' — and nothing checks them
 * against anybody's table.
 *
 *   import { standardTimes } from 'mihrab-methods/standard';
 *   standardTimes({ lat: 48.86, lon: 2.35, date: '2026-10-15', tz: 'Europe/Paris' });
 *
 * THE ZONE IS THE CALLER'S. The library has no map of the world's time
 * zones, so the IANA zone the times are printed in must be given.
 *
 * The calculation: Meeus's apparent sun, iterated at each time; Fajr and
 * Isha at the convention's angles (Umm al-Qura's Isha is ninety minutes
 * after Maghrib); sunrise and Maghrib with the sun's centre 0.8333° below
 * the horizon; Dhuhr at the transit; Asr at one shadow length beyond the
 * noon shadow, or two; every time rounded to the nearest minute. No
 * margins, no elevation, no high-latitude rule: where a time does not form
 * — a summer night without twilight — the day has no times (`times: null`).
 * Umm al-Qura's Ramadan Isha (two hours after Maghrib) is not applied.
 */
import { clockOffsetAt, printedAt } from './core/clock.js';
import { meeusApparentSun } from './methods/morocco.js';
import type { CivilDate, TableClock } from './core/types.js';

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const HORIZON = 0.8333;

export type StandardConvention = 'mwl' | 'isna' | 'egypt' | 'karachi' | 'ummalqura';

/** The conventions: who they are named after, and their two twilights. */
export const STANDARD_CONVENTIONS: Readonly<Record<StandardConvention, { name: string; fajrAngle: number; ishaAngle?: number; ishaMinutes?: number }>> = {
  mwl: { name: 'Muslim World League', fajrAngle: 18, ishaAngle: 17 },
  isna: { name: 'Islamic Society of North America', fajrAngle: 15, ishaAngle: 15 },
  egypt: { name: 'Egyptian General Authority of Survey', fajrAngle: 19.5, ishaAngle: 17.5 },
  karachi: { name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 },
  ummalqura: { name: 'Umm al-Qura University, Makkah', fajrAngle: 18.5, ishaMinutes: 90 },
};
export const STANDARD_CONVENTION_IDS = Object.keys(STANDARD_CONVENTIONS) as StandardConvention[];

/** The convention commonly used for a country, for the few this is asked about; the Muslim World League's elsewhere. */
const BY_COUNTRY: Readonly<Record<string, StandardConvention>> = {
  SA: 'ummalqura', BH: 'ummalqura', OM: 'ummalqura', YE: 'ummalqura',
  EG: 'egypt', LY: 'egypt', SD: 'egypt', SY: 'egypt', IQ: 'egypt', IL: 'egypt', PS: 'egypt',
  PK: 'karachi', IN: 'karachi', AF: 'karachi', BD: 'karachi',
  US: 'isna', CA: 'isna',
};
export function standardConventionFor(country: string | null | undefined): StandardConvention {
  return (country && BY_COUNTRY[country]) || 'mwl';
}

export type StandardKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type StandardTime = { instant: Date; printed: string };
export type StandardDayTimes = {
  /** Always 'calculated': no authority's timetable stands behind these times. */
  status: 'calculated';
  convention: StandardConvention;
  /** 'YYYY-MM-DD' */
  date: string;
  lat: number;
  lon: number;
  clock: TableClock;
  /** Which Asr `times.asr` is: 1 for one shadow length, 2 for two. */
  asrShadow: 1 | 2;
  /** Null where a time does not form on that date at that latitude. */
  times: Record<StandardKey, StandardTime> | null;
};

export type StandardOptions = {
  lat: number;
  lon: number;
  date: CivilDate;
  /** The IANA zone the times are printed in. Required: the library has no map of zones. */
  tz: string;
  /** Default: the Muslim World League's. */
  convention?: StandardConvention;
  /** Default: 'shafii', one shadow length. */
  asr?: 'shafii' | 'hanafi';
};

function ymd(date: CivilDate): { year: number; month0: number; day: number; iso: string } {
  let y: number, m: number, d: number;
  if (typeof date === 'string') {
    const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!hit) throw new TypeError(`date: 'YYYY-MM-DD' is needed, not ${JSON.stringify(date)}`);
    [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  } else {
    ({ year: y, month: m, day: d } = date);
  }
  const at = new Date(Date.UTC(y, m - 1, d));
  if (!(at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d)) throw new RangeError(`date: no such day ${y}-${m}-${d}`);
  return { year: y, month0: m - 1, day: d, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

/** The calculated day for a point, by a convention, printed in the zone given. */
export function standardTimes(opts: StandardOptions): StandardDayTimes {
  const { lat, lon, tz } = opts;
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) throw new RangeError('lat: -90 to 90');
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) throw new RangeError('lon: -180 to 180');
  if (typeof tz !== 'string' || !tz) throw new TypeError('tz: the IANA time zone the times are printed in is needed (the library has no map of zones)');
  const convention = opts.convention ?? 'mwl';
  const c = STANDARD_CONVENTIONS[convention];
  if (!c) throw new RangeError(`convention: one of ${STANDARD_CONVENTION_IDS.join(', ')}`);
  const shadow: 1 | 2 = opts.asr === 'hanafi' ? 2 : 1;
  const d = ymd(opts.date);
  let offsetMinutes: number;
  try {
    offsetMinutes = clockOffsetAt(tz, d.year, d.month0, d.day);
  } catch {
    throw new RangeError(`tz: ${JSON.stringify(tz)} is not a time zone this runtime knows`);
  }
  const clock: TableClock = { zone: tz, offsetMinutes, label: tz };

  const d0 = (Date.UTC(d.year, d.month0, d.day) - Date.UTC(2000, 0, 1)) / DAY_MS - 0.5;
  const at = (t: number) => meeusApparentSun(d0 + t / 1440);
  let noon = 720 - 4 * lon;
  for (let i = 0; i < 3; i++) noon = 720 - 4 * lon - at(noon).eot;
  const sp = Math.sin(lat * RAD);
  const cp = Math.cos(lat * RAD);
  const event = (altitude: number, sign: 1 | -1, start: number): number => {
    let t = start;
    for (let i = 0; i < 3; i++) {
      const s = at(t);
      const cosH = (Math.sin(altitude * RAD) - sp * Math.sin(s.dec)) / (cp * Math.cos(s.dec));
      if (!(Math.abs(cosH) <= 1)) return NaN;
      t = 720 - 4 * lon - s.eot + (sign * 4 * Math.acos(cosH)) / RAD;
    }
    return t;
  };
  const asrAltitude = Math.atan(1 / (shadow + Math.tan(Math.abs(lat * RAD - at(noon).dec)))) / RAD;
  const maghrib = event(-HORIZON, 1, noon + 360);
  const raw: Record<StandardKey, number> = {
    fajr: event(-c.fajrAngle, -1, noon - 420),
    sunrise: event(-HORIZON, -1, noon - 360),
    dhuhr: noon,
    asr: event(asrAltitude, 1, noon + 200),
    maghrib,
    isha: c.ishaMinutes !== undefined ? Math.floor(maghrib + 0.5) + c.ishaMinutes : event(-(c.ishaAngle as number), 1, noon + 420),
  };
  const base = { status: 'calculated' as const, convention, date: d.iso, lat, lon, clock, asrShadow: shadow };
  if (!Object.values(raw).every(Number.isFinite)) return { ...base, times: null };
  const start = Date.UTC(d.year, d.month0, d.day);
  const times = {} as Record<StandardKey, StandardTime>;
  for (const k of Object.keys(raw) as StandardKey[]) {
    const instant = new Date(start + Math.floor(raw[k] + 0.5) * 60_000);
    times[k] = { instant, printed: printedAt(instant, offsetMinutes) };
  }
  return { ...base, times };
}
