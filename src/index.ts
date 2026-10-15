/**
 * The authorities' own methods, as their published tables are computed —
 * Sweden (Diyanet's Congress method, as in Islamiska Förbundet's
 * timetables), Diyanet worldwide (the same method, Isha by country), Morocco
 * (Habous), Algeria (the Ministry of Religious Affairs) and Indonesia
 * (Kemenag) — one call for a place and a date.
 *
 * A method may be used only once it reproduces every time of its
 * authority's tables on the printed minute (certification.json, written by
 * `npm run certify`). Until then `timesFor` refuses it; `candidateTimes`
 * is the method as it stands, for research and for the check itself.
 */
import { congressTimes } from './methods/sweden';
import { moroccoTimes } from './methods/morocco';
import { algeriaTimes } from './methods/algeria';
import { kemenagTimes } from './methods/indonesia';
import { certificationOf, isCertified } from './certification';
import { algeriaCorrection, diyanetCorrection, indonesiaCorrection, moroccoCorrection, swedenCorrection } from './methods/swedenCorrections';
import type { Place } from './places';

export { placesOf, AUTHORITIES, type Authority, type Place } from './places';
export { preciseApparentSun } from './sun/preciseSun';
export { certificationOf, isCertified, type Certification, type CheckRecord } from './certification';
export { swedenCorrectionsCoverage, diyanetCorrectionsCoverage, moroccoCorrectionsCoverage, algeriaCorrectionsCoverage, indonesiaCorrectionsCoverage } from './methods/swedenCorrections';

export type Instants = { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date };

/** The method has not reproduced its authority's tables to the minute (or not for this date), so it may not be used. */
export class UncertifiedMethodError extends Error {
  constructor(readonly authority: string, readonly date?: string) {
    super(
      date
        ? `The ${authority} method is certified only for the dates it was checked over, and ${date} is outside them (see certification.json).`
        : `The ${authority} method is not certified: it does not yet reproduce every time of the authority's tables on the printed minute (see certification.json).`,
    );
    this.name = 'UncertifiedMethodError';
  }
}

/**
 * The place's times on a civil date (month 0-based), as instants on the
 * minute the authority prints. Null where a time does not form there.
 * `asrShadow` 2 gives the Hanafi Asr (the tables print the standard one).
 * Throws UncertifiedMethodError unless the authority's method is certified.
 */
export function timesFor(place: Place, year: number, month: number, day: number, asrShadow: 1 | 2 = 1): Instants | null {
  if (!isCertified(place.authority)) throw new UncertifiedMethodError(place.authority);
  // certified over the dates it was checked on, not beyond
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const checks = certificationOf(place.authority)!.checks;
  const from = checks.map(c => c.from).sort()[0];
  const to = checks.map(c => c.to).sort().at(-1)!;
  if (date < from || date > to) throw new UncertifiedMethodError(place.authority, date);
  return candidateTimes(place, year, month, day, asrShadow);
}

/**
 * The method as it stands, certified or not. Not for showing anyone their
 * prayer times: for research, and for checking the method against the tables.
 */
export function candidateTimes(
  place: Place,
  year: number,
  month: number,
  day: number,
  asrShadow: 1 | 2 = 1,
  opts: { corrections?: boolean } = {},
): Instants | null {
  switch (place.authority) {
    case 'sweden':
    case 'diyanet': {
      // The Congress method's own rounding is inside it; its instants land on the minute (rounded, as the app does).
      const clock = placeClockAt(place, year, month, day);
      const t = place.prayerPoints ? perPrayer(place, place.prayerPoints, year, month, day, asrShadow) : congressTimes(place.lat, place.lon, year, month, day, asrShadow, place.ishaDeg, clock);
      // then the correction list: the few times Diyanet's program rounds the other way (the standard Asr only)
      const fix = place.authority === 'sweden' ? swedenCorrection : diyanetCorrection;
      const c = opts.corrections === false ? undefined : fix(place.lat, place.lon, year, month, day);
      const min = (d: Date, k: keyof Instants) =>
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
      const fix = place.authority === 'morocco' ? moroccoCorrection : place.authority === 'algeria' ? algeriaCorrection : indonesiaCorrection;
      const c = !t || opts.corrections === false ? undefined : fix(place.lat, place.lon, year, month, day);
      if (!t || !c) return t;
      const mv = (d: Date, k: keyof Instants) => new Date(d.getTime() + (k === 'asr' && asrShadow !== 1 ? 0 : (c[k] ?? 0)) * 60_000);
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

const offsetFormats = new Map<string, Intl.DateTimeFormat>();
/** Minutes east of UTC that a zone keeps at noon UTC of a date — the clock a table prints the day in. */
function clockOffsetAt(tz: string, year: number, month: number, day: number): number {
  let f = offsetFormats.get(tz);
  if (!f) offsetFormats.set(tz, (f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })));
  const z = f.formatToParts(new Date(Date.UTC(year, month, day, 12))).find(x => x.type === 'timeZoneName')!.value;
  const m = /GMT([+-])(\d\d):?(\d\d)?/.exec(z);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** The clock a place's table prints a date in: its own (`Place.clock`) where it has one, else its zone's. */
export function placeClockAt(place: Place, year: number, month: number, day: number): number {
  if (place.clock) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let off = place.clock[0][1];
    for (const [from, o] of place.clock) if (from <= date) off = o;
    return off;
  }
  return clockOffsetAt(place.tz, year, month, day);
}
