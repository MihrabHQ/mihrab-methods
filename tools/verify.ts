/**
 * Each method against the authority's timetables, day by day, to the minute.
 *
 *   npm run verify                 # all
 *   npm run verify -- morocco      # some
 *   npm run verify -- --alone      # the methods without their correction lists
 *   npm run verify -- sweden-diyanet  # Sweden against Diyanet's own Swedish timetables
 *   npm run verify -- diyanet         # Diyanet worldwide
 *
 * The reference timetables are not part of this repository: MIHRAB_TABLES
 * names their folder (default .tables), laid out <authority>/v1/cities/<key>.json,
 * with Diyanet's under diyanet/ (or DIYANET_TABLES). Without them the check skips.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES, placesOf, candidateInstants, type Authority, type Instants, type Place } from '../src/index.js';
import { authorityData } from '../src/core/registry.js';

const ROOT = path.join(__dirname, '..');
export const TABLES = process.env.MIHRAB_TABLES ?? path.join(ROOT, '.tables');
export const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
/** `--alone`: each method without its correction list — what the formula gives by itself. */
const ALONE = process.argv.includes('--alone');

export type Result = {
  name: string;
  places: number;
  days: number;
  times: number;
  exact: number;
  /** Times on the printed minute by the method alone, without its correction list — of the same times. */
  exactAlone: number;
  within1: number;
  worst: number;
  misses: Record<(typeof KEYS)[number], number>;
  worstPlaces: [string, number][];
  /** Rows set aside: the timetable differs from the authority's own figures for the day. */
  sourceFaults: number;
  /** Rows that are the previous year's figures served for the date, compared as that year. */
  copiedRows: number;
  /** Places whose table is mostly off — another town's table — reported, not counted. */
  misplaced: string[];
  /** First and last date compared. */
  from: string;
  to: string;
};

export type CheckOptions = {
  /** The authority's own rows for the place, when the timetable is another body's edition of them. */
  original?: (place: Place) => Record<string, string[]> | null;
  /** The timetable carries last year's figures before the new year is out (Islamiska Förbundet). */
  copiedYears?: boolean;
};

const fmtDate = new Map<string, Intl.DateTimeFormat>();
const fmtOffset = new Map<string, Intl.DateTimeFormat>();
/** Minutes east of UTC that the zone keeps at an instant. */
function offsetAt(tz: string, ms: number): number {
  let f = fmtOffset.get(tz);
  if (!f) fmtOffset.set(tz, (f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })));
  const z = f.formatToParts(new Date(ms)).find(x => x.type === 'timeZoneName')!.value;
  const m = /GMT([+-])(\d\d):?(\d\d)?/.exec(z);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}
/**
 * The instant on the timetable's clock, minutes past midnight. A table prints
 * the whole day in that day's clock — the one kept at noon — so on the day the
 * clocks go forward a Fajr before the change is printed in the new time.
 */
export function clockIn(tz: string, d: Date): number {
  let f = fmtDate.get(tz);
  if (!f) fmtDate.set(tz, (f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })));
  const [y, m, day] = f.format(d).split('-').map(Number);
  const noonGuess = Date.UTC(y, m - 1, day, 12) - offsetAt(tz, d.getTime()) * 60_000;
  const local = d.getTime() / 60_000 + offsetAt(tz, noonGuess);
  return ((Math.floor(local) % 1440) + 1440) % 1440;
}
/**
 * The instant on the place's table's clock: its own clock where it keeps one
 * no zone does (`Place.clock`, read off the table), else its zone's.
 */
