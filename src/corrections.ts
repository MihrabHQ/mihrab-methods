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
 * Needs the reference timetables (MIHRAB_TABLES); refuses to write without them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { candidateTimes, placesOf, type Place } from './index';
import { clockIn, copiedYearsOf, DIYANET_ROOT, KEYS, minutes, TABLES } from './verify';
import { CORRECTIONS_FILE, pointKey, type SwedenCorrections } from './methods/swedenCorrections';

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
  const t = candidateTimes(place, y, m - 1, d, 1, { corrections: false });
  if (!t) return;
  const key = pointKey(place.lat, place.lon);
  if (asOf !== date && ownRow.has(`${key} ${asOf}`)) return;
  if (asOf === date) ownRow.add(`${key} ${asOf}`);
  const list = (points[key] ??= new Map());
  KEYS.forEach((k, i) => {
    const theirs = minutes(row[i + 1]);
    if (!Number.isFinite(theirs)) return;
    let diff = (theirs - clockIn(TZ, t[k])) % 1440;
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

// Diyanet's own tables, at Diyanet's points
let diyanetTables = 0;
for (const [iid, v] of Object.entries(pts)) {
  const days = read(path.join(DIYANET_ROOT, 'v1/cities', `${iid}.json`));
  if (!days) continue;
  diyanetTables++;
  const place: Place = { authority: 'sweden', key: iid, name: v.name, lat: v.lat, lon: v.lon, tz: TZ };
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
for (const place of placesOf('sweden')) {
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
fs.mkdirSync(path.dirname(CORRECTIONS_FILE), { recursive: true });
fs.writeFileSync(CORRECTIONS_FILE, JSON.stringify(out, null, 1) + '\n');
console.log(`${n} corrections at ${Object.keys(out.points).length} points, ${from} → ${to}${tooFar ? `; ${tooFar} differences of more than a minute left out` : ''}. Written ${path.relative(process.cwd(), CORRECTIONS_FILE)}`);
