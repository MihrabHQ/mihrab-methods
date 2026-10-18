/**
 * Writes Sweden's correction list (data/corrections/sweden.json): every time
 * the Congress method, as it stands, puts a minute off Diyanet's printed one —
 * at Diyanet's own points from Diyanet's own tables, and at Islamiska
 * Förbundet's two towns Diyanet does not list (Munkedal, Torsby) from
 * Islamiska Förbundet's (a year it serves copied is compared as the year it
 * was copied from). Then `npm run certify`.
 *
 *   npm run corrections
 *
 *
 * `npm run corrections -- morocco` writes Morocco's (data/corrections/morocco.json)
 * from the ministry's tables; `-- algeria` and `-- indonesia` likewise. `npm run corrections -- diyanet` writes Diyanet's worldwide list
 * (data/corrections/diyanet.json) the same way, at its points beyond Sweden.
 *
 * Needs the reference timetables (MIHRAB_TABLES); refuses to write without them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { candidateInstants, placesOf, pointKey, type CorrectionsFile, type Place } from '../src/index.js';
import { clockIn, copiedYearsOf, DIYANET_ROOT, KEYS, minutes, tableClock, TABLES } from './verify.js';

const DIR = path.join(__dirname, '..', 'data', 'corrections');
const CORRECTIONS_FILE = path.join(DIR, 'sweden.json');
const DIYANET_CORRECTIONS_FILE = path.join(DIR, 'diyanet.json');
const MOROCCO_CORRECTIONS_FILE = path.join(DIR, 'morocco.json');
const ALGERIA_CORRECTIONS_FILE = path.join(DIR, 'algeria.json');
const INDONESIA_CORRECTIONS_FILE = path.join(DIR, 'indonesia.json');
type SwedenCorrections = CorrectionsFile;

const WORLD = process.argv.includes('diyanet');
/** A national authority's own tables (Morocco, Algeria, Indonesia), at its places' points. */
const NATIONAL = (['morocco', 'algeria', 'indonesia'] as const).find(a => process.argv.includes(a));
const MOROCCO = NATIONAL !== undefined;
const FILE =
  NATIONAL === 'morocco' ? MOROCCO_CORRECTIONS_FILE
  : NATIONAL === 'algeria' ? ALGERIA_CORRECTIONS_FILE
  : NATIONAL === 'indonesia' ? INDONESIA_CORRECTIONS_FILE
  : WORLD ? DIYANET_CORRECTIONS_FILE : CORRECTIONS_FILE;
const TZ = 'Europe/Stockholm';
const pts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/places/diyanet-sweden-points.json'), 'utf8')) as Record<string, { name: string; lat: number; lon: number }>;
const read = (f: string) => (fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, 'utf8')) as { days: Record<string, string[]> }).days) : null);

const points: Record<string, Map<string, string>> = {};
let from = '9999-12-31';
let to = '0000-01-01';
let tooFar = 0;
/** point + date already checked from the date's own row: a later copy of it is not consulted */
const ownRow = new Set<string>();

/** Compare one table row with the method (no corrections) on the date it is for; record the minutes. */
function compare(place: Place, date: string, row: string[], asOf: string): void {
  const [y, m, d] = asOf.split('-').map(Number);
  const t = candidateInstants(place, y, m - 1, d, 1, { corrections: false });
  if (!t) return;
  const key = pointKey(place.lat, place.lon);
  if (asOf !== date && ownRow.has(`${key} ${asOf}`)) return;
  if (asOf === date) ownRow.add(`${key} ${asOf}`);
  const list = (points[key] ??= new Map());
  KEYS.forEach((k, i) => {
    const theirs = minutes(row[i + 1]);
    if (!Number.isFinite(theirs)) return;
    let diff = (theirs - tableClock(place, asOf, t[k])) % 1440;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    if (diff === 0) return;
    if (Math.abs(diff) > 1) {
      tooFar++;
      console.warn(`${place.name} ${date} ${k}: ${diff} min — not a rounding difference, left out`);
      return;
    }
    list.set(`${asOf} ${k}`, `${asOf} ${k} ${diff > 0 ? '+1' : '-1'}`);
  });
}

// Morocco, Algeria, Indonesia: the authority's own tables, at its places' points
let diyanetTables = 0;
for (const place of NATIONAL ? placesOf(NATIONAL) : []) {
  const days = read(path.join(TABLES, `${NATIONAL}/v1/cities`, `${place.key}.json`));
  if (!days) continue;
  diyanetTables++;
  for (const [date, row] of Object.entries(days)) {
    compare(place, date, row, date);
    if (date < from) from = date;
    if (date > to) to = date;
  }
}
// Diyanet's own tables, at Diyanet's points (worldwide: the places beyond Sweden)
for (const place of WORLD && !MOROCCO ? placesOf('diyanet') : []) {
  const days = read(path.join(DIYANET_ROOT, 'v1/cities', `${place.key}.json`));
  if (!days) continue;
  diyanetTables++;
  for (const [date, row] of Object.entries(days)) {
    compare(place, date, row, date);
    if (date < from) from = date;
    if (date > to) to = date;
  }
}
for (const [iid, v] of WORLD || MOROCCO ? [] : Object.entries(pts)) {
  const days = read(path.join(DIYANET_ROOT, 'v1/cities', `${iid}.json`));
  if (!days) continue;
  diyanetTables++;
  const place: Place = { authority: 'sweden', id: `sweden:${iid}`, key: iid, name: v.name, country: 'SE', lat: v.lat, lon: v.lon, tz: TZ };
  for (const [date, row] of Object.entries(days)) {
    compare(place, date, row, date);
    if (date < from) from = date;
    if (date > to) to = date;
  }
}
if (!diyanetTables) {
  console.error(`No Diyanet tables under ${DIYANET_ROOT} — set MIHRAB_TABLES (or DIYANET_TABLES). Nothing written.`);
  process.exit(1);
}

// Islamiska Förbundet's towns that are not at a Diyanet point
const diyanetPoints = new Set(Object.values(pts).map(v => pointKey(v.lat, v.lon)));
for (const place of WORLD || MOROCCO ? [] : placesOf('sweden')) {
  if (diyanetPoints.has(pointKey(place.lat, place.lon))) continue;
  const days = read(path.join(TABLES, 'sweden/v1/cities', `${place.key}.json`));
  if (!days) continue;
  const copied = copiedYearsOf(place, days, null);
  // each date's own row first, so a copy of it served a year later is not consulted
  const order = Object.entries(days).sort(([a], [b]) => Number(copied.has(Number(a.slice(0, 4)))) - Number(copied.has(Number(b.slice(0, 4)))));
  for (const [date, row] of order) {
    const y = Number(date.slice(0, 4));
    compare(place, date, row, copied.has(y) ? `${y - 1}${date.slice(4)}` : date);
  }
}

const out: SwedenCorrections = { from, to, points: {} };
let n = 0;
for (const key of Object.keys(points).sort()) {
  const list = [...points[key].values()].sort();
  if (list.length) {
    out.points[key] = list;
    n += list.length;
  }
}
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n');
console.log(`${n} corrections at ${Object.keys(out.points).length} points, ${from} → ${to}${tooFar ? `; ${tooFar} differences of more than a minute left out` : ''}. Written ${path.relative(process.cwd(), FILE)}`);
