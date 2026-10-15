/**
 * Every place each authority publishes a table for, with the point (and,
 * for Morocco, the horizon) its method is computed at — fitted to the
 * authority's own timetables. One shape for all four.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Authority = 'sweden' | 'diyanet' | 'morocco' | 'algeria' | 'indonesia';
export const AUTHORITIES: readonly Authority[] = ['sweden', 'diyanet', 'morocco', 'algeria', 'indonesia'];

export type Place = {
  authority: Authority;
  /** The table file's name under <tables>/<authority>/v1/cities (src/verify.ts's TABLES), without .json. */
  key: string;
  name: string;
  lat: number;
  lon: number;
  /** The zone the authority prints the place's table in. */
  tz: string;
  /** Morocco: the horizon's dip, degrees (fitted, or 0.02°·√height) — eastward, at sunrise. */
  dipDeg?: number;
  /** Morocco: the horizon's dip westward, at Maghrib (fitted per city). */
  dipMaghribDeg?: number;
  /** Indonesia: Kemenag's highland class (sunrise and Maghrib at −2°). */
  highland?: boolean;
  /** Indonesia: the highland degree on Fajr and Isha too (six regencies of Papua). */
  twilightDip?: boolean;
  /** Indonesia: where the ministry computes the regency's Asr, Maghrib and Isha, when not at its point. */
  afternoon?: readonly [number, number];
  /** Diyanet: Isha's depression, 16° or 17° by country. */
  ishaDeg?: number;
  /**
   * Diyanet in Türkiye and Northern Cyprus: each prayer is computed at a point
   * of its own, and the points move by a few thousandths of a degree from one
   * year's tables to the next — year → [fajr, sunrise, dhuhr, asr, maghrib, isha]
   * as [lat, lon]. `lat`/`lon` are the district's own point (its sunrise).
   */
  prayerPoints?: Record<string, [number, number][]>;
  /**
   * A table printed on a clock no zone keeps (Diyanet's for Alberta, with
   * summer time into December; for Acámbaro, with summer time in 2025 only):
   * the clock read off the table itself, [from date, minutes east of UTC], in
   * place of `tz`. The instants are the method's; only the labels differ.
   */
  clock?: [string, number][];
};

const ROOT = path.join(__dirname, '..');
const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places', f), 'utf8')) as T;

