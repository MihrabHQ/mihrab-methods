/**
 * mihrab-methods/locate — which authority a point belongs to.
 *
 * `countryAt(lat, lon)` answers the country at a point among those with a
 * method here and their neighbours, from Natural Earth's 1:10m outlines
 * (public domain) simplified to a few hundred metres — so a border town, a
 * strait or a split island is answered by the side it is on (Haparanda and
 * Tornio, two kilometres apart; Ceuta on Morocco's coast; Sebatik, split
 * between Indonesia and Malaysia). `defaultAuthorityFor(lat, lon)` turns
 * that into the authority whose table the point's community prays by, or
 * null where none of the five applies.
 *
 * Its own entry point because the outlines are 470 KB an app that already
 * knows its country does not need.
 */
import outlines from './data/generated/countryOutlines.js';
import { isLoaded } from './core/registry.js';
import { nearestPlace } from './core/api.js';
import type { Authority } from './core/types.js';

/** Offshore, or a coast the outline cut: the nearest country this close. */
export const COASTAL_REACH_KM = 25;

type Ring = { xs: Float64Array; ys: Float64Array; minX: number; minY: number; maxX: number; maxY: number };
type Poly = { outer: Ring; holes: Ring[] };
type Country = { code: string; polys: Poly[]; minX: number; minY: number; maxX: number; maxY: number };

function ring(flat: number[], scale: number): Ring {
  const n = flat.length / 2;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = flat[2 * i] / scale;
    const y = flat[2 * i + 1] / scale;
    xs[i] = x;
    ys[i] = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { xs, ys, minX, minY, maxX, maxY };
}

let countries: Country[] | null = null;
function load(): Country[] {
  if (countries) return countries;
  return (countries = Object.entries(outlines.countries).map(([code, polys]) => {
    const ps = polys.map(rings => ({ outer: ring(rings[0], outlines.scale), holes: rings.slice(1).map(r => ring(r, outlines.scale)) }));
    return {
      code,
      polys: ps,
      minX: Math.min(...ps.map(p => p.outer.minX)),
      minY: Math.min(...ps.map(p => p.outer.minY)),
      maxX: Math.max(...ps.map(p => p.outer.maxX)),
      maxY: Math.max(...ps.map(p => p.outer.maxY)),
    };
  }));
}

function inRing(r: Ring, x: number, y: number): boolean {
  if (x < r.minX || x > r.maxX || y < r.minY || y > r.maxY) return false;
  let hit = false;
  const { xs, ys } = r;
  for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
    if (ys[i] > y !== ys[j] > y && x < ((xs[j] - xs[i]) * (y - ys[i])) / (ys[j] - ys[i]) + xs[i]) hit = !hit;
  }
  return hit;
}