export function tableClock(place: Place, date: string, d: Date): number {
  if (!place.clock) return clockIn(place.tz, d);
  let off = place.clock[0][1];
  for (const [from, o] of place.clock) if (from <= date) off = o;
  const local = d.getTime() / 60_000 + off;
  return ((Math.floor(local) % 1440) + 1440) % 1440;
}
export const minutes = (s: string | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec((s ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

/**
 * The correction list applied to the method's instants (the standard Asr),
 * exactly as `candidateInstants` applies it: a minute either way on the
 * listed times.
 */
export function withCorrections(place: Place, alone: Instants, year: number, month0: number, day: number): Instants {
  const c = authorityData(place.authority).corrections.correction(place.lat, place.lon, year, month0, day);
  if (!c) return alone;
  const out = { ...alone };
  for (const k of KEYS) if (c[k]) out[k] = new Date(alone[k].getTime() + c[k]! * 60_000);
  return out;
}

export function check(name: string, places: readonly Place[], dir: string, opts: CheckOptions = {}): Result | null {
  if (!fs.existsSync(dir)) return null;
  const r: Result = { name, places: 0, days: 0, times: 0, exact: 0, exactAlone: 0, within1: 0, worst: 0, misses: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, worstPlaces: [], sourceFaults: 0, copiedRows: 0, misplaced: [], from: '', to: '' };
  const perPlace = new Map<string, number>();
  for (const place of places) {
    // Per place first: a table that is mostly off is another town's, printed for this one — the
    // source's fault, reported apart, not counted. Every day is checked, the days the clock changes too.
    const pr: Result = { ...r, times: 0, exact: 0, exactAlone: 0, within1: 0, worst: 0, days: 0, misses: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, sourceFaults: 0, copiedRows: 0, from: '', to: '' };
    const f = path.join(dir, `${place.key}.json`);
    if (!fs.existsSync(f)) continue;
    const days = (JSON.parse(fs.readFileSync(f, 'utf8')) as { days: Record<string, string[]> }).days;
    const original = opts.original?.(place) ?? null;
    const copied = opts.copiedYears ? copiedYearsOf(place, days, original) : new Set<number>();
    for (const [date, row] of Object.entries(days)) {
      let [y, m, d] = date.split('-').map(Number);
      const confirmed = !!original?.[date];
      if (confirmed && original![date].slice(1, 7).some((t, i) => t !== row[i + 1])) {
        pr.sourceFaults++;
        continue;
      }
      if (!confirmed && copied.has(y)) {
        pr.copiedRows++;
        y -= 1;
      }
      // The method alone, then its correction list on top — as `candidateInstants` applies it
      // (`withCorrections`; test/verify.test.ts holds the two equal) — so both counts come from one pass.
      const alone = candidateInstants(place, y, m - 1, d, 1, { corrections: false });
      if (!alone) continue;
      const t = ALONE ? alone : withCorrections(place, alone, y, m - 1, d);
      pr.days++;
      if (!pr.from || date < pr.from) pr.from = date;
      if (!pr.to || date > pr.to) pr.to = date;
      KEYS.forEach((k, i) => {
        const theirs = minutes(row[i + 1]);
        if (!Number.isFinite(theirs)) return;
        let diff = Math.abs(tableClock(place, date, t[k]) - theirs);
        if (diff > 720) diff = 1440 - diff;
        pr.times++;
        if (tableClock(place, date, alone[k]) === theirs) pr.exactAlone++;
        if (diff === 0) pr.exact++;
        else pr.misses[k]++;
        if (diff <= 1) pr.within1++;
        pr.worst = Math.max(pr.worst, diff);
      });
    }
    if (!pr.times) continue;
    if (pr.times - pr.exact > pr.times / 2) {
      r.misplaced.push(`${place.name} (${pr.times - pr.exact} of ${pr.times} off)`);
      continue;
    }
    r.places++;
    r.days += pr.days; r.times += pr.times; r.exact += pr.exact; r.exactAlone += pr.exactAlone; r.within1 += pr.within1;
    r.worst = Math.max(r.worst, pr.worst); r.sourceFaults += pr.sourceFaults; r.copiedRows += pr.copiedRows;
    for (const k of KEYS) r.misses[k] += pr.misses[k];
    if (pr.from && (!r.from || pr.from < r.from)) r.from = pr.from;
    if (pr.to && (!r.to || pr.to > r.to)) r.to = pr.to;
    if (pr.times > pr.exact) perPlace.set(place.name, pr.times - pr.exact);
  }
  r.worstPlaces = [...perPlace.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return r;
}

/**
 * The years of a table that are the previous year's figures served under
 * this year's dates (Islamiska Förbundet, before it publishes the new year).
 * Decided for the whole year at once: the year is copied when its rows are
 * on last year's minute more often than on this year's. The Congress
 * method's carried share moves from year to year (ten minutes at Umeå's
 * Isha between 2026 and 2027), so the two are told apart. Rows confirmed by
 * the authority's own are the year they claim and are left out.
 */
export function copiedYearsOf(place: Place, days: Record<string, string[]>, original: Record<string, string[]> | null): Set<number> {
  const score = new Map<number, [number, number]>();
  for (const [date, row] of Object.entries(days)) {
    if (original?.[date]) continue;
    const [y, m, d] = date.split('-').map(Number);
    const on = (yy: number) => {
      const t = candidateInstants(place, yy, m - 1, d, 1, { corrections: false });
      return t ? KEYS.filter((k, i) => clockIn(place.tz, t[k]) === minutes(row[i + 1])).length : 0;
    };
    const s = score.get(y) ?? [0, 0];
    s[0] += on(y);
    s[1] += on(y - 1);
    score.set(y, s);
  }
  return new Set([...score].filter(([, [thisYear, lastYear]]) => lastYear > thisYear).map(([y]) => y));
}

export const DIYANET_ROOT = process.env.DIYANET_TABLES ?? path.join(TABLES, 'diyanet');

/** Diyanet's own rows for an Islamiska Förbundet city, by its key, when present. */
function diyanetDaysFor(slug: string): Record<string, string[]> | null {
  const pts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places/diyanet-sweden-points.json'), 'utf8')) as Record<string, { slug: string | null }>;
  const iid = Object.entries(pts).find(([, v]) => v.slug === slug)?.[0];
  const f = iid && path.join(DIYANET_ROOT, 'v1/cities', `${iid}.json`);
  return f && fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, 'utf8')) as { days: Record<string, string[]> }).days ?? null) : null;
}