/** Islamiska Förbundet's file names for its cities (the places' keys). */
export function citySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[å]/g, 'a')
    .replace(/[ä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[ø]/g, 'o')
    .replace(/[é]/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Indonesia prints each regency in its own zone; the province says which. */
const WITA = new Set([
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Bali',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Sulawesi Barat', 'Sulawesi Selatan',
  'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Gorontalo',
]);
const WIT = new Set(['Maluku', 'Maluku Utara', 'Papua', 'Papua Barat']);
export function indonesiaZone(province: string): string {
  if (WIT.has(province)) return 'Asia/Jayapura';
  if (WITA.has(province)) return 'Asia/Makassar';
  return 'Asia/Jakarta';
}

/**
 * Morocco left GMT+1 for GMT on 2026-09-20 for good; the tz databases still
 * move its clock, so the zone is pinned rather than named.
 */
const MOROCCO_TZ = 'Etc/GMT';
/** The ministry's clock: GMT+1, then GMT — its tables print GMT from 17 September 2026, three days before the clocks moved. */
const MOROCCO_CLOCK: [string, number][] = [['2020-01-01', 60], ['2026-09-17', 0]];
const MOROCCO_DIP_PER_SQRT_M = 0.02;

export function placesOf(authority: Authority): Place[] {
  switch (authority) {
    case 'sweden': {
      // Islamiska Förbundet's cities, at the points Diyanet computes them.
      const coords = read<Record<string, { lat: number; lng: number }>>('islamiskaForbundetCoords.json');
      return Object.entries(coords).map(([name, c]) => ({ authority, key: citySlug(name), name, lat: c.lat, lon: c.lng, tz: 'Europe/Stockholm' }));
    }
    case 'diyanet': {
      // Diyanet's places beyond Sweden and Türkiye, at the points it computes them, with the
      // zone each table is printed in and Isha's angle for its country.
      const pts = read<Record<string, { name: string; country: string; tz: string; ishaDeg: number; lat: number; lon: number; clock?: [string, number][] }>>('diyanetWorldPoints.json');
      const world: Place[] = Object.entries(pts).map(([iid, v]) => ({ authority, key: iid, name: v.name, lat: v.lat, lon: v.lon, tz: v.tz, ishaDeg: v.ishaDeg, ...(v.clock ? { clock: v.clock } : {}) }));
      // Türkiye's districts (and Northern Cyprus's), with a point per prayer per year
      const tr = fs.existsSync(path.join(ROOT, 'data/places', 'diyanetTurkeyPoints.json'))
        ? read<Record<string, { name: string; country: string; years: Record<string, [number, number][]> }>>('diyanetTurkeyPoints.json')
        : {};
      for (const [iid, v] of Object.entries(tr)) {
        const base = v.years['2026'] ?? Object.values(v.years)[0];
        world.push({ authority, key: iid, name: v.name, lat: base[1][0], lon: base[1][1], tz: v.country === '1' ? 'Asia/Nicosia' : 'Europe/Istanbul', ishaDeg: 17, prayerPoints: v.years });
      }
      return world;
    }
    case 'morocco': {
      const points = read<Record<string, number[]>>('moroccoMethodPoints.json');
      return read<{ id: number; name: string; lat: number | null; lng: number | null; heightM?: number }[]>('moroccoCities.json')
        .filter(c => typeof c.lat === 'number' && typeof c.lng === 'number')
        .map(c => {
          const p = points[String(c.id)];
          return p
            ? { authority, key: String(c.id), name: c.name, lat: p[0], lon: p[1], tz: MOROCCO_TZ, clock: MOROCCO_CLOCK, dipDeg: p[2], ...(p.length > 3 ? { dipMaghribDeg: p[3] } : {}) }
            : { authority, key: String(c.id), name: c.name, lat: c.lat as number, lon: c.lng as number, tz: MOROCCO_TZ, clock: MOROCCO_CLOCK, dipDeg: MOROCCO_DIP_PER_SQRT_M * Math.sqrt(c.heightM ?? 0) };
        });
    }
    case 'algeria': {
      const points = read<Record<string, [number, number]>>('algeriaMethodPoints.json');
      return read<{ id: number; name: string; nameEn?: string; lat: number; lon: number }[]>('algeriaCities.json').map(c => ({
        authority,
        key: String(c.id),
        name: c.nameEn ?? c.name,
        lat: points[String(c.id)]?.[0] ?? c.lat,
        lon: points[String(c.id)]?.[1] ?? c.lon,
        tz: 'Africa/Algiers',
      }));
    }
    case 'indonesia': {
      const points = read<Record<string, number[]>>('kemenagMethodPoints.json');
      return read<{ id: number; name: string; nameEn?: string; lat: number; lon: number }[]>('kemenagPlaces.json').map(c => {
        const province = /\(([^)]*)\)\s*$/.exec(c.nameEn ?? '')?.[1] ?? '';
        const p = points[String(c.id)];
        return {
          authority,
          key: String(c.id),
          name: c.nameEn ?? c.name,
          lat: p?.[0] ?? c.lat,
          lon: p?.[1] ?? c.lon,
          tz: indonesiaZone(province),
          highland: p ? (p[2] & 1) !== 0 : false,
          twilightDip: p ? (p[2] & 2) !== 0 : false,
          ...(p && p.length >= 5 ? { afternoon: [p[3], p[4]] as const } : {}),
        };
      });
    }
  }
}
