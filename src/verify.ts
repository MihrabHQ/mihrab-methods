/**
 * Each method against the authority's timetables, day by day, to the minute.
 *
 *   npm run verify                 # all four
 *   npm run verify -- morocco      # some
 *   npm run verify -- diyanet      # Sweden against Diyanet's own timetables
 *
 * The reference timetables are not part of this repository: MIHRAB_TABLES
 * names their folder (default .tables), laid out <authority>/v1/cities/<key>.json,
 * with Diyanet's under diyanet/ (or DIYANET_TABLES). Without them the check skips.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES, placesOf, candidateTimes, type Authority, type Place } from './index';

const ROOT = path.join(__dirname, '..');
export const TABLES = process.env.MIHRAB_TABLES ?? path.join(ROOT, '.tables');
export const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export type Result = {
  name: string;
  places: number;
  days: number;
  times: number;
  exact: number;
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

export function clockIn(tz: string, d: Date): number {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const get = (t: string) => Number(p.find(x => x.type === t)!.value);
  return get('hour') * 60 + get('minute');
}
export const minutes = (s: string | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec((s ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

export function check(name: string, places: Place[], dir: string, opts: CheckOptions = {}): Result | null {
  if (!fs.existsSync(dir)) return null;
  const r: Result = { name, places: 0, days: 0, times: 0, exact: 0, within1: 0, worst: 0, misses: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, worstPlaces: [], sourceFaults: 0, copiedRows: 0, misplaced: [], from: '', to: '' };
  const perPlace = new Map<string, number>();
  for (const place of places) {
    // Per place first: a table that is mostly off is another town's, printed for this one — the
    // source's fault, reported apart, not counted. Every day is checked, the days the clock changes too.
    const pr: Result = { ...r, times: 0, exact: 0, within1: 0, worst: 0, days: 0, misses: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, sourceFaults: 0, copiedRows: 0, from: '', to: '' };
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
      const t = candidateTimes(place, y, m - 1, d);
      if (!t) continue;
      pr.days++;
      if (!pr.from || date < pr.from) pr.from = date;
      if (!pr.to || date > pr.to) pr.to = date;
      KEYS.forEach((k, i) => {
        const theirs = minutes(row[i + 1]);
        if (!Number.isFinite(theirs)) return;
        let diff = Math.abs(clockIn(place.tz, t[k]) - theirs);
        if (diff > 720) diff = 1440 - diff;
        pr.times++;
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
    r.days += pr.days; r.times += pr.times; r.exact += pr.exact; r.within1 += pr.within1;
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
      const t = candidateTimes(place, yy, m - 1, d, 1, { corrections: false });
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

export function checkAuthority(a: Authority | 'diyanet'): Result | null {
  if (a === 'sweden') {
    return check('Sweden — Islamiska Förbundet’s tables', placesOf('sweden'), path.join(TABLES, 'sweden/v1/cities'), {
      original: p => diyanetDaysFor(p.key),
      copiedYears: true,
    });
  }
  if (a === 'diyanet') {
    const root = DIYANET_ROOT;
    const pts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places/diyanet-sweden-points.json'), 'utf8')) as Record<string, { name: string; lat: number; lon: number }>;
    const places: Place[] = Object.entries(pts).map(([iid, v]) => ({ authority: 'sweden', key: iid, name: v.name, lat: v.lat, lon: v.lon, tz: 'Europe/Stockholm' }));
    return check('Sweden — Diyanet’s own tables', places, path.join(root, 'v1/cities'));
  }
  const names: Record<Authority, string> = {
    sweden: 'Sweden — Islamiska Förbundet’s tables',
    morocco: 'Morocco — Habous',
    algeria: 'Algeria — Ministry of Religious Affairs',
    indonesia: 'Indonesia — Kemenag',
  };
  return check(names[a], placesOf(a), path.join(TABLES, a, 'v1/cities'));
}

if (require.main === module) {
  const asked = process.argv.slice(2);
  const list = (asked.length ? asked : [...AUTHORITIES, 'diyanet']) as (Authority | 'diyanet')[];
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