/** Distance (km) from a point to a ring's edge, on a local flat projection. */
function edgeKm(r: Ring, x: number, y: number): number {
  const kx = 111.32 * Math.cos((y * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  const { xs, ys } = r;
  for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
    const ax = (xs[j] - x) * kx, ay = (ys[j] - y) * ky;
    const bx = (xs[i] - x) * kx, by = (ys[i] - y) * ky;
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const px = ax + t * dx, py = ay + t * dy;
    const d = px * px + py * py;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * Where the 1:10m outline itself is wrong by more than a town, or a town is
 * closer to a border than the outlines can tell: [lat, lon, radius km,
 * country]. Its Torne runs half a kilometre east of the real one, so Tornio
 * was Swedish; its fell border puts Riksgränsen, the Swedish station, in
 * Norway; and it has no Kastellorizo, two kilometres off Kaş.
 */
const FIXES: readonly (readonly [number, number, number, string])[] = [
  [65.85, 24.17, 1.3, 'FI'], // Tornio's centre (Haparanda is across the river, 2 km west)
  [68.4256, 18.1265, 1.5, 'SE'], // Riksgränsen
  [36.1497, 29.5947, 3, 'GR'], // Kastellorizo
  [59.3797, 28.1791, 1, 'EE'], // Narva (Ivangorod, Russia, across the river)
  [38.4562, 48.875, 1.2, 'AZ'], // Astara (Astara, Iran, across the river)
  [29.5577, 34.9519, 2, 'IL'], // Eilat (Aqaba 5 km east, Taba 7 km south)
];

function fixAt(latitude: number, longitude: number): string | null {
  for (const [lat, lon, km, code] of FIXES) {
    const dy = (latitude - lat) * 110.57;
    const dx = (longitude - lon) * 111.32 * Math.cos((lat * Math.PI) / 180);
    if (dx * dx + dy * dy <= km * km) return code;
  }
  return null;
}

function nearestWithin(all: Country[], x: number, y: number, reachKm: number): string | null {
  const reachY = reachKm / 110;
  const reachX = reachKm / (111.32 * Math.max(0.05, Math.cos((y * Math.PI) / 180)));
  let best = reachKm;
  let code: string | null = null;
  for (const c of all) {
    if (x < c.minX - reachX || x > c.maxX + reachX || y < c.minY - reachY || y > c.maxY + reachY) continue;
    for (const p of c.polys) {
      const r = p.outer;
      if (x < r.minX - reachX || x > r.maxX + reachX || y < r.minY - reachY || y > r.maxY + reachY) continue;
      const d = edgeKm(r, x, y);
      if (d < best) {
        best = d;
        code = c.code;
      }
    }
  }
  return code;
}

/**
 * The country at a point (ISO 3166-1 alpha-2), among those with a method
 * here and their neighbours; null elsewhere. Western Sahara answers 'MA' and
 * Northern Cyprus 'TR', with the authorities that serve them. A point on no
 * land — offshore, or on a coast the simplification shaved — is given to
 * the nearest country within 25 km.
 */
export function countryAt(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const fixed = fixAt(latitude, longitude);
  if (fixed) return fixed;
  const x = longitude, y = latitude;
  const all = load();
  for (const c of all) {
    if (x < c.minX || x > c.maxX || y < c.minY || y > c.maxY) continue;
    if (c.polys.some(p => inRing(p.outer, x, y) && !p.holes.some(h => inRing(h, x, y)))) return c.code;
  }
  return nearestWithin(all, x, y, COASTAL_REACH_KM);
}

/** Ceuta and Melilla, which the ministry publishes, are covered to their edges. */
const EXCLAVE_KM = 8;
/** A listed Moroccan town the outline's border runs through (Ahfir, Lagouira). */
const LISTED_TOWN_KM = 5;

/**
 * The authority whose table a point's community prays by: Sweden's inside
 * Sweden, Morocco's in Morocco (with Western Sahara, and Ceuta and Melilla,
 * which the ministry lists — when `mihrab-methods/morocco` is loaded, so
 * its cities can be consulted), Algeria's, Indonesia's, and Diyanet's in
 * Türkiye and Northern Cyprus. Null elsewhere: Diyanet publishes tables
 * for places in 197 other countries, but it is not those countries' own
 * authority, so an app offers it there as a choice, not as the default.
 */
export function defaultAuthorityFor(latitude: number, longitude: number): Authority | null {
  const code = countryAt(latitude, longitude);
  switch (code) {
    case 'SE':
      return 'sweden';
    case 'MA':
      return 'morocco';
    case 'DZ':
      return 'algeria';
    case 'ID':
      return 'indonesia';
    case 'TR':
      return 'diyanet';
    case 'ES':
    case 'MR': {
      if (!isLoaded('morocco')) return null;
      const near = nearestPlace('morocco', latitude, longitude);
      if (!near) return null;
      const within = near.distanceKm <= (code === 'ES' ? EXCLAVE_KM : LISTED_TOWN_KM);
      // Spain's cities the ministry lists are its two on the African coast.
      return within && (code !== 'ES' || latitude < 35.95) ? 'morocco' : null;
    }
    default:
      return null;
  }
}