/** A check run: an authority's own tables, or (sweden-diyanet) Sweden against Diyanet's Swedish tables. */
export type CheckRun = Authority | 'sweden-diyanet';

export function checkAuthority(a: CheckRun): Result | null {
  if (a === 'sweden') {
    return check('Sweden — Islamiska Förbundet’s tables', placesOf('sweden'), path.join(TABLES, 'sweden/v1/cities'), {
      original: p => diyanetDaysFor(p.key),
      copiedYears: true,
    });
  }
  if (a === 'diyanet') {
    return check('Diyanet — its tables worldwide', placesOf('diyanet'), path.join(DIYANET_ROOT, 'v1/cities'));
  }
  if (a === 'sweden-diyanet') {
    const root = DIYANET_ROOT;
    const pts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places/diyanet-sweden-points.json'), 'utf8')) as Record<string, { name: string; lat: number; lon: number }>;
    const places: Place[] = Object.entries(pts).map(([iid, v]) => ({ authority: 'sweden', id: `sweden:${iid}`, key: iid, name: v.name, country: 'SE', lat: v.lat, lon: v.lon, tz: 'Europe/Stockholm' }));
    return check('Sweden — Diyanet’s own tables', places, path.join(root, 'v1/cities'));
  }
  const names: Record<Authority, string> = {
    sweden: 'Sweden — Islamiska Förbundet’s tables',
    diyanet: 'Diyanet — its tables worldwide',
    morocco: 'Morocco — Habous',
    algeria: 'Algeria — Ministry of Religious Affairs',
    indonesia: 'Indonesia — Kemenag',
  };
  return check(names[a], placesOf(a), path.join(TABLES, a, 'v1/cities'));
}

if (require.main === module) {
  const asked = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const list = (asked.length ? asked : [...AUTHORITIES, 'sweden-diyanet']) as CheckRun[];
  for (const a of list) {
    const r = checkAuthority(a);
    if (!r) {
      console.log(`${a}: no tables here — skipped`);
      continue;
    }
    const pct = (n: number) => ((100 * n) / r.times).toFixed(3);
    console.log(`\n${r.name}: ${r.places} places, ${r.days} days`);
    console.log(`  exact ${pct(r.exact)} %  (${r.times - r.exact} of ${r.times} off) · within a minute ${pct(r.within1)} % · worst ${r.worst} min`);
    console.log(`  off by prayer: ${KEYS.map(k => `${k} ${r.misses[k]}`).join(', ')}`);
    if (r.misplaced.length) console.log(`  not counted, another town's table: ${r.misplaced.join(', ')}`);
    if (r.sourceFaults || r.copiedRows) console.log(`  set aside: ${r.sourceFaults} rows that differ from the authority's own; ${r.copiedRows} rows of last year's figures compared as last year`);
    if (r.worstPlaces.length) console.log(`  most off: ${r.worstPlaces.map(([n, c]) => `${n} ${c}`).join(', ')}`);
  }
}
