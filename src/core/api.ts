/**
 * The library's calls. Each works for whichever authorities are loaded —
 * `mihrab-methods` loads all five, `mihrab-methods/<authority>` one.
 */
import { candidateInstants, type ComputeOptions } from './compute.js';
import { parseCivilDate, nextDay, type Ymd } from './civilDate.js';
import { printedAt, tableClockAt } from './clock.js';
import { authorityData, isLoaded, loadedAuthorities } from './registry.js';
import {
  PRAYER_KEYS,
  UncertifiedMethodError,
  type Authority,
  type Certification,
  type CivilDate,
  type DayTimes,
  type Instants,
  type MethodInfo,
  type Place,
  type PrayerTime,
  type PrayerKey,
  type TimesOptions,
} from './types.js';

/**
 * Certified: every check of the authority's tables has every time on the
 * printed minute (and checked something). The flag alone is not trusted.
 */
export function isCertified(authority: Authority): boolean {
  const c = certificationOf(authority);
  return !!c && c.certified && c.checks.length > 0 && c.checks.every(k => k.times > 0 && k.off === 0);
}

/** The authority's record from certification.json, or null. */
export function certificationOf(authority: Authority): Certification | null {
  return authorityData(authority).certification;
}

/** The span of dates the method was checked over (and so is certified for), or null. */
export function certifiedSpan(authority: Authority): { from: string; to: string } | null {
  if (!isCertified(authority)) return null;
  const checks = certificationOf(authority)!.checks;
  return { from: checks.map(c => c.from).sort()[0], to: checks.map(c => c.to).sort().at(-1)! };
}

/** The authority's places, each at the point its method is computed at. */
export function placesOf(authority: Authority): Place[] {
  return authorityData(authority).places;
}

/** The authorities this build has loaded. */
export function loadedAuthorityIds(): Authority[] {
  return loadedAuthorities();
}

/** A place by its stable id (`<authority>:<key>`), among the loaded authorities. */
export function placeById(id: string): Place | null {
  const i = id.indexOf(':');
  if (i < 0) return null;
  const authority = id.slice(0, i) as Authority;
  if (!isLoaded(authority)) return null;
  return byId(authority).get(id) ?? null;
}

const idIndexes = new Map<Authority, Map<string, Place>>();
function byId(authority: Authority): Map<string, Place> {
  let m = idIndexes.get(authority);
  if (!m) idIndexes.set(authority, (m = new Map(placesOf(authority).map(p => [p.id, p]))));
  return m;
}

const RAD = Math.PI / 180;
/** Great-circle distance, km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type NearestPlace = { place: Place; distanceKm: number };

/**
 * The authority's place nearest a point — how an app finds the table for a
 * location. `maxKm` (default: no limit) returns null beyond that distance.
 * Türkiye's districts and Diyanet's worldwide places are both 'diyanet'.
 */
export function nearestPlace(authority: Authority, lat: number, lon: number, opts: { maxKm?: number } = {}): NearestPlace | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best: NearestPlace | null = null;
  for (const place of placesOf(authority)) {
    const d = distanceKm(lat, lon, place.lat, place.lon);
    if (!best || d < best.distanceKm) best = { place, distanceKm: d };
  }
  if (best && opts.maxKm !== undefined && best.distanceKm > opts.maxKm) return null;
  return best;
}

function dayTimes(place: Place, d: Ymd, instants: Instants | null, status: DayTimes['status']): DayTimes {
  const data = authorityData(place.authority);
  const span = certifiedSpan(place.authority);
  const clock = tableClockAt(place, d.year, d.month0, d.day);
  let times: Record<PrayerKey, PrayerTime> | null = null;
  if (instants) {
    times = {} as Record<PrayerKey, PrayerTime>;
    for (const k of PRAYER_KEYS) times[k] = { instant: instants[k], printed: printedAt(instants[k], clock.offsetMinutes) };
  }
  return {
    authority: place.authority,
    placeId: place.id,
    date: d.iso,
    status,
    certifiedFrom: span?.from ?? null,
    certifiedUntil: span?.to ?? null,
    revision: data.revision,
    clock,
    times,
  };
}

function statusFor(authority: Authority, iso: string): DayTimes['status'] {
  const span = certifiedSpan(authority);
  if (!span) return 'uncertified';
  return iso < span.from || iso > span.to ? 'method-only' : 'certified';
}

/**
 * The place's prayer times on a civil date, as the authority prints them:
 * each prayer's exact moment and its wall-clock minute on the table's clock.
 *
 * Inside the dates the method was certified over, `status` is 'certified':
 * the authority's own printed minute. Outside them it is 'method-only': the
 * method alone, which is on the printed minute all but rarely and never a
 * minute further — the honest answer for a date the authority has not
 * published yet. `{ strict: true }` throws `UncertifiedMethodError` there
 * instead. A method not certified at all throws either way: it is not for
 * showing anyone their prayer times (`candidateTimes` runs it regardless).
 */
export function timesFor(place: Place, date: CivilDate, opts: TimesOptions = {}): DayTimes {
  if (!isCertified(place.authority)) throw new UncertifiedMethodError(place.authority);
  const d = parseCivilDate(date);
  const status = statusFor(place.authority, d.iso);
  if (status === 'method-only' && opts.strict) throw new UncertifiedMethodError(place.authority, d.iso);
  return dayTimes(place, d, candidateInstants(place, d.year, d.month0, d.day, opts.asrShadow ?? 1), status);
}

/** `timesFor` for every date from `from` to `to`, both inclusive — a month's timetable, a year's. */
export function timesForRange(place: Place, from: CivilDate, to: CivilDate, opts: TimesOptions = {}): DayTimes[] {
  const a = parseCivilDate(from);
  const b = parseCivilDate(to);
  if (a.iso > b.iso) throw new RangeError(`The range runs backwards: ${a.iso} to ${b.iso}.`);
  const out: DayTimes[] = [];
  for (let d = a; d.iso <= b.iso; d = nextDay(d)) out.push(timesFor(place, d.iso, opts));
  return out;
}

/**
 * The method as it stands, certified or not, with or without its correction
 * list (`corrections: false`): for research and for checking the method
 * against the tables. `status` says what it would be served as.
 */
export function candidateTimes(place: Place, date: CivilDate, opts: TimesOptions & ComputeOptions = {}): DayTimes {
  const d = parseCivilDate(date);
  return dayTimes(place, d, candidateInstants(place, d.year, d.month0, d.day, opts.asrShadow ?? 1, { corrections: opts.corrections }), statusFor(place.authority, d.iso));
}

/** What the method is: its parameters, revision, certification, correction list and sources. */
export function methodInfo(authority: Authority): MethodInfo {
  const data = authorityData(authority);
  const cov = data.corrections.coverage();
  return {
    authority,
    ...data.description,
    revision: data.revision,
    certified: isCertified(authority),
    certification: data.certification,
    corrections: { from: cov.from, to: cov.to, entries: data.corrections.entries() },
    places: data.places.length,
  };
}
