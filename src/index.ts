/**
 * The authorities' own methods, as their published tables are computed —
 * Sweden (Diyanet's Congress method, as in Islamiska Förbundet's
 * timetables), Morocco (Habous), Algeria (the Ministry of Religious
 * Affairs) and Indonesia (Kemenag) — one call for a place and a date.
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
import { swedenCorrection } from './methods/swedenCorrections';
import type { Place } from './places';

export { placesOf, AUTHORITIES, type Authority, type Place } from './places';
export { preciseApparentSun } from './sun/preciseSun';
export { certificationOf, isCertified, type Certification, type CheckRecord } from './certification';
export { swedenCorrectionsCoverage } from './methods/swedenCorrections';

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
    case 'sweden': {
      // The Congress method's own rounding is inside it; its instants land on the minute (rounded, as the app does).
      const t = congressTimes(place.lat, place.lon, year, month, day, asrShadow);
      // then the correction list: the few times Diyanet's program rounds the other way (the standard Asr only)
      const c = opts.corrections === false ? undefined : swedenCorrection(place.lat, place.lon, year, month, day);
      const min = (d: Date, k: keyof Instants) =>
        new Date((Math.round(d.getTime() / 60_000) + (k === 'asr' && asrShadow !== 1 ? 0 : (c?.[k] ?? 0))) * 60_000);
      return { fajr: min(t.fajr, 'fajr'), sunrise: min(t.sunrise, 'sunrise'), dhuhr: min(t.dhuhr, 'dhuhr'), asr: min(t.asr, 'asr'), maghrib: min(t.maghrib, 'maghrib'), isha: min(t.isha, 'isha') };
    }
    case 'morocco':
      return moroccoTimes(place.lat, place.lon, year, month, day, place.dipDeg ?? 0, asrShadow);
    case 'algeria':
      return algeriaTimes(place.lat, place.lon, year, month, day, asrShadow);
    case 'indonesia':
      return kemenagTimes(place.lat, place.lon, year, month, day, { highland: place.highland, twilightDip: place.twilightDip, asrShadow });
  }
}
