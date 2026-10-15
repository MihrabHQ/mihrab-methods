/**
 * The Congress method's last minutes for Sweden: the few times (about one in
 * five thousand) that Diyanet's program puts on the other side of a minute's
 * rounding point — a hundredth of a second away, from its own arithmetic, not
 * from the method. Each entry moves one printed time of one point on one date
 * by a minute. `npm run corrections` writes the list from the tables
 * (data/corrections/sweden.json); it covers the years the tables do.
 */
import fs from 'node:fs';
import path from 'node:path';

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type SwedenCorrections = {
  /** First and last date the list was made over. */
  from: string;
  to: string;
  /** "lat,lon" (three decimals) → "YYYY-MM-DD prayer ±1" */
  points: Record<string, string[]>;
};

export const CORRECTIONS_FILE = path.join(__dirname, '..', '..', 'data', 'corrections', 'sweden.json');

let index: Map<string, Map<string, Partial<Record<PrayerKey, number>>>> | null = null;
let meta: SwedenCorrections | null = null;

export const pointKey = (lat: number, lon: number): string => `${lat.toFixed(3)},${lon.toFixed(3)}`;

function load(): void {
  if (index) return;
  index = new Map();
  try {
    meta = JSON.parse(fs.readFileSync(CORRECTIONS_FILE, 'utf8')) as SwedenCorrections;
  } catch {
    meta = null;
    return;
  }
  for (const [point, list] of Object.entries(meta.points)) {
    const byDate = new Map<string, Partial<Record<PrayerKey, number>>>();
    for (const e of list) {
      const [date, key, step] = e.split(' ');
      const c = byDate.get(date) ?? {};
      c[key as PrayerKey] = Number(step);
      byDate.set(date, c);
    }
    index.set(point, byDate);
  }
}

/** The minutes to add to the point's printed times on a date (month 0-based), if any. */
export function swedenCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  load();
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return index!.get(pointKey(lat, lon))?.get(date);
}

export function swedenCorrectionsCoverage(): { from: string; to: string } | null {
  load();
  return meta ? { from: meta.from, to: meta.to } : null;
}

/** Tests and the generator: read the file again. */
export function _reloadSwedenCorrections(): void {
  index = null;
  meta = null;
}
