/**
 * A method's correction list: the few times its authority's program puts on
 * the other side of a minute's rounding point — a fraction of a second away,
 * from its own arithmetic, not from the method. Each entry moves one printed
 * time of one point on one date by a minute. `npm run corrections` writes the
 * lists from the tables (data/corrections/<authority>.json); each covers the
 * years the tables do.
 */
import fs from 'node:fs';

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type CorrectionsFile = {
  /** First and last date the list was made over. */
  from: string;
  to: string;
  /** "lat,lon" (three decimals) → "YYYY-MM-DD prayer ±1" */
  points: Record<string, string[]>;
};

export const pointKey = (lat: number, lon: number): string => `${lat.toFixed(3)},${lon.toFixed(3)}`;

export class CorrectionList {
  private index: Map<string, Map<string, Partial<Record<PrayerKey, number>>>> | null = null;
  private meta: CorrectionsFile | null = null;
  constructor(readonly file: string) {}

  private load(): void {
    if (this.index) return;
    this.index = new Map();
    try {
      this.meta = JSON.parse(fs.readFileSync(this.file, 'utf8')) as CorrectionsFile;
    } catch {
      this.meta = null;
      return;
    }
    for (const [point, list] of Object.entries(this.meta.points)) {
      const byDate = new Map<string, Partial<Record<PrayerKey, number>>>();
      for (const e of list) {
        const [date, key, step] = e.split(' ');
        const c = byDate.get(date) ?? {};
        c[key as PrayerKey] = Number(step);
        byDate.set(date, c);
      }
      this.index.set(point, byDate);
    }
  }

  /** The minutes to add to the point's printed times on a date (month 0-based), if any. */
  correction(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
    this.load();
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.index!.get(pointKey(lat, lon))?.get(date);
  }

  coverage(): { from: string; to: string } | null {
    this.load();
    return this.meta ? { from: this.meta.from, to: this.meta.to } : null;
  }

  /** Tests and the generator: read the file again. */
  reload(): void {
    this.index = null;
    this.meta = null;
  }
}
