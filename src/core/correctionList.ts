/**
 * A correction list, indexed for lookup: point → date → the minutes to add
 * to each printed time. Built from the embedded data (or, for the tools,
 * from a file read into the same shape).
 */
import type { CorrectionsFile, PrayerKey } from './types.js';

export const pointKey = (lat: number, lon: number): string => `${lat.toFixed(3)},${lon.toFixed(3)}`;

export class CorrectionList {
  private index: Map<string, Map<string, Partial<Record<PrayerKey, number>>>> | null = null;
  constructor(private source: CorrectionsFile) {}

  private load(): Map<string, Map<string, Partial<Record<PrayerKey, number>>>> {
    if (this.index) return this.index;
    const index = new Map<string, Map<string, Partial<Record<PrayerKey, number>>>>();
    for (const [point, list] of Object.entries(this.source.points)) {
      const byDate = new Map<string, Partial<Record<PrayerKey, number>>>();
      for (const e of list) {
        const [date, key, step] = e.split(' ');
        const c = byDate.get(date) ?? {};
        c[key as PrayerKey] = Number(step);
        byDate.set(date, c);
      }
      index.set(point, byDate);
    }
    return (this.index = index);
  }

  /** The minutes to add to the point's printed times on a date (month 0-based), if any. */
  correction(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.load().get(pointKey(lat, lon))?.get(date);
  }

  coverage(): { from: string; to: string } {
    return { from: this.source.from, to: this.source.to };
  }

  entries(): number {
    return Object.values(this.source.points).reduce((n, e) => n + e.length, 0);
  }

  file(): CorrectionsFile {
    return this.source;
  }

  /** Put another list in force (a newer one for the same method revision). */
  replace(source: CorrectionsFile): void {
    this.source = source;
    this.index = null;
  }
}

/** A list that does not have the shape of one is refused whole. */
export function isCorrectionsFile(x: unknown): x is CorrectionsFile {
  if (!x || typeof x !== 'object') return false;
  const c = x as CorrectionsFile;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof c.from !== 'string' || typeof c.to !== 'string' || !date.test(c.from) || !date.test(c.to) || c.from > c.to) return false;
  if (!c.points || typeof c.points !== 'object') return false;
  const entry = /^\d{4}-\d{2}-\d{2} (fajr|sunrise|dhuhr|asr|maghrib|isha) [+-]1$/;
  return Object.entries(c.points).every(
    ([k, v]) => /^-?\d+\.\d{3},-?\d+\.\d{3}$/.test(k) && Array.isArray(v) && v.every(e => typeof e === 'string' && entry.test(e)),
  );
}
